import { LogParserConfig } from './log-parser.config';
import TailModule from 'tail';
import { useFtpTail } from '../ftp-tail/use-ftp-tail';
import { Logger } from 'pino';
import { Subject } from 'rxjs';


export type LogReader = ReturnType<typeof useLogReader>;

export function useLogReader(options: LogParserConfig, logger: Logger) {
  const fixedFilePath = options.logFile.replace(/\\/g, '/');

  switch (options.mode) {
    case 'tail':
      const tail = new TailModule.Tail(fixedFilePath, {
        useWatchFile: true
      });
      const subject = new Subject<string>();
      tail.on('line', (line) => {subject.next(line)})

      // return the same API as the others.
      return {
        watch: tail.watch,
        // SFTP use promise for unwatch, somehow Typescript just think all of them have no promise, maybe it should error at least ?
        // So the fix is to make it a promise, so all of them behaves the same.
        unwatch: () => new Promise<void>((resolve) => {tail.unwatch(); resolve();}),
        line$: subject.asObservable(),
      };
    case 'sftp':
      return useFtpTail(logger, {
        protocol: 'sftp',
        sftp: options.ftp,
        filepath: fixedFilePath,
        fetchIntervalMs: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.initialTailSize,
      });
    case 'ftp':
      return useFtpTail(logger, {
        protocol: 'ftp',
        ftp: options.ftp,
        filepath: fixedFilePath,
        fetchIntervalMs: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.initialTailSize,
      });
    default:
      throw new Error(`Invalid mode: ${(options as any).mode}`);
  }
}
