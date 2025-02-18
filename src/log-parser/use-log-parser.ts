import { LogParserConfig } from './log-parser.config';
import { filter, map, share, Subject, tap } from 'rxjs';
import { Logger } from 'pino';
import { parse } from 'date-fns';
import { logParserRules } from './rules';
import { isEvent, parseLogLine } from './log-parser-helpers';
import { LogReader } from './use-log-reader';
import { LoggerOptions } from '../logger/logger.config';
import { extractIDs } from '../rcon/id-parser';
import { omit } from 'lodash-es';

export type LogParser = ReturnType<typeof useLogParser>;

export function useLogParser(
  logger: Logger,
  logReader: LogReader,
  options: LogParserConfig,
  debugLogMatching: LoggerOptions['debugLogMatching']
) {
  // Note: If you ever use a `new Date()`, be aware that server time may be offset by a few minutes :/
  // Also squad server time most likely is GMT+0, but you have to double check
  const queue = new Subject<string>();
  let skipOnceIfNoDate = true;
  let emitLogs = true;

  // Note: you can call that before or right after logReader watch, this will give the same result, as logReader
  //       needs some extra time to download the logs while listening to an eventEmitter is instant...
  //       So no point touching this line for debugEmitFirstDownloadedLogs
  logReader.line$.pipe(filter(line => emitLogs)).subscribe((line: string) => {
    queue.next(line);
  });

  const events = queue.pipe(
    tap(line => {
      logger.trace(`Receiving: ${line}`);

      if (line.includes('DEBUG: [LogParser]')) {
        logger.warn(
          'If this is a test, you most likely forgot to remove "DEBUG: [LogParser]" from the log !'
        );
      }
    }),
    map(line => {
      const regex = /^\[(?<date>[0-9.:-]+)]\[ *(?<chainID>[ 0-9]*)](?<data>.*)/;
      const matchDate = regex.exec(line);

      // On startup, we may not start reading the server log file at a line start. Ending up with an incomplete line.
      // Just ignore it and start processing from second line.
      if (!matchDate) {
        if (skipOnceIfNoDate) {
          skipOnceIfNoDate = false;
        } else {
          // Happens:
          // - at startup of the server.
          // - Seemingly when others RCON send commands ?
          // - Once at the start of logReader, as the first log is incomplete.
          logger.trace(
            `Log with no date (will be ignored) ${line.length === 0 ? '(log is empty)' : ''}: ${line}`
          );
        }
        return null;
      }

      const { date, chainID, data } = matchDate.groups!;

      return {
        raw: line,
        date: parse(date, 'yyyy.MM.dd-HH.mm.ss:SSS', new Date(Date.UTC(0, 0))),
        chainID: chainID,
        data,
      };
    }),
    filter((value): value is NonNullable<typeof value> => !!value),
    map(lineObj => {
      const obj = parseLogLine(logParserRules, lineObj.data, {
        date: lineObj.date,
        chainID: lineObj.chainID,
      });

      if (debugLogMatching.showNonMatching && !obj) {
        // ignoreRegexMatch allow us to reduce verboseness of logs we know are not useful to us
        // use with caution because a wrong regex may hide useful information.
        const verbosenessLimiter = !debugLogMatching.ignoreRegexMatch.some(strRegex =>
          new RegExp(strRegex).test(lineObj.data)
        );
        if (verbosenessLimiter) {
          logger.warn(`No match on line: ${lineObj.raw}`);
        } // else don't log anything to limit verboseness.
      } else if (debugLogMatching.showMatching) {
        logger.debug(`Match on line: ${lineObj.data}`);
      }

      // return [obj, {
      //   date: lineObj.date,
      //   chainId: lineObj.chainID
      // }] as const;
      return obj;
    }),
    // Filter out non matching line, having a tuple make things less visible, but we are just checking `obj` from above
    // filter((tuple): tuple is [NonNullable<typeof tuple[0]>, typeof tuple[1]] => !!tuple[0]),
    filter((obj): obj is NonNullable<typeof obj> => !!obj),
    tap(([eventName, lineObj, metadata]) => {
      const keys1 = Object.keys(lineObj ?? {}); // roundEnded has no groups.
      const keys2 = Object.keys(metadata);
      const commonKey = keys1.some(key => keys2.includes(key));
      if (commonKey) {
        throw new Error(
          'Regex named groups and metadata keys overlap. "date" and "chainID" are reserved.'
        );
      }
    }),
    // tap(match => {
    //   // this.linesPerMinute++;
    // }),
    // `share` ensure everything above is called once, regardless of how many downstream subscriptions there are.
    // There is no need to repeat aboves steps for every stream, and we don't want multiple times the same logs.
    share()
  );

  return {
    // Please keep the same order as the rules.
    events: {
      adminBroadcast: events.pipe(
        filter(obj => isEvent(obj, 'adminBroadcast')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      deployableDamaged: events.pipe(
        filter(obj => isEvent(obj, 'deployableDamaged')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      loginRequest: events.pipe(
        filter(obj => isEvent(obj, 'loginRequest')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      newGame: events.pipe(
        filter(obj => isEvent(obj, 'newGame')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      playerAddedToTeam: events.pipe(
        filter(obj => isEvent(obj, 'playerAddedToTeam')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      playerConnected: events.pipe(
        filter(obj => isEvent(obj, 'playerConnected')),
        map(([eventName, lineObj, metadata]) => ({
          ...omit(lineObj, ['ids']),
          ...extractIDs(lineObj.ids),
          ...metadata,
        }))
      ),
      playerDamaged: events.pipe(
        filter(obj => isEvent(obj, 'playerDamaged')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        // Filter out bots
        filter(data => data.attackerNameWithClanTag !== 'nullptr'),
        map(data => ({
          ...omit(data, [
            'attackerIDs',
            'attackerController',
            'attackerNameWithClanTag',
            'victimNameWithClanTag',
          ]),
          attacker: {
            ...extractIDs(data.attackerIDs),
            controller: data.attackerController,
            nameWithClanTag: data.attackerNameWithClanTag,
          },
          victim: {
            nameWithClanTag: data.victimNameWithClanTag,
          },
        }))
      ),
      playerDied: events.pipe(
        filter(obj => isEvent(obj, 'playerDied')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        map(data => ({
          ...omit(data, ['attackerIDs', 'attackerController', 'victimNameWithClanTag']),
          attacker: {
            ...extractIDs(data.attackerIDs),
            controller: data.attackerController,
          },
          victim: {
            nameWithClanTag: data.victimNameWithClanTag,
          },
        }))
      ),
      playerDisconnected: events.pipe(
        filter(obj => isEvent(obj, 'playerDisconnected')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      playerInitialized: events.pipe(
        filter(obj => isEvent(obj, 'playerInitialized')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      playerJoinSucceeded: events.pipe(
        filter(obj => isEvent(obj, 'playerJoinSucceeded')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      playerPossess: events.pipe(
        filter(obj => isEvent(obj, 'playerPossess')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        map(data => ({
          ...omit(data, ['ids']),
          ...extractIDs(data.ids),
        }))
      ),
      playerRevived: events.pipe(
        filter(obj => isEvent(obj, 'playerRevived')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        map(data => ({
          reviver: {
            ...extractIDs(data.reviverIDs),
            nameWithClanTag: data.reviverNameWithClanTag,
          },
          revived: {
            ...extractIDs(data.revivedIDs),
            nameWithClanTag: data.revivedNameWithClanTag,
          },
        }))
      ),
      playerUnPossess: events.pipe(
        filter(obj => isEvent(obj, 'playerUnPossess')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        map(data => ({
          ...omit(data, ['ids']),
          ...extractIDs(data.ids),
        }))
      ),
      playerWounded: events.pipe(
        filter(obj => isEvent(obj, 'playerWounded')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        })),
        // Filter out bots
        filter(data => data.attackerController !== 'nullptr'),
        map(data => ({
          ...omit(data, ['attackerIDs', 'attackerController', 'victimNameWithClanTag', 'damage']),
          damage: parseFloat(data.damage),
          attacker: {
            ...extractIDs(data.attackerIDs),
            controller: data.attackerController,
          },
          victim: {
            nameWithClanTag: data.victimNameWithClanTag,
          },
        }))
      ),
      roundEnded: events.pipe(
        filter(obj => isEvent(obj, 'roundEnded')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      roundTicket: events.pipe(
        filter(obj => isEvent(obj, 'roundTicket')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
      serverTickRate: events.pipe(
        filter(obj => isEvent(obj, 'serverTickRate')),
        map(([eventName, lineObj, metadata]) => ({
          ...lineObj,
          ...metadata,
        }))
      ),
    },
    setEmitLogs(_emitLogs: boolean) {
      emitLogs = _emitLogs;
    },
    watch: async () => {
      logger.info(`Attempting to watch log file at "${options.logFile}"...`);
      try {
        await logReader.watch();
      } catch (e) {
        logger.error(
          `Error while watching log file: ${(e as Error)?.message}\n ${(e as Error)?.stack}`
        );
        throw e;
      }
      logger.info('Watching log file.');
    },
    unwatch: async () => {
      await logReader.unwatch();
    },
  };
}
