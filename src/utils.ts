import path from 'node:path';
import { Observable } from 'rxjs';

/**
 * Same as Partial but also render deeply nested objects properties partial.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Work the same as Awaited but for Observable
 */
export type ObservableValue<T> = T extends Observable<infer V> ? V : never;

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// A plugin had direct access to fs anyway...
export const joinSafeSubPath = (baseDir: string, subPath: string) => {
  // Resolve an absolute path for the resulting path
  const resolvedPath = path.join(baseDir, subPath);

  // Ensure that the resolved path starts with the base directory
  if (resolvedPath.startsWith(path.normalize(baseDir))) {
    return resolvedPath;
  } else {
    // If not, return null or handle it safely
    throw new Error(
      `Resolved: "${resolvedPath}". Invalid subPath "${subPath}" attempting to escape the base directory "${baseDir}"`
    );
  }
};

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param timeoutMessage Optional custom timeout message
 */
export const promiseWithTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};
