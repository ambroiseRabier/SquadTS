```js
import build from 'pino-abstract-transport';
import { pipeline, Transform } from 'node:stream';
import stripAnsi from 'strip-ansi';

// See https://github.com/pinojs/pino/blob/main/docs/transports.md#creating-a-transport-pipeline
export default async function (options) {
  return build(
    function (source) {
      const myTransportStream = new Transform({
        // Make sure autoDestroy is set,
        // this is needed in Node v12 or when using the
        // readable-stream module.
        autoDestroy: true,

        objectMode: true, // false would be nice, as we don't need to parse to object ot strip ansi.
        // chunk has: level, time, msg in objectMode true
        // chunk is Buffer or string in objectMode false
        transform(chunk, enc, cb) {
          // In object mode:
          // modifies the payload somehow
          // chunk.service = 'pino';
          chunk.msg = stripAnsi(chunk.msg);
          // stringify the payload again
          this.push(`${JSON.stringify(chunk)}\n`);

          cb();
        },
      });
      pipeline(source, myTransportStream, () => {});
      return myTransportStream;
    },
    {
      // This is needed to be able to pipeline transports.
      enablePipelining: true,
    }
  );
}
```

That's ok, can be used as reference for more pipelines.

```js
import build from 'pino-abstract-transport';
import { pipeline, Transform } from 'node:stream';
import stripAnsi from 'strip-ansi';
import stripAnsiStream from 'strip-ansi-stream';

// See https://github.com/pinojs/pino/blob/main/docs/transports.md#creating-a-transport-pipeline
export default async function (options) {
  return build(function (source) {
    return pipeline(
      source, // The log source from Pino
      stripAnsiStream(), // Removes ANSI codes
      process.stdout, // Pipe to standard output or any other destination
      (err) => {
        if (err) {
          console.error('Pipeline error:', err);
        }
      }
    );
  });
}
```

give

```
[11:23:11.262] INFO: Starting SquadTS
Pipeline error: TypeError: Invalid non-string/buffer chunk
    at validChunk (L:\PROJECTS_3\WEB\SquadTS\node_modules\replacestream\node_modules\readable-stream\lib\_stream_writable.js:304:10)
    at Writable.write (L:\PROJECTS_3\WEB\SquadTS\node_modules\replacestream\node_modules\readable-stream\lib\_stream_writable.js:332:62)
    at Transform.ondata (node:internal/streams/readable:1009:22)
    at Transform.emit (node:events:530:35)
    at addChunk (node:internal/streams/readable:561:12)
    at readableAddChunkPushObjectMode (node:internal/streams/readable:538:3)
    at Readable.push (node:internal/streams/readable:393:5)
    at push (L:\PROJECTS_3\WEB\SquadTS\node_modules\split2\index.js:76:10)
    at Transform.transform [as _transform] (L:\PROJECTS_3\WEB\SquadTS\node_modules\split2\index.js:44:7)
    at Transform._write (node:internal/streams/transform:171:8)

```

maybe source send an object, so objectMode by default true would not be a performance issue at all.
