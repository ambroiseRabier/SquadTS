import pretty from 'pino-pretty';
import { Logger, pino } from 'pino';
import { Options } from '../config/parse-config';
import chalk from 'chalk';

const isDev = process.env.NODE_ENV !== 'production';


export function useLogger() {
  // Pino will show pretty logs only in dev as per their recommendation.
  const prettyStream = pretty({
    colorize: true,
    sync: process.env.NODE_ENV === 'test'
  });
  const logger = pino({
    level: isDev ? 'debug': 'info',
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
    })
  };
}
