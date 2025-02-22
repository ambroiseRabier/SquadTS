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
