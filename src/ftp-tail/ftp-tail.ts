import crypto from 'crypto';
import EventEmitter from 'events';
import fs from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';

import { Client, StringEncoding } from 'basic-ftp';

// Define the options interface
interface FTPOptions {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  secure?: boolean;
  encoding?: string;
  timeout?: number;
  log?: (message: string) => void;
}

// Define the FTPTailOptions interface
interface FTPTailOptions {
  filepath: string;
  ftp: FTPOptions; // FTP configuration
  fetchInterval?: number; // Fetch interval in milliseconds
  tailLastBytes?: number; // Number of bytes to tail
  log?: ((message: string) => void) | boolean; // Logger configuration
}

export class FTPTail extends EventEmitter {
  private options: FTPTailOptions & {fetchInterval: number; tailLastBytes: number; };
  private client: Client;
  private lastByteReceived: number | null;
  private fetchLoopActive: boolean;
  private fetchLoopPromise: Promise<void> | null;
  private tmpFilePath!: string;
  private log: (message: string) => void;

  constructor(options: FTPTailOptions) {
    super();

    // Set default options.
    this.options = {
      fetchInterval: 1000,
      tailLastBytes: 10 * 1000,
      log: false,
      ...options,
      ftp: {
        ...options.ftp,
      },
    };

    // Initialize basic-ftp client.
    this.client = new Client(this.options.ftp.timeout);
    if (this.options.ftp.encoding) {
      this.client.ftp.encoding = this.options.ftp.encoding as StringEncoding;
    }

    // Set up logging.
    if (typeof this.options.log === 'function') {
      this.log = this.options.log;
      this.client.ftp.log = this.options.log;
    } else if (this.options.log) {
      this.log = console.log;
      this.client.ftp.log = console.log;
    } else {
      this.log = () => {};
      this.client.ftp.log = () => {};
    }

    // Initialize internal properties.
    this.lastByteReceived = null;
    this.fetchLoopActive = false;
    this.fetchLoopPromise = null;
  }

  /**
   * Starts watching a file on the FTP server.
   * @param filePath Path of the file to watch.
   */
  async watch(): Promise<void> {

    // Generate a temporary file path.
    this.tmpFilePath = path.join(
      process.cwd(),
      crypto
        .createHash('md5')
        .update(`${this.options.ftp.host}:${this.options.ftp.port}:${this.options.filepath}`)
        .digest('hex') + '.tmp'
    );

    // Connect to the FTP server.
    await this.connect();

    // Start the fetch loop.
    this.log('Starting fetch loop...');
    this.fetchLoopActive = true;
    this.fetchLoopPromise = this.fetchLoop();
  }

  /**
   * Stops watching the file.
   */
  async unwatch(): Promise<void> {
    this.log('Stopping fetch loop...');
    this.fetchLoopActive = false;
    if (this.fetchLoopPromise) {
      await this.fetchLoopPromise;
    }
  }

  /**
   * Fetch loop to continuously fetch file changes.
   */
  private async fetchLoop(): Promise<void> {
    while (this.fetchLoopActive) {
      try {
        const fetchStartTime = Date.now();

        // Reconnect to the FTP server if disconnected.
        await this.connect();

        // Get the file size.
        this.log('Fetching size of file...');
        const fileSize = await this.client.size(this.options.filepath!);
        this.log(`File size is ${fileSize}.`);

        // Skip fetching data if the file size hasn't changed.
        if (fileSize === this.lastByteReceived) {
          this.log('File has not changed.');
          await this.sleep(this.options.fetchInterval);
          continue;
        }

        // If the file is new or truncated, fetch the last bytes.
        if (this.lastByteReceived === null || this.lastByteReceived > fileSize) {
          this.log('File has not been tailed before or has decreased in size.');
          this.lastByteReceived = Math.max(0, fileSize - this.options.tailLastBytes);
        }

        // Download the file to the temporary file.
        this.log(`Downloading file with offset ${this.lastByteReceived}...`);
        await this.client.downloadTo(
          fs.createWriteStream(this.tmpFilePath, { flags: 'w' }),
          this.options.filepath!,
          this.lastByteReceived
        );

        // Update the last byte marker.
        const downloadSize = fs.statSync(this.tmpFilePath).size;
        this.lastByteReceived += downloadSize;
        this.log(`Downloaded file of size ${downloadSize}.`);

        // Read the data from the temporary file.
        const data = await readFile(this.tmpFilePath, 'utf8');

        if (data.length === 0) {
          this.log('No data was fetched.');
          await this.sleep(this.options.fetchInterval);
          continue;
        }

        // Process and emit lines from the fetched data.
        data
          .replace(/\r\n$/, '') // Remove trailing newlines.
          .split('\r\n') // Split into lines.
          .forEach((line) => this.emit('line', line)); // Emit each line.

        const fetchTime = Date.now() - fetchStartTime;
        this.log(`Fetch loop took ${fetchTime}ms.`);
        // todo: just wanna check
        console.log(`Fetch loop took ${fetchTime}ms.`);
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
   * Connects to the FTP server.
   */
  private async connect(): Promise<void> {
    if (!this.client.closed) return;

    this.log('Connecting to FTP server...');
    await this.client.access(this.options.ftp);
    this.emit('connected');
    this.log('Connected to FTP server.');
  }

  /**
   * Disconnects from the FTP server.
   */
  private async disconnect(): Promise<void> {
    if (this.client.closed) return;

    this.log('Disconnecting from FTP server...');
    await this.client.close();
    this.emit('disconnect');
    this.log('Disconnected from FTP server.');
  }

  /**
   * Sleeps for a specified number of milliseconds.
   * @param ms Number of milliseconds to sleep.
   */
  private async sleep(ms: number): Promise<void> {
    this.log(`Sleeping for ${ms}ms...`);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
