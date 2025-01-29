import { LogParserConfig } from './log-parser.config';
import TailModule from 'tail';
import { SFTPTail } from '../ftp-tail/sftp-tail';
import { FTPTail } from '../ftp-tail/ftp-tail';
import path from 'node:path';


export type LogReader = ReturnType<typeof useLogReader>;

export function useLogReader(options: LogParserConfig, debugFTP: boolean) {
  const fixedFilePath = options.logFile.replace(/\\/g, '/');

  switch (options.mode) {
    case 'tail':
      return new TailModule.Tail(fixedFilePath, {
        useWatchFile: true
      });
    case 'sftp':
      return new SFTPTail({
        sftp: options.ftp,
        filepath: fixedFilePath,
        fetchInterval: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.maxTempFileSize,
        log: debugFTP ? console.log : undefined // if you need to debug ftp-tail
      });
    case 'ftp':
      return new FTPTail({
        ftp: options.ftp,
        filepath: fixedFilePath,
        fetchInterval: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.maxTempFileSize,
        log: debugFTP ? console.log : undefined // if you need to debug ftp-tail
      });
    default:
      throw new Error(`Invalid mode: ${(options as any).mode}`);
  }
}
