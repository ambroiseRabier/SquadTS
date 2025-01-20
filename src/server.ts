import pino from 'pino';


export class Server {
  private logger: pino.BaseLogger;

  constructor(logger: pino.BaseLogger) {
    this.logger = logger;
  }

  public async watch() {
    this.logger.info('Server started');
  }
}
