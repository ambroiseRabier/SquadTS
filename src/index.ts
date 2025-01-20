import { Server } from './server';
import pino from 'pino';
import pretty from 'pino-pretty';

// inversifyJS ?
async function main() {
  const isDev = process.env.NODE_ENV !== 'production';
  // Pino will show pretty logs only in dev as per their recommendation.
  const prettyStream = pretty({
    colorize: true,
    sync: process.env.NODE_ENV === 'test'
  });
  const logger = pino({
    level: isDev ? 'trace': 'info',
  }, isDev ? prettyStream : undefined);


  const server = new Server(logger);

  await server.watch();

}

main();
