import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: "node", // Set test environment to Node.js
  },
  esbuild: {
    // Provide compatibility with TypeScript and modern ESM
    target: "esnext",
  },
});
