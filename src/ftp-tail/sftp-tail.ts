import crypto from 'crypto';
import EventEmitter from 'events';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

import Client from 'ssh2-sftp-client';

// Interface for SFTPTail options
interface SFTPTailOptions {
  filepath: string;
  sftp: {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: Buffer | string;
    debug?: (msg: string) => void;
  };
  fetchInterval?: number; // in milliseconds
  tailLastBytes?: number;
  log?: ((msg: string) => void) | boolean;
}

// The SFTPTail class
export class SFTPTail extends EventEmitter {
  private options: SFTPTailOptions & {fetchInterval: number; tailLastBytes: number; };
  private client: Client & {sftp: any}; // quick fix for lib typing being incorrect.
  private lastByteReceived: number | null;
  private fetchLoopActive: boolean;
  private fetchLoopPromise: Promise<void> | null;
  private tmpFilePath!: string; // Temporary file path

  constructor(options: SFTPTailOptions) {
    super();

    // Set default options with fallback values.
    this.options = {
      fetchInterval: 1000, // Default fetch interval: 1 second
      tailLastBytes: 10 * 1000, // Default to tailing the last 10KB
      ...options,
      sftp: {
        ...options.sftp,
      },
    };

    // Setup SFTP client.
    this.client = new Client() as any;

    // Setup logger.
    if (typeof this.options.log === 'function') {
      this.options.sftp.debug = this.options.log;
    } else if (this.options.log) {
      this.options.sftp.debug = console.log;
    } else {
      this.options.sftp.debug = () => {};
    }

    // Default log output to `console.log` or a no-op function.
    this.options.log =
      typeof this.options.log === 'function'
        ? this.options.log
        : this.options.log
          ? console.log
          : () => {};

    this.log = this.options.log;

    // Initialize internal variables.
    this.lastByteReceived = null;
    this.fetchLoopActive = false;
    this.fetchLoopPromise = null;
  }

  /**
   * Start watching a file on the SFTP server
   * @param filePath Path of the file to watch
   */
  async watch(): Promise<void> {
    // Set up a temp file.
    this.tmpFilePath = path.join(
      process.cwd(),
      crypto
        .createHash('md5')
        .update(
          `${this.options.sftp.host}:${this.options.sftp.port}:${this.options.filepath}`
        )
        .digest('hex') + '.tmp'
    );

    // Connect to the SFTP server.
    await this.connect();

    // Start the fetch loop.
    this.log('Starting fetch loop...');
    this.fetchLoopActive = true;
    this.fetchLoopPromise = this.fetchLoop();
  }

  /**
   * Stop watching the file
   */
  async unwatch(): Promise<void> {
    this.log('Stopping fetch loop...');
    this.fetchLoopActive = false;
    if (this.fetchLoopPromise) {
      await this.fetchLoopPromise;
    }
  }

  /**
   * The fetch loop for continuously checking file updates
   */
  private async fetchLoop(): Promise<void> {
    while (this.fetchLoopActive) {
      try {
        const fetchStartTime = Date.now();

        // Reconnect if the client has disconnected.
        await this.connect();

        // Get the size of the file on the SFTP server.
        this.log('Fetching size of file...');
        const fileSize = (await this.client.stat(this.options.filepath!)).size;
        this.log(`File size is ${fileSize}.`);

        // Skip if file size hasn't changed.
        if (fileSize === this.lastByteReceived) {
          this.log('File has not changed.');
          await this.sleep(this.options.fetchInterval);
          continue;
        }

        // Check if file is new or has been truncated.
        if (
          this.lastByteReceived === null ||
          this.lastByteReceived > fileSize
        ) {
          this.log(
            'File has not been tailed before or has decreased in size.'
          );
          this.lastByteReceived = Math.max(
            0,
            fileSize - this.options.tailLastBytes
          );
        }

        // Download the latest chunk of the file to a temporary file.
        this.log(`Downloading file with offset at ${this.lastByteReceived}...`);
        await this.client.get(this.options.filepath!, this.tmpFilePath, {
          readStreamOptions: {
            // Typing is not up to date here, this is valid:
            // https://github.com/theophilusx/ssh2-sftp-client/blob/eda4510f8814c45fb500517dd0dc4d20519b7852/src/index.js#L501
            // @ts-ignore
            start: this.lastByteReceived,
          },
        });

        // Update the last byte received.
        const downloadSize = fs.statSync(this.tmpFilePath).size;
        this.lastByteReceived += downloadSize;
        this.log(`Downloaded file chunk of size ${downloadSize}.`);

        // Read the data from the temporary file.
        const data = await readFile(this.tmpFilePath, 'utf8');

        if (data.length === 0) {
          this.log('No data was fetched.');
          await this.sleep(this.options.fetchInterval);
          continue;
        }

        // Process the data and emit lines.
        data
          .replace(/\r\n$/, '') // Remove trailing newlines.
          .split('\r\n') // Split data into lines.
          .forEach((line) => this.emit('line', line)); // Emit each line.

        const fetchTime = Date.now() - fetchStartTime;
        this.log(`Fetch loop took ${fetchTime}ms.`);
        await this.sleep(Math.min(0, this.options.fetchInterval - fetchTime));
      } catch (error) {
        this.emit('error', error);
        this.log(`Error in fetch loop: ${(error as Error).stack}`);
      }
    }

    if (fs.existsSync(this.tmpFilePath)) {
      fs.unlinkSync(this.tmpFilePath);
      this.log('Deleted temp file.');
    }

    await this.disconnect();
  }

  /**
   * Connect to the SFTP server
   */
  private async connect(): Promise<void> {
    if (this.client.sftp) return;

    this.log('Connecting to SFTP server...');
    await this.client.connect(this.options.sftp);
    this.emit('connected');
    this.log('Connected to SFTP server.');
  }

  /**
   * Disconnect from the SFTP server
   */
  private async disconnect(): Promise<void> {
    if (!this.client.sftp) return;

    this.log('Disconnecting from SFTP server...');
    await this.client.end();
    this.emit('disconnect');
    this.log('Disconnected from SFTP server.');
  }

  /**
   * Pause execution for a set number of milliseconds
   * @param ms Milliseconds to sleep
   */
  private async sleep(ms: number): Promise<void> {
    this.log(`Sleeping for ${ms}ms...`);
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log messages if logging is enabled
   * @param message Log message
   */
  private log(message: string): void {
    if (this.options.log) {
      (this.options.log as (msg: string) => void)(message);
    }
  }
}
