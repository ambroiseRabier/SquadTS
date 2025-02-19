import build from 'pino-abstract-transport';
import { pipeline, Transform } from 'node:stream';
import stripAnsi from 'strip-ansi';

// See https://github.com/pinojs/pino/blob/main/docs/transports.md#creating-a-transport-pipeline
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function (options) {
  return build(
    function (source) {
      const myTransportStream = new Transform({
        // Make sure autoDestroy is set,
        // this is needed in Node v12 or when using the
        // readable-stream module.
        autoDestroy: true,

        // It is likely source stream send us an object. So there is nothing to gain settings it to false.
        objectMode: true,
        // chunk has: level, time, msg in objectMode true
        // chunk is Buffer or string in objectMode false
        transform(chunk, enc, cb) {
          // In object mode:
          // modifies the payload somehow
          // chunk.service = 'pino'; // example
          chunk.msg = stripAnsi(chunk.msg);
          // stringify the payload again
          this.push(`${JSON.stringify(chunk)}\n`);

          cb();
        },
      });
      // Use no-op instead of stdout.
      pipeline(source, myTransportStream, () => {
        /* no-op */
      });
      return myTransportStream;
    },
    {
      // This is needed to be able to pipeline transports.
      enablePipelining: true,
    }
  );
}
