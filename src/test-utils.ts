import { vi } from 'vitest';

/**
 * If anything is missing (e.g trace), it will silently fail, also having logs helps debug tests (mockImplementation...).
 */
export const createMockLogger = () => ({
  trace: vi.fn().mockImplementation(console.log),
  debug: vi.fn().mockImplementation(console.log),
  info: vi.fn().mockImplementation(console.log),
  warn: vi.fn().mockImplementation(console.warn),
  error: vi.fn().mockImplementation(console.error),
  fatal: vi.fn().mockImplementation(console.error),
});
