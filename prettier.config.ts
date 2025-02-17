import { type Config } from 'prettier';

const config: Config = {
  // Notes: trailing comma is preferred because:
  // - Cleaner diff in version control
  // - Easier to duplicate last line (no comma to add on the line above)
  // But is maybe a bit less readable, esthetic.
  //
  // Do not use all, we don't want comma behind parameters of function like .describe() of zod.
  // it may confuse the reader into thinking there is a second parameter after.
  trailingComma: 'es5',

  // Notes: singleQuote seems to be the modern JS standard, personally I am fine with both,
  //        but the project looks cleaner with only one or the other.
  singleQuote: true,

  // Looks better, easier to write.
  // `.map((line) => line.trimStart())` ===> `.map(line => line.trimStart())`
  arrowParens: 'avoid',

  // 80 is a bit small, even on a 1080p split screen you can have more...
  printWidth: 100,
};

export default config;
