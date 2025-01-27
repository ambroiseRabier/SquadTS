declare module 'ftp-tail' {
  import { EventEmitter } from 'events';

  export interface FTPConfig {
    host: string;
    port?: number;
    user: string;
    password: string;
  }

  export interface FTPTailOptions {
    ftp: FTPConfig;
    fetchInterval?: number; // Interval (in milliseconds) for fetching updates
    maxTempFileSize?: number; // Maximum temporary file size in bytes
  }

  /**
   * FTPTail watches a file on an FTP server and reads new lines.
   */
  export class FTPTail extends EventEmitter {
    constructor(options: FTPTailOptions);

    /**
     * Start watching a file on the FTP server.
     * @param filePath - Path to the log file on the FTP server.
     */
    watch(filePath: string): Promise<void>;

    /**
     * Stop watching the currently watched file.
     */
    unwatch(): Promise<void>;

    /**
     * Add an event listener for the 'line' event.
     * The 'line' event is emitted whenever a new line is read from the FTP file.
     * @param event - The event name ('line').
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: 'line', listener: (line: string) => void): this;

    /**
     * Add an event listener for the 'error' event.
     * The 'error' event is emitted in case of an error while reading or connecting to the FTP server.
     * @param event - The event name ('error').
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: 'error', listener: (error: Error) => void): this;

    /**
     * Add other event listeners, if needed.
     * @param event - The event name.
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface SFTPConfig {
    host: string;
    port?: number;
    username: string;
    password?: string;
    privateKey?: string | Buffer; // For private key authentication
    passphrase?: string; // Optional passphrase for the private key
  }

  export interface SFTPTailOptions {
    sftp: SFTPConfig;
    fetchInterval?: number; // Interval (in milliseconds) for fetching updates
    maxTempFileSize?: number; // Maximum temporary file size in bytes
  }

  /**
   * SFTPTail watches a file on an SFTP server and reads new lines.
   */
  export class SFTPTail extends EventEmitter {
    constructor(options: SFTPTailOptions);

    /**
     * Start watching a file on the SFTP server.
     * @param filePath - Path to the log file on the SFTP server.
     */
    watch(filePath: string): Promise<void>;

    /**
     * Stop watching the currently watched file.
     */
    unwatch(): Promise<void>;

    /**
     * Add an event listener for the 'line' event.
     * The 'line' event is emitted whenever a new line is read from the SFTP file.
     * @param event - The event name ('line').
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: 'line', listener: (line: string) => void): this;

    /**
     * Add an event listener for the 'error' event.
     * The 'error' event is emitted in case of an error while reading or connecting to the SFTP server.
     * @param event - The event name ('error').
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: 'error', listener: (error: Error) => void): this;

    /**
     * Add other event listeners, if needed.
     * @param event - The event name.
     * @param listener - The callback function to invoke when the event is emitted.
     */
    on(event: string, listener: (...args: any[]) => void): this;
  }
}
