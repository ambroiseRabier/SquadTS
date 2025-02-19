// Note tried .ts, but I get failed to read (lint-staged doc not up to date or did I miss something ?)

const prettier =
  'node --experimental-strip-types node_modules/prettier/bin/prettier.cjs --write --ignore-unknown';
/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  '!(*.{ts, mts})': prettier,
  '*.{ts, mts}': [prettier, 'eslint'],
};
