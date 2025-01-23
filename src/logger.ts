import pretty from 'pino-pretty';
import pino from 'pino';

export class Logger {
  public readonly logger: pino.BaseLogger;

  constructor() {
    const isDev = process.env.NODE_ENV !== 'production';
    // Pino will show pretty logs only in dev as per their recommendation.
    // Pretty logs are also good when you host SquadJS locally.
    const prettyStream = pretty({
      colorize: true,
      sync: process.env.NODE_ENV === 'test'
    });
    this.logger = pino({
      level: isDev ? 'trace': 'info',
    }, isDev ? prettyStream : undefined);
  }
}
