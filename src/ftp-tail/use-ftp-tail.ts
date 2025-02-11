import { Logger } from 'pino';
import { interval, Subject, takeUntil } from 'rxjs';
import { Client } from 'basic-ftp';
import SFTPClient from 'ssh2-sftp-client';

import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import readline from 'node:readline';
import { createReadStream } from 'node:fs';
import { retryWithExponentialBackoff } from './retry-with-eponential-backoff';


type Props = {
  timeout?: number;

  // file to tail on server
  filepath: string;
  // Fetch interval in milliseconds, 1sec (1000ms) is probably the lowest you should go
  fetchIntervalMs: number;
  // Number of bytes to tail, probably shouldn't go lower than 10000
  tailLastBytes: number;
} & ({
    protocol: 'ftp';
    ftp: NonNullable<Parameters<Client['access']>[0]>;
  } | {
    protocol: 'sftp';
    sftp: Parameters<SFTPClient['connect']>[0];
  })

function useClient(options: Props) {
  const client = new Client(options.timeout);
  // quick fix for lib typing being incorrect.
  const sftpClient: SFTPClient & {sftp: any} = new SFTPClient() as any;

  return {
    async connect() {
      return options.protocol === 'ftp' ? client.access(options.ftp) : sftpClient.connect(options.sftp);
    },
    async disconnect() {
      if (options.protocol === 'ftp') {
        client.close();
      } else {
        await sftpClient.end();
      }
    },
    fileSize(filepath: string): Promise<number> {
      return options.protocol === 'ftp' ? client.size(filepath) : sftpClient.sftp.stat(filepath).then((stat: any) => stat.size);
    },
    async downloadFile(filepath: string, toLocalPath: string, lastByteReceived: number) {
      if (options.protocol === 'ftp') {
        await client.downloadTo(
          fs.createWriteStream(toLocalPath, { flags: 'w' }),
          filepath,
          lastByteReceived
        );
      } else {
       await sftpClient.get(filepath, toLocalPath, {
          readStreamOptions: {
            // Typing is not up to date here, this is valid:
            // https://github.com/theophilusx/ssh2-sftp-client/blob/eda4510f8814c45fb500517dd0dc4d20519b7852/src/index.js#L501
            // @ts-ignore
            start: lastByteReceived,
          },
        })
      }
    },
    setLog(logger: Logger) {
      if (options.protocol === 'ftp') {
        client.ftp.log = logger.debug.bind(logger);
      } else {
        options.sftp.debug = logger.debug.bind(logger);
      }
    },
    isConnected() {
      return options.protocol === 'ftp' ? !client.closed : !!sftpClient.sftp;
    }
  }
}

