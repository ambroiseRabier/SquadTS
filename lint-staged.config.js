// Note tried .ts, but I get failed to read (lint-staged doc not up to date or did I miss something ?)

const prettier =
  'node --experimental-strip-types node_modules/prettier/bin/prettier.cjs --write --ignore-unknown';

/**
 * We only run prettier, and not eslint --fix. Since there are too many occasions where there is disagreement with eslint --fix.
 * It also give devs the occasion to learn from their mistake, and re-evaluate code, like is that non-null-assertion really safe
 * and documented ?
 * Read: https://github.com/lint-staged/lint-staged?tab=readme-ov-file#task-concurrency
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
// export default {
//   '*': prettier,
// };

export default {
  '!(*.{ts, mts})': prettier,
  '*.{ts, mts}': [prettier, 'eslint --max-warnings=0'],
};
