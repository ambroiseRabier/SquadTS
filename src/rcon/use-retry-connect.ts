import { Logger } from 'pino';
import { Rcon } from './use-rcon';

const MAX_CONNECT_RETRY = 4; // keep it low.

interface Props {
  logger: Logger;
  logResumePendingExecutes: () => void;
  resumePendingExecuteCallbacks: () => void;
  connect: Rcon['connect'];
  cleanUp: () => void;
}

// Note: not easy to decouple from use-rcon.
/**
 * Handle the biggest part of retrying to connect.
 */
export function useRetryConnect(
  {logger, logResumePendingExecutes, resumePendingExecuteCallbacks, connect, cleanUp}: Props,
) {
  let retryComplete: Promise<void> | undefined;
  let retryTimeout: NodeJS.Timeout | undefined = undefined;

  /**
   * onError will be called when a packet is sent but fail due to absence of internet connection.
   * Maybe also if the Squad server is restarting.
   */ // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function retryConnect() {
    let resolveRetry: ((value: void | PromiseLike<void>) => void) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let rejectRetry: ((reason?: any) => void) | undefined;
    let retryCount = 0;
    let retryDelay = 5;

    if (retryComplete) {
      throw new Error('Unexpected: another retry in progress or previous retry improperly cleanup.');
    }

    retryComplete = new Promise<void>((resolve, reject) => {
      resolveRetry = resolve;
      rejectRetry = reject;
    });

    // Start retrying:
    onRetryFail();

    function onRetrySuccess() {
      if (!resolveRetry) {
        throw new Error('Unexpected: resolveRetry is not set');
      }

      // Recreate missing Socket requests that some pending RCON requests await.
      // (since socket closed, assume server will not send response of previous socket through the new socket)
      resumePendingExecuteCallbacks();

      // Tell pending RCON requests that they can proceed with being sent through the Socket.
      logResumePendingExecutes();
      resolveRetry();


      // Cleanup
      retryComplete = undefined;
      resolveRetry = undefined;
      rejectRetry = undefined;
    }

    /**
     * Retry to connect.
     * Keep in mind that:
     * - SquadTS often call for ListPlayers, ListSquads, ShowServerInfo
     * - Plugins may directly call RCON execute
     * - RCON game modifying command like warn may not make sense to players if sent too late.
     *
     * With that in mind, we are retrying on a "short" period of time because
     * we do not want too many pending RCON requests.
     * Ideally, you should combine with docker "restart: unless-stopped" (or equivalent)
     * to handle long period of disconnect.
     */
    function onRetryFail() {
      if (retryCount < MAX_CONNECT_RETRY) {
        // Visual shown 1/4 instead of 0/4 as this is what we are used to.
        logger.info(
          `Retrying in ${retryDelay} seconds (attempt ${retryCount+1}/${MAX_CONNECT_RETRY})...`
        );
        // May need to be more coherent with how log with FTP work...
        retryCount++;
        retryTimeout = setTimeout(async () => {
          // It should not error due to failed auth, since we already passed once.
          // But it can error due to absence of internet connection (again)
          try {
            await connect();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (error: any) {
            if (error?.message === 'Authentication failed.') {
              logger.fatal(
                'Failed to reconnect to RCON server, authentification failed, did the password change ?'
              );
            }
            logger.info('Connect attempt failed.');
            onRetryFail(); // Keep retrying until retryCount is too high.
            return;
          }

          onRetrySuccess();
        }, retryDelay * 1000);
        // This may result in strange behavior of spammed rcon warn ?
        retryDelay *= 2; // 5, 10, 20, 40, (80)
      } else {
        onAllRetryFail();
      }
    }

    function onAllRetryFail() {
      if (!rejectRetry) {
        throw new Error('Unexpected: rejectRetry is not set');
      }

      // Reject all pending RCON requests
      // (maybe we shouldn't, all this likely send errors all over the place ?), let them hang ?
      // todo: test above
      rejectRetry(new Error('RCON connect max retry reached, giving up.'));

      // Cleanup retryComplete, or it will keep buffering requests.
      retryComplete = undefined;
      resolveRetry = undefined;
      rejectRetry = undefined;

      // Annonce failure, cleanup locally, re-throw so the rest of the app can cleanup as well.
      logger.error('Max retry reached, giving up.');
      cleanUp();
      // Likely this will call disconnect which will call cleanUp...
      // Maybe I make something better than relying on UncaughtError in main.mts ?
      throw new Error('RCON disconnected after max retry reached.');
    }
  }

  return {
    get retryComplete() {
      // Use a getter to make sure value is never stale.
      return retryComplete;
    },
    get retryTimeout() {
      // Use a getter to make sure value is never stale.
      return retryTimeout;
    },
    retryConnect
  };
}
