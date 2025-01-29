export interface Plugin {
  mount(): Promise<void>;
  unmount(): Promise<void>;
}
