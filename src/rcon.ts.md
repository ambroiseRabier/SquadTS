Refactor notes (stuff I'm not sure about):
- removed ` clearTimeout(this.autoReconnectTimeout);` as it is never set in first place
- TS informed us `buf.toString('hex').match(/../g)` may be null, dunno how this case should be handled (or if), so it is ignored for now with `.!`
