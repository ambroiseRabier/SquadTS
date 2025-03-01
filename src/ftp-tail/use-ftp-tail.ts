import { Logger } from 'pino';
import { Subject } from 'rxjs';
import { Client } from 'basic-ftp';
import SFTPClient from 'ssh2-sftp-client';

import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';
import { retryWithExponentialBackoff } from './retry-with-eponential-backoff';
import { TMP_DIR } from '../config/path-constants.mjs';
import { promiseWithTimeout } from '../utils';
import { Readable } from 'node:stream';

type Props = {
  timeout?: number;

  // config folder of squad on server
  configDir: string;

  // file to tail on server
  filepath: string;
  // Fetch interval in milliseconds, 1sec (1000ms) is probably the lowest you should go
  fetchIntervalMs: number;
  // Number of bytes to tail, probably shouldn't go lower than 10000
  tailLastBytes: number;
} & (
  | {
      protocol: 'ftp';
      ftp: NonNullable<Parameters<Client['access']>[0]>;
    }
  | {
      protocol: 'sftp';
      sftp: Parameters<SFTPClient['connect']>[0];
    }
);

function useClient(options: Props) {
  let ftpClient: Client;
  // quick fix for lib typing being incorrect.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sftpClient: SFTPClient & { sftp: any };

  const sftpValidPath = (filePath: string) => filePath.replaceAll('\\', '/');

  return {
    /**
     * Good for small files, do not use for big files.
     * @param filepath
     */
    async readFile(filepath: string) {
      const localTempFile = path.join(TMP_DIR, path.basename(filepath));

      if (options.protocol === 'ftp') {
        try {
          // Ensure the directory exists
          await fs.promises.mkdir(TMP_DIR, { recursive: true });

          // Download the remote file to a temporary local file
          await ftpClient.downloadTo(localTempFile, filepath);
          return await fs.promises.readFile(localTempFile, 'utf8');
        } catch (err) {
          console.error(`Error fetching file "${filepath}":`, err);
          throw err;
        } finally {
          // Clean up: Delete the temp file
          try {
            await fs.promises.unlink(localTempFile);
          } catch (cleanupErr) {
            console.warn('Could not delete temp file:', cleanupErr);
          }
        }
      } else {
        // sftp
        try {
          // Download the remote file to a temporary local file
          await sftpClient.fastGet(sftpValidPath(filepath), localTempFile);
          return await fs.promises.readFile(localTempFile, 'utf8');
        } catch (err) {
          console.error('Error fetching SFTP file:', err);
          throw err;
        } finally {
          // Cleanup: Delete the temporary file
          try {
            await fs.promises.unlink(localTempFile);
          } catch (cleanupErr) {
            console.warn('Could not delete temp file:', cleanupErr);
          }
        }
      }
    },
    async writeFile(filepath: string, content: string) {
      if (options.protocol === 'sftp') {
        await sftpClient.put(Buffer.from(content), filepath);
      } else {
        // For basic-ftp, create a readable stream from the content
        const stream = Readable.from(content);
        await ftpClient.uploadFrom(stream, filepath);
      }
    },
    async connect() {
      return options.protocol === 'ftp'
        ? ftpClient.access(options.ftp)
        : sftpClient.connect(options.sftp);
    },
    async disconnect() {
      if (options.protocol === 'ftp') {
        ftpClient.close();
      } else {
        await sftpClient.end();
      }
    },
    fileSize(filepath: string): Promise<number> {
      return options.protocol === 'ftp'
        ? ftpClient.size(filepath)
        : // I am supposed to fix absence of typing of sftp.stat myself ? any is fine.
          sftpClient.stat(sftpValidPath(filepath)).then(data => data.size);
    },
    async downloadFile(filepath: string, toLocalPath: string, lastByteReceived: number) {
      if (options.protocol === 'ftp') {
        await ftpClient.downloadTo(
          // Do not use a file path, as offset is also applied to file path. Our file will not be of the same size as the
          // one on the server !
          fs.createWriteStream(toLocalPath, { flags: 'w' }),
          filepath,
          lastByteReceived
        );
      } else {
        await sftpClient.get(sftpValidPath(filepath), toLocalPath, {
          readStreamOptions: {
            // @ts-expect-error Typing is not up to date here, this is valid: https://github.com/theophilusx/ssh2-sftp-client/blob/eda4510f8814c45fb500517dd0dc4d20519b7852/src/index.js#L501
            start: lastByteReceived,
          },
        });
      }
    },
    init(logger: Logger) {
      if (options.protocol === 'ftp') {
        ftpClient = new Client(options.timeout);
        ftpClient.ftp.log = logger.trace.bind(logger);
      } else {
        // We slightly corrected SFTPClient type so we need to cast.
        sftpClient = new SFTPClient() as typeof sftpClient;
        options.sftp.debug = logger.trace.bind(logger);
      }
    },
    isConnected() {
      return options.protocol === 'ftp' ? !ftpClient.closed : !!sftpClient.sftp;
    },
  };
}

