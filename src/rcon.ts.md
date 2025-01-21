Typing of `responseCallbackQueue` seem to not include Error when Auth request. It also have the string type sometime.

```ts

this.responseCallbackQueue.push((decodedPacket) => {
```
