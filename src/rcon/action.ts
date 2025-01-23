type Listener<T> = (payload: T) => void;

/**
 * Simple replacement to EventEmitter to not have to play with string constant in NodeJS.
 * It behaves like an Action in C#.
 *
 * Notes:
 * A lesser choice could have been typing EventEmitter like here: https://blog.makerx.com.au/a-type-safe-event-emitter-in-node-js/
 * An overkill choice would be to use RXJS.
 * To avoid conflict with existing Event class, it is name Action.
 */
export class Action<T = void> {
  private listeners: Listener<T>[] = [];
  private oneTimeListeners: Listener<T>[] = [];

  /**
   * Register a listener to be invoked every time the event is emitted
   */
  public on(listener: Listener<T>): () => void {
    this.listeners.push(listener);
    return () => this.removeEventListener(listener);
  }

  /**
   * Register a listener to be invoked only once
   */
  public once(listener: Listener<T>): void {
    this.oneTimeListeners.push(listener);
  }

  /**
   * Remove a specific listener
   */
  public removeEventListener(listener: Listener<T>): void {
    this.listeners = this.listeners.filter(l => l !== listener);
    this.oneTimeListeners = this.oneTimeListeners.filter(l => l !== listener);
  }

  /**
   * Emit (invoke) the event, passing data to all listeners
   */
  public emit(payload: T): void {
    // Call all permanent listeners
    this.listeners.forEach(listener => listener(payload));

    // Call one-time listeners and clear them
    this.oneTimeListeners.forEach(listener => listener(payload));
    this.oneTimeListeners.length = 0;
  }
}
