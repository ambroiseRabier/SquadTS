import { LogParserConfig } from './log-parser.config';
import TailModule from 'tail';
import { useFtpTail } from '../ftp-tail/use-ftp-tail';
import { Logger } from 'pino';
import { Subject } from 'rxjs';
import { omit } from 'lodash-es';
import fs from 'node:fs';
import path from 'node:path';

export type LogReader = ReturnType<typeof useLogReader>;

export function useLogReader(options: LogParserConfig, logger: Logger) {
  const fixedFilePath = options.logFile.replace(/\\/g, '/');

  switch (options.mode) {
    case 'tail': {
      const tail = new TailModule.Tail(fixedFilePath, {
        useWatchFile: true,
      });
      const subject = new Subject<string>();
      tail.on('line', line => {
        subject.next(line);
      });

      // Note: readFile is a bit hacky, but dealing with both FTP (one connection) and local file is not easy.

      // return the same API as the others.
      return {
        readFile: async (subPath: string) => {
          return await fs.promises.readFile(subPath, 'utf8');
        },
        writeFile: async (filepath: string, content: string) => {
          await fs.promises.writeFile(path.normalize(filepath), content, 'utf8');
        },
        // There isn't a "connect" for reading a file, but this is to keep the same API as FTP and SFTP
        connect: async () => {
          return await fs.promises
            .access(fixedFilePath)
            .then(() => {
              logger.info(`Local log file ${fixedFilePath} found.`);
              return true;
            })
            .catch(() => {
              logger.fatal(`Local log file ${fixedFilePath} not found.`);
              return false;
            });
        },
        // Same as unwatch
        watch: () =>
          new Promise<void>(resolve => {
            tail.on('error', (error: unknown) => logger.error(error));
            tail.watch();
            resolve();
          }),
        // SFTP use promise for unwatch, somehow Typescript just think all of them have no promise, maybe it should error at least ?
        // So the fix is to make it a promise, so all of them behaves the same.
        unwatch: () =>
          new Promise<void>(resolve => {
            tail.unwatch();
            resolve();
          }),
        line$: subject.asObservable(),
      };
    }
    case 'sftp':
      return useFtpTail(logger, {
        configDir: options.configDir,
        protocol: 'sftp',
        sftp: options.ftp,
        filepath: fixedFilePath,
        fetchIntervalMs: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.initialTailSize,
      });
    case 'ftp':
      return useFtpTail(logger, {
        configDir: options.configDir,
        protocol: 'ftp',
        ftp: {
          ...omit(options.ftp, ['username']),
          user: options.ftp.username,
        },
        filepath: fixedFilePath,
        fetchIntervalMs: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.initialTailSize,
      });
    default:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Invalid mode: ${(options as any)?.mode}`);
  }
}
