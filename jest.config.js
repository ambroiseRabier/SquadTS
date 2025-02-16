/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {

  // preset: 'ts-jest/presets/default-esm',
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1", // Fixes issues with imports carrying .js extensions
  },
};
