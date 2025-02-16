import pretty from 'pino-pretty';
import { Logger, pino } from 'pino';
import { Options } from '../config/config.schema';
import chalk from 'chalk';

const isDev = process.env.NODE_ENV !== 'production';

// todo save logs on file, also keep the file at a certain max size.
// Also allow saving log at 2 different location for tests and prod/dev ...
// env var ? like for config
// Non pas besoin
// Note: for test server, logs will be in the console, no need to save them to a file :)
export function useLogger() {
  // Pino will show pretty logs only in dev as per their recommendation.
  const prettyStream = pretty({
    colorize: true,
    sync: process.env.NODE_ENV === 'test'
  });
  const logger = pino({
    // level: isDev ? 'debug': 'info', // all levels are ok for main function.
    // todo: add a transport for file, max file size needed too.
    ...(isDev ? {
      base: null,  // Remove processID and hostname
    } : {}),
    // formatters:,
  }, isDev ? prettyStream : undefined);

  return logger;
}

export function useSubLogger(logger: Logger, verboseness: Options['logger']['verboseness']) {
  return {
    squadServerLogger: logger.child({}, {
      msgPrefix: chalk.yellowBright('[SquadServer] '),
      level: verboseness.SquadServer
    }),
    rconLogger: logger.child({}, {
      msgPrefix: chalk.cyanBright('[RCON] '),
      level: verboseness.RCON
    }),
    logParserLogger: logger.child({}, {
      msgPrefix: chalk.blueBright('[LogParser] '),
      level: verboseness.LogParser
    }),
    rconSquadLogger: logger.child({}, {
      msgPrefix: chalk.blue('[RCONSquad] '),
      level: verboseness.RCONSquad
    }),
    cachedGameStatusLogger: logger.child({}, {
      msgPrefix: chalk.greenBright('[CachedGameStatus] '),
      level: verboseness.CachedGameStatus
    }),
    pluginLoaderLogger: logger.child({}, {
      msgPrefix: chalk.magenta('[PluginLoader] '),
      level: verboseness.PluginLoader
    }),
    adminListLogger: logger.child({}, {
      msgPrefix: chalk.greenBright('[AdminList] '),
      level: verboseness.AdminList
    }),
    logReaderLogger: logger.child({}, {
      msgPrefix: chalk.green('[LogReader] '),
      level: verboseness.LogReader
    }),
    githubInfoLogger: logger.child({}, {
      msgPrefix: chalk.magentaBright('[GithubInfo] '),
      level: verboseness.GithubInfo
    })
  };
}