export function useFtpTail(logger: Logger, options: Props) {
  const line$ = new Subject<string>();
  const client = useClient(options);
  let stopSignal = false;
  let lastByteReceived: number | null = null;
  let currentFetchPromise: Promise<void> | null = null;

  client.init(logger);

  const ftpOptions = {
    host: options.protocol === 'ftp' ? options.ftp.host : options.sftp.host,
    port: options.protocol === 'ftp' ? options.ftp.port : options.sftp.port,

    // FTP and SFTP have a slight difference in field:
    user: options.protocol === 'ftp' ? options.ftp.user : options.sftp.username,
    username: options.protocol === 'ftp' ? options.ftp.user : options.sftp.username,
  };

  const tmpFilePath = path.join(
    TMP_DIR, // Use fixed dir instead of relative to process.pwd()
    // Dunno why SquadJS used a hash here.
    crypto
      .createHash('md5')
      .update(`${ftpOptions.host}:${ftpOptions.port}:${options.filepath}`)
      .digest('hex') + '.tmp'
  );

  // Todo: options to delete or keep it ?
  // Deleting may remove useful logs for debug.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function removeTempFile() {
    if (fs.existsSync(tmpFilePath)) {
      fs.unlinkSync(tmpFilePath);
      logger.info('Deleted temp file.');
    }
  }

  async function connect() {
    if (client.isConnected()) {
      return;
    }

    logger.info('Connecting to FTP server...');

    await client.connect();
    logger.info('Connected to FTP server.');
  }

  function processFile() {
    return new Promise<void>((resolve, reject) => {
      // Read the data from the temporary file.
      const fileStream = createReadStream(tmpFilePath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: fileStream });
      const randomChar = Math.random().toString(36).substring(2, 15);

      rl.on('line', line => {
        // All logs, with a random id to identify the fileStream/rl.
        // If you get duplicated logs, this helps identify the issue.
        logger.trace(randomChar + ' -- ' + line);
        line$.next(line);
      });

      rl.on('close', () => {
        fileStream.close();
        resolve();
      });

      rl.on('error', error => {
        rl.close();
        fileStream.close();
        reject(error);
      });

      // Handle file stream errors separately
      fileStream.on('error', error => {
        rl.close();
        fileStream.close();
        reject(error);
      });

      // /!\ No code after that line, let readline callback finish.
    });
  }

  async function fetchFile(): Promise<boolean> {
    const fileSize = await client.fileSize(options.filepath);

    // SquadTS just launched
    if (lastByteReceived === null) {
      // Do not substract lastbytes. In case of repeating start and stop, with low log downloading interval,
      // we could act twice on the same log. Also, we may act initially on very old logs. It makes no sense sending warning/kick
      // on something that happened 5min, 1min, ago. Duration depends on how much action is happening in-game.
      // lastByteReceived = Math.max(0, fileSize - options.tailLastBytes);
      lastByteReceived = fileSize;
    }

    // Skip fetching data if the file size hasn't changed.
    if (fileSize === lastByteReceived) {
      logger.debug('File has not changed.');
      return false;
    }

    await fs.promises.mkdir(TMP_DIR, { recursive: true });

    // Download the file to the temporary file.
    logger.debug(`Downloading file with offset ${lastByteReceived}...`);
    await client.downloadFile(options.filepath, tmpFilePath, lastByteReceived);

    // Update the last byte marker.
    const downloadSize = fs.statSync(tmpFilePath).size;
    lastByteReceived += downloadSize;
    logger.debug(`Downloaded file of size ${downloadSize}.`);

    return true;
  }

  async function fetchLoop() {
    logger.debug('Connecting or reconnecting to FTP server...');
    await retryWithExponentialBackoff(
      connect,
      12,
      logger,
      () => stopSignal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => error?.message.toLowerCase().includes('timeout')
    );
    logger.debug('Downloading file...');
    const hasDownloaded = await retryWithExponentialBackoff(
      fetchFile,
      12,
      logger,
      () => stopSignal,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error: any) => error?.message.toLowerCase().includes('timeout')
    );
    // Don't process the file again if it hasn't changed, or you get duplicated logs.
    if (hasDownloaded) {
      logger.debug('Processing file...');
      await processFile();
    }
  }

  let isFetchLoopActive = false; // Ensures no concurrent fetch loops

  /**
   * Call fetchLoop immediately if it takes more than options.fetchIntervalMs,
   * if faster than options.fetchIntervalMs, it wait the remaining time before recalling.
   * It never call fetchLoop concurrently.
   */
  async function executeFetchLoop() {
    if (isFetchLoopActive || stopSignal) {
      return; // Skip if already active or stop signal
    }

    isFetchLoopActive = true;

    let hasError = false;

    try {
      const startTime = performance.now();

      // Execute fetch loop logic
      await fetchLoop();

      const executionTime = performance.now() - startTime;

      logger.debug(`Fetch loop took ${executionTime}ms.`);

      if (executionTime > options.fetchIntervalMs) {
        logger.info(
          `Fetch loop took ${executionTime}ms, which is longer than the requested interval of ${options.fetchIntervalMs}ms.` +
            'This is fine, but reaction time of plugins will be slower than requested.'
        );
      }

      // If fetchLoop took less time than the interval, wait the remaining time
      const delay = Math.max(0, options.fetchIntervalMs - executionTime);
      // Check the stop signal before waiting.
      if (!stopSignal && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (e) {
      logger.fatal(`Error in fetch loop: ${(e as Error)?.message}`, (e as Error)?.stack);
      hasError = true;
      // Stop looping at unhandled error. main.mts will handle the cleanup on unhandled errors.
      throw e;
    } finally {
      isFetchLoopActive = false; // Unlock once the loop is finished

      // When no error and no stop signal
      if (!hasError && !stopSignal) {
        // Do not await here
        // noinspection ES6MissingAwait
        currentFetchPromise = executeFetchLoop(); // Schedule the next iteration independently
      }
    }
  }

  // Note: this is not designed to be recalled after unwatch.
  async function watch() {
    // Note: RXJS is not the most fit for the behavior we want. (unless you can find an elegant solution?)
    logger.info('Watching FTP server...');
    currentFetchPromise = executeFetchLoop();
  }

  let isUnwatching = false;

  // Let main.mts call unwatch in case of error of SIGINT, SIGTERM, do not call from this file.
  async function unwatch() {
    if (isUnwatching) {
      throw new Error('Unwatch already in progress');
    } else {
      isUnwatching = true;
    }

    logger.info('Cleanup initiated.');
    stopSignal = true;
    // It may be useful to keep the file for debug
    // await removeTempFile();

    // Ideally, we want to abort the current operation, but this is more complex and not really supported by
    // our ftp/sftp libs. Instead, we just wait for the promise to resolve.
    // It should not take long since we are downloading logs often.
    try {
      // In case the promise is still running, we await it.
      // This case happens when SIGINT or SIGTERM is called.
      if (currentFetchPromise) {
        logger.debug('Waiting for current fetch loop to finish.');
        await promiseWithTimeout(
          currentFetchPromise,
          1000,
          'currentFetchPromise was forcibly stopped.'
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      logger.error(`Error while waiting for currentFetchPromise to resolve: ${e?.message}`, e);
    } finally {
      await client.disconnect();
      logger.debug('FTP tail disconnected');
    }
  }

  return {
    readFile: client.readFile,
    writeFile: client.writeFile,
    connect: async () => {
      const address =
        (options.protocol === 'ftp' ? options.ftp.host : options.sftp.host) +
        ':' +
        (options.protocol === 'ftp' ? options.ftp.port : options.sftp.port);

      logger.info(`Connecting to ${options.protocol.toUpperCase()} ${address}...`);
      await client.connect();
      logger.info(`Connected to ${options.protocol.toUpperCase()} ${address}`);
    },
    line$,
    watch,
    unwatch,
  };
}
