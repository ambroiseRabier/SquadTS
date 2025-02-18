import { Logger } from 'pino';

/**
 * If `baseDelay = 1000ms (1 second)` (it is), and the following retry attempts are made:
 * - Retry 1: `1000ms ± jitter` → 1.2 seconds
 * - Retry 2: `2000ms ± jitter` → 2.8 seconds
 * - Retry 3: `4000ms ± jitter` → 4.1 seconds
 * - Retry 4: `8000ms ± jitter` → 9.3 seconds
 * - Retry 5: `16000ms ± jitter` → 18.5 seconds
 * 6 32sec
 * 7 64sec
 * 8 2min8sec
 * 9 4min16sec
 * 10 8min32sec
 * 11 17min4sec
 * 12 34min8sec
 *
 * Some will run SquadTS of their personal computer, so you may want to give plenty of time for retries.
 * (note: not sure how RCON behaves in case of internet loss...)
 * 12 attempts will be about 1h.
 */
export async function retryWithExponentialBackoff(
  task: () => Promise<unknown>,
  maxRetries: number,
  logger: Logger,
  stopRequested: () => boolean,
  condition: (error: unknown) => boolean
) {
  const baseDelay = 1000; // Start with a 1-second delay in milliseconds
  let attempt = 0;

  while (attempt <= maxRetries) {
    if (stopRequested()) {
      logger.info('Stop requested, exiting retryWithExponentialBackoff...');
      return;
    }

    try {
      return await task(); // Attempt the task
    } catch (err) {
      // Do not retry if doesn't pass condition
      if (!condition(err)) {
        throw err;
      }

      logger.error(`Error in retryWithExponentialBackoff: ${(err as Error)?.message}`);
      if (attempt === maxRetries) {
        throw new Error(`Max retries reached: ${attempt} ${(err as Error)?.message}`);
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);

      // Adding jitter helps mitigate the **thundering herd problem**, where multiple clients
      // retry at the same predictable intervals and overwhelm the resource you're trying to communicate with.
      //
      // Add jitter by randomizing the delay (e.g., up to ±50%)
      const jitter = Math.random(); // A random value between 0 and 1
      const jitteredDelay = delay * (0.5 + jitter); // Random delay within 50-150% of the calculated delay

      logger.info(`Retrying (attempt ${attempt + 1}) in ${(jitteredDelay / 1000).toFixed(2)}s...`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));

      attempt++;
    }
  }
}
