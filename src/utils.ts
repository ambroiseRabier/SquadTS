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
  const resolvedPath = path.resolve(baseDir, subPath);

  // Ensure that the resolved path starts with the base directory
  if (resolvedPath.startsWith(baseDir)) {
    return resolvedPath;
  } else {
    // If not, return null or handle it safely
    throw new Error(
      `Invalid subPath (${subPath}) attempting to escape the base directory ${baseDir}`
    );
  }
};
