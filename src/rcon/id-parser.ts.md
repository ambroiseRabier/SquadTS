https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#examples

Seems like we can update the syntax of IdsIterator and get the same result.

Moved some more logic inside id-parser for DRY.

I don't know if Id are always parsed successfully, regex may not always match the string given.

---

inconsistence: `Number of {platform: ID} pairs can be arbitrary`

```
/** All possible IDs that a player can have. */
export const playerIdNames = ['steamID', 'eosID']
```

I ignore all other platform apart from steamID and eosID. However, it current behavior is preserved, if any other
platform exist it will be kept.
