import { RCONCommand } from '../rcon-squad/rcon-commands';
import { hasChangesIgnoringSinceDisconnect } from './has-change-since-disconnect';
import { Logger } from 'pino';

export function useLogExecute(
  logger: Logger,
  options: { debugCondenseLogs: boolean; debugCondenseLogsIgnoreSinceDisconnect: boolean }
) {
  const cachedResponse = new Map<Lowercase<RCONCommand>, string>();

  function logExecute(command: string, res: string, isProxy = false) {
    const emitDebugLog = (cacheEnabledForCommand = false) =>
      logger.debug(
        `${isProxy ? '(Proxy)' : ''} Command ${cacheEnabledForCommand ? '(logging only when changed)' : ''}: "${command}" --> "${res}"`
      );

    // Condense logs not supported for proxy.
    if (isProxy) {
      emitDebugLog();
      return;
    }

    // Option to reduce verboseness.
    if (options.debugCondenseLogs) {
      // Note: case-insensitive matching.
      const cl = command.match(/^(\w+) ?/);
      if (!cl) {
        throw Error(`Unexpected command (or wrong regex here): ${command}`);
      }
      const baseCommand = cl[1].toLowerCase() as Lowercase<RCONCommand>;
      const cachedRes = cachedResponse.get(baseCommand);

      const emitIfChanged = () => {
        // Not cached, or cached, but res is different.
        if (!cachedRes || (cachedRes && cachedRes !== res)) {
          emitDebugLog(true);
          cachedResponse.set(baseCommand, res);
        }
      };

      switch (baseCommand) {
        case RCONCommand.ListPlayers.toLowerCase():
          // Extra option to further reduce the verboseness, right now, disconnect player are not used at all.
          if (options.debugCondenseLogsIgnoreSinceDisconnect) {
            if (cachedRes) {
              if (hasChangesIgnoringSinceDisconnect(cachedRes, res)) {
                emitDebugLog(true);
                cachedResponse.set(baseCommand, res);
              } // else no change, doesn't emit
            } else {
              // not cached
              emitDebugLog(true);
              cachedResponse.set(baseCommand, res);
            }
          } else {
            // No special behavior for ListPlayers
            emitIfChanged();
          }
          break;
        case RCONCommand.ShowServerInfo.toLowerCase():
        case RCONCommand.ListSquads.toLowerCase():
          emitIfChanged();
          break;
        default:
          emitDebugLog();
      }
    } else {
      emitDebugLog();
    }
  }

  return logExecute;
}
