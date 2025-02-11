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
        client.ftp.log = logger.debug;
      } else {
        options.sftp.debug = logger.debug;
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
  const stop$ = new Subject<void>();
  const retryStopSignal = false;
  let lastByteReceived: number | null = null;

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
      logger.info('File has not changed.');
      return;
    }

    // Download the file to the temporary file.
    logger.info(`Downloading file with offset ${lastByteReceived}...`);
    await client.downloadFile(
      options.filepath,
      tmpFilePath,
      lastByteReceived
    );

    // Update the last byte marker.
    const downloadSize = fs.statSync(tmpFilePath).size;
    lastByteReceived += downloadSize;
    logger.info(`Downloaded file of size ${downloadSize}.`);
  }

  async function fetchLoop() {
    await retryWithExponentialBackoff(connect, 12, logger, () => retryStopSignal, (error: any) => error?.message.includes('timeout'));
    await retryWithExponentialBackoff(fetchFile, 12, logger, () => retryStopSignal, (error: any) => error?.message.includes('timeout'));
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

      logger.info(`Fetch loop took ${executionTime}ms.`);

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
      // Do not await here
      if (!hasError) {
        // noinspection ES6MissingAwait
        executeFetchLoop(); // Schedule the next iteration independently
      }
    }
  }

  function watch() {
    interval(options.fetchIntervalMs)
      .pipe(takeUntil(stop$))
      .subscribe({
        next: executeFetchLoop,
        error: unwatch,
        // complete: unwatch // only place I call stop$ is in unwatch, we don't want to call unwatch twice.
      });

    // Signal handling
    process.on('SIGINT', unwatch);
    process.on('SIGTERM', unwatch);
  }

  async function unwatch() {
    stop$.next(); // Stop RxJS fetch loop
    logger.info('Cleanup initiated.');
    // It may be useful to keep the file for debug
    // await removeTempFile();
    await client.disconnect();

    // not sure if this is needed.
    // what about rcon connection, maybe it needs a cleanup too ?
    // process.exit(0); or not ?
  }

  return {
    line$,
    watch,
    unwatch
  }
}