export function useFtpTail(logger: Logger, options: Props) {
  const line$ = new Subject<string>();
  const client = useClient(options);
  let stopSignal = false;
  let lastByteReceived: number | null = null;
  let currentFetchPromise: Promise<void> | null = null;

  client.setLog(logger)

  const ftpOptions = {
    host: options.protocol === 'ftp' ? options.ftp.host : options.sftp.host,
    port: options.protocol === 'ftp' ? options.ftp.port : options.sftp.port,

    // FTP and SFTP have a slight difference in field:
    user: options.protocol === 'ftp' ? options.ftp.user : options.sftp.username,
    username: options.protocol === 'ftp' ? options.ftp.user : options.sftp.username,
  };

  const tmpFilePath = path.join(
    process.cwd(),
    crypto
      .createHash('md5')
      .update(`${ftpOptions.host}:${ftpOptions.port}:${options.filepath}`)
      .digest('hex') + '.tmp'
  );


  // Deleting may remove useful logs for debug.
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

      rl.on('line', (line) => {
        line$.next(line);
      });

      rl.on('close', () => {
        resolve();
      });

      rl.on('error', (error) => {
        reject(error);
      });

      // /!\ No code after that line, let readline callback finish.
    });
  }

  async function fetchFile() {
    const fileSize = await client.fileSize(options.filepath);

    // SquadTS just launched
    if (lastByteReceived === null) {
      lastByteReceived = Math.max(0, fileSize - options.tailLastBytes);
    }

    // Skip fetching data if the file size hasn't changed.
    if (fileSize === lastByteReceived) {
      logger.debug('File has not changed.');
      return;
    }

    // Download the file to the temporary file.
    logger.debug(`Downloading file with offset ${lastByteReceived}...`);
    await client.downloadFile(
      options.filepath,
      tmpFilePath,
      lastByteReceived
    );

    // Update the last byte marker.
    const downloadSize = fs.statSync(tmpFilePath).size;
    lastByteReceived += downloadSize;
    logger.debug(`Downloaded file of size ${downloadSize}.`);
  }

  async function fetchLoop() {
    logger.debug('Connecting or reconnecting to FTP server...');
    await retryWithExponentialBackoff(connect, 12, logger, () => stopSignal, (error: any) => error?.message.includes('timeout'));
    logger.debug('Downloading file...');
    await retryWithExponentialBackoff(fetchFile, 12, logger, () => stopSignal, (error: any) => error?.message.includes('timeout'));
    logger.debug('Processing file...');
    await processFile();
  }

  let isFetchLoopActive = false; // Ensures no concurrent fetch loops

  /**
   * Call fetchLoop immediately if it takes more than options.fetchIntervalMs,
   * if faster than options.fetchIntervalMs, it wait the remaining time before recalling.
   * It never call fetchLoop concurrently.
   */
  async function executeFetchLoop() {
    if (isFetchLoopActive) {
      return; // Skip if already active
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
          `Fetch loop took ${executionTime}ms, which is longer than the requested interval of ${options.fetchIntervalMs}ms.`
        + 'This is fine, but reaction time of plugins will be slower than requested.');
      }

      // If fetchLoop took less time than the interval, wait the remaining time
      const delay = Math.max(0, options.fetchIntervalMs - executionTime);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (e) {
      logger.error(`Error in fetch loop: ${(e as Error)?.message}`, (e as Error)?.stack);
      hasError = true;
      throw e; // stop looping at unhandled error.
    } finally {
      isFetchLoopActive = false; // Unlock once the loop is finished
      // Only at hasError, since stopSignal is called by unwatch (in case of SIGTERM or SIGINT)
      if (hasError) {
        // Call unwatch but do not await it since unwatch also will await this current promise (no loop)
        // noinspection ES6MissingAwait
        unwatch();
      }
      // Do not await here
      if (!hasError || !stopSignal) {
        // noinspection ES6MissingAwait
        currentFetchPromise = executeFetchLoop(); // Schedule the next iteration independently
      }
    }
  }

  // Note: this is not designed to be recalled after unwatch.
  async function watch() {
    // Note: RXJS is not the most fit for the behavior we want.

    logger.info('Watching FTP server...');

    // Signal handling
    process.on('SIGINT', unwatch);
    process.on('SIGTERM', unwatch);

    // First execution, this one has huge chances to fail, wrong credentials will fail here.
    currentFetchPromise = executeFetchLoop()
    await currentFetchPromise;

    logger.info('Connect and first download went fine. (If you need more info on fetch loop, enable debug logs).');
  }

  // Needs to be called in case the fetch loop error or when SIGINT or SIGTERM
  async function unwatch() {
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
      await currentFetchPromise;
    } catch (e) {
      // Do nothing here, as we already handle error on that promise elsewhere.
      // This case happens when the fetchLoop error, and unwatch is called to clean up
      // Promise got rejected, we ignore it and call disconnect.
    } finally {
      await client.disconnect();
    }


    // what about rcon connection, maybe it needs a cleanup too ?
    // not sure process.exit(0) should be in this file...
    // not sure about that, Don't want to force exit.
    // process.exit(0);
  }

  return {
    line$,
    watch,
    unwatch
  }
}
