import { pino } from 'pino';

export const transport = pino.transport({
  // See https://getpino.io/#/docs/transports
  // absolute path, will be executed on another worker thread
  target: __filename.replace('to-file.js', 'file-transport.mjs')

})
