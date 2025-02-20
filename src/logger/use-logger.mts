import { Logger, pino } from 'pino';
import { Options } from '../config/config.schema';
import chalk from 'chalk';
import { LOG_FILE } from '../config/path-constants.mjs';
import { fileURLToPath } from 'node:url';

// const isDev = process.env.NODE_ENV !== 'production';

export function useLogger() {
  // transports vs stream: https://github.com/pinojs/pino/issues/1514
  // Prefer transports, worker thread, better performance.
  // Also, multi-stream repo has been archived.

  // https://stackoverflow.com/questions/63523169/logging-to-stdout-and-a-file-with-node-pino
  const transport = pino.transport({
    targets: [
      {
        level: 'trace',
        target: 'pino-pretty',
        options: {
          // ? Show pretty logs only in dev as per their recommendation ?
          colorize: true,
          // pino recommendation to have it synchrone in tests
          sync: process.env.NODE_ENV === 'test',
        },
      },

      // https://github.com/pinojs/pino/blob/main/docs/transports.md#pinofile
      {
        level: 'trace',
        pipeline: [
          {
            target: fileURLToPath(import.meta.url).replace(
              'use-logger.mts',
              'strip-ansi.pipeline.mjs'
            ),
          },
          // {
          //   target: 'pino/file',
          //   options: {
          //     mkdir: true,
          //     append: false,
          //     destination: LOG_FILE,
          //   },
          // }

          // https://stackoverflow.com/questions/65035838/how-can-i-rotate-log-files-in-pino-js-logger
          // https://github.com/mcollina/pino-roll
          {
            target: 'pino-roll',
            options: {
              mkdir: true,
              file: LOG_FILE,
              frequency: 1000 * 60 * 60 * 2, // 2h
              // I've got no idea how much logs a full server give
              // Trying to keep it small to make it easier to read
              size: '20m',
              // 25*20m is 500Mo max space used, or 25*2h is around 2 days
              // How many log file max to keep without counting the one we are writing to.
              // Note that it is not a complete fix as it won't handle file created from a previous execution.
              limit: { count: 25 },
              // Would prefer the date being placed before .log not after...
              dateFormat: 'yyyy-MM-dd-hh',
            },
          },
        ],
      },
    ],
  });
  const logger = pino(
    {
      base: null, // Remove processID and hostname
    },
    transport
  );

  return logger;
}

export function useSubLogger(logger: Logger, verbosity: Options['logger']['verbosity']) {
  // More readable with less line breaks.
  // prettier-ignore
  return {
    squadServerLogger: logger.child({}, {
      msgPrefix: chalk.yellowBright('[SquadServer] '),
      level: verbosity.SquadServer,
    }),
    rconLogger: logger.child({}, {
      msgPrefix: chalk.cyanBright('[RCON] '),
      level: verbosity.RCON,
    }),
    logParserLogger: logger.child({}, {
      msgPrefix: chalk.blueBright('[LogParser] '),
      level: verbosity.LogParser,
    }),
    rconSquadLogger: logger.child({}, {
      msgPrefix: chalk.blue('[RCONSquad] '),
      level: verbosity.RCONSquad,
    }),
    pluginLoaderLogger: logger.child({}, {
      msgPrefix: chalk.magenta('[PluginLoader] '),
      level: verbosity.PluginLoader,
    }),
    adminListLogger: logger.child({}, {
      msgPrefix: chalk.greenBright('[AdminList] '),
      level: verbosity.AdminList,
    }),
    logReaderLogger: logger.child({}, {
      msgPrefix: chalk.green('[LogReader] '),
      level: verbosity.LogReader,
    }),
    githubInfoLogger: logger.child({}, {
      msgPrefix: chalk.magentaBright('[GithubInfo] '),
      level: verbosity.GithubInfo,
    }),
  };
}
