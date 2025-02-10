import { Logger } from 'pino';
import { interval, Subject, takeUntil } from 'rxjs';
import { Client } from 'basic-ftp';
import path from 'path';
import crypto from 'crypto';
import { merge } from 'lodash';
import fs from 'fs';
import { readFile } from 'fs/promises';
import readline from 'node:readline';
import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { retryWithExponentialBackoff } from './retry-with-eponential-backoff';

interface FTPOptions {
  host: string;
  port: number;
  username: string;
  password: string;
  secure?: boolean;
  timeout?: number;
  log?: (message: string) => void;
}

interface Props {
  ftp: FTPOptions; // FTP configuration
  filepath: string;
  // Fetch interval in milliseconds, 1sec (1000ms) is probably the lowest you should go
  fetchIntervalMs: number;
  // Number of bytes to tail, probably shouldn't go lower than 10000
  tailLastBytes: number;
}

export function useFtpTail(logger: Logger, options: Props) {
  const line$ = new Subject<string>();
  const client = new Client(options.ftp.timeout);
  const stop$ = new Subject<void>();
  const retryStopSignal = false;
  let lastByteReceived: number | null = null;

  client.ftp.log = logger.debug;

  const tmpFilePath = path.join(
    process.cwd(),
    crypto
      .createHash('md5')
      .update(`${options.ftp.host}:${options.ftp.port}:${options.filepath}`)
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
    if (!client.closed) {
      return;
    }

    logger.info('Connecting to FTP server...');

    await client.access({
      user: options.ftp.username,
      ...options.ftp
    });
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
    const fileSize = await client.size(options.filepath);

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
    await client.downloadTo(
      fs.createWriteStream(tmpFilePath, { flags: 'w' }),
      options.filepath,
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
    client.close();

    // not sure this is needed.
    // what about rcon connection, maybe it needs a cleanup too ?
    // process.exit(0); or not ?
  }

  // let fetchTimeout: NodeJS.Timeout;
  // let fetchPromise: Promise<void>;
  // let fetchLoopActive = false;
  // let stopFetchRequest = false;
  // let lastByteReceived: number|null = null;
  //
  // async function watch() {
  //   await fetchLoop();
  //
  //   process.on('SIGINT', async () => {
  //     console.log('SIGINT received. Gracefully shutting down...');
  //     await unwatch();
  //     process.exit(0); // Exit gracefully
  //   });
  //
  //   process.on('SIGTERM', async () => {
  //     console.log('SIGTERM received. Gracefully shutting down...');
  //     await unwatch();
  //     process.exit(0); // Exit gracefully
  //   });
  // }
  //
  // async function unwatch() {
  //   // Do we unwatch in the middle of the fetchloop, if yes, we need to make sure it is stopped
  //   // before disconecting.
  //   if (fetchLoopActive) {
  //     stopFetchRequest = true;
  //     await fetchPromise;
  //   } else {
  //     clearTimeout(fetchTimeout);
  //     client.close();
  //   }
  // }



  // todo: retry nb et retry interval si fail connect ftp ? que faire en cas de erreur ?
  // async function fetchLoop() {
  //   fetchLoopActive = true;
  //   const fetchStartTime = performance.now();
  //   const waitBasedOnStartTime = () => {
  //     const fetchDuration = performance.now() - fetchStartTime;
  //     logger.info(`It took ${fetchDuration}ms to fetch.`);
  //     return Math.max(0, options.fetchIntervalMs - fetchDuration);
  //   };
  //   const endIteration = () => {
  //     if (!stopFetchRequest) {
  //       fetchPromise = fetchLoop();
  //       fetchTimeout = setTimeout(async () => await fetchPromise, waitBasedOnStartTime());
  //     } else {
  //       client.close();
  //     }
  //     fetchLoopActive = false;
  //   };
  //
  //
  //   try {
  //     await connect();
  //   } catch (e) {
  //     const message = (e as Error).message;
  //     // if no internet, retry
  //     if (message.toLowerCase().includes('timeout')) {
  //       logger.error(`Failed to connect to FTP server: ${message}`);
  //       endIteration();
  //       return;
  //     } else {
  //       // If wrong credentials, do not retry
  //       throw e;
  //     }
  //   }
  //
  //   try {
  //     await fetchFile()
  //   } catch(e) {
  //     logger.error(`Failed to fetch file: ${(e as Error).message}`);
  //     const message = (e as Error).message;
  //     // if no internet, retry
  //     if (message.includes('timeout')) {
  //       endIteration();
  //     } else {
  //       throw e;
  //     }
  //   }
  //
  //   try {
  //     await processFile()
  //   } catch(e) {
  //     logger.error(`Failed to process file: ${(e as Error).message}`)
  //     throw e;
  //   }
  //
  //   endIteration();
  // }

  return {
    line$,
    watch,
    unwatch
  }
}
