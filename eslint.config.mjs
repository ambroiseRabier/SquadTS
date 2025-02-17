// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  // Maybe we revert to this one if too strict, based on https://typescript-eslint.io/getting-started:
  // tseslint.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  eslintConfigPrettier,
  {
    rules: {
      quotes: ['warn', 'single'],
    },
  }
);
