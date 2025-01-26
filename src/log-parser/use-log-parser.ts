import { FTPTail, FTPTailOptions, SFTPTail, SFTPTailOptions } from 'ftp-tail';
import path from 'node:path';
import TailModule from 'tail';
import { LogParserConfig } from './log-parser.config';
import { Subject } from 'rxjs';


export interface Rule {
  regex: RegExp;
  onMatch: (match: RegExpExecArray) => void; // todo wip structure
}


export function useLogParser(options: LogParserConfig, rules: Rule[]) {
  // It is written as we send push function to the reader.
  // noinspection JSMismatchedCollectionQueryUpdate
  const queue = new Subject<string>();
  const filePath = path.resolve(options.logFile);
  const logReader = getLogReader();
  logReader.on('line', queue.next);

  function getLogReader() {
    switch (options.mode) {
      case 'tail':
        return new TailModule.Tail(filePath, {
          useWatchFile: true
        });
      case 'sftp':
        return new SFTPTail({
          ...options,
          sftp: options.sftp
        });
      case 'ftp':
        // todo: would be nice if we are not dependant on basic-auth (used by ftp-tail) interface, but that ftp-tail provide
        //       the same interface for both ftp and sftp.
        return new FTPTail({
          ...options,
          ftp: {
            ...options.ftp,
            user: options.ftp.username
          }
        });
      default:
        throw new Error(`Invalid mode: ${options.mode}`);
    }
  }



  return {
    // unwatch: async () => {
    //   await this.logReader.unwatch();
    //
    //   clearInterval(this.parsingStatsInterval);
    // }
  };
}
