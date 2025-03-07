// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// https://eslint.org/docs/latest/use/configure/ignore#including-gitignore-files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const gitignorePath = path.resolve(__dirname, '.gitignore');

export default tseslint.config(
  eslint.configs.recommended,
  // Maybe we revert to this one if too strict, based on https://typescript-eslint.io/getting-started:
  // tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  eslintConfigPrettier,
  {
    rules: {
      // Set to single quote like prettier, ignore usage of double quote when escaping single quote.
      quotes: ['warn', 'single', { avoidEscape: true }],
      // Widely used, just make sure
      //'@typescript-eslint/no-non-null-assertion': 'off'

      // Although true, it make it explicit to the reader that we are using a said variable as a boolean.
      // `!!myVar` give us the safety that it will be treated as a boolean and avoid subtle issues in some cases.
      'no-extra-boolean-cast': 'off',

      // Using `<MyType>{}` is different from `{} as MyType`, so I disagree with this rule.
      // The first one gives you type completion. There is a subtle difference in their meaning that
      // I won't take 20 lines to explain.
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  {
    files: ['**/*.test.ts'], // Apply to test files only
    // Disable these rules for test files
    rules: {
      // Passing mock around necessitate to ignore typing.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  includeIgnoreFile(gitignorePath),
  // In addition of .gitignore
  {
    ignores: ['.husky', '.github', '.idea', '/config', '\\draft'],
  }
);
