Target cannot be `es2016` as `const ID_MATCHER = /\s*(?<name>[^\s:]+)\s*:\s*(?<id>[^\s]+)/g;` in id-parser.ts use name capturing groups
 
> node16 and nodenext are the only correct module options for all apps and libraries that are intended to run in Node.js v12 or later, whether they use ES modules or not.

https://www.typescriptlang.org/docs/handbook/modules/reference.html#the-module-compiler-option
https://www.typescriptlang.org/docs/handbook/modules/theory.html#the-module-output-format


may also consider: https://stackoverflow.com/questions/72380007/what-typescript-configuration-produces-output-closest-to-node-js-18-capabilities
