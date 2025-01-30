import { LogParserConfig } from './log-parser.config';
import { filter, map, share, Subject, tap } from 'rxjs';
import { Logger } from 'pino';
import { parse } from 'date-fns';
import { logParserRules } from './rules';
import { isEvent, parseLogLine } from './log-parser-helpers';
import { LogReader } from './use-log-reader';
import { LoggerOptions } from '../logger/logger.config';
import { extractIDs } from '../rcon/id-parser';
import { omit } from 'lodash';


export type LogParser = ReturnType<typeof useLogParser>;

export function useLogParser(logger: Logger, logReader: LogReader, options: LogParserConfig, debugLogMatching: LoggerOptions['debugLogMatching']) {
  const queue = new Subject<string>();

  // /!\ Do not simplify it as logReader.on('line', queue.next) or readable errors messages in pipe will go away.
  logReader.on('line', (s) => {
    queue.next(s);
  });
  const events = queue.pipe(
    tap(line => {
      logger.trace(`Matching on line: ${line}`);
    }),
    map(line => {
      const regex = /^\[(?<date>[0-9.:-]+)]\[(?<chainID>[ 0-9]*)](?<data>.*)/;
      const matchDate = regex.exec(line);

      if (!matchDate) {
        logger.warn(`Log with no date: ${line}`); // todo often ? should be ignored or not ?
        return null;
      }

      const {date, chainID, data} = matchDate.groups!;

      return {
        raw: line,
        date: parse(date, 'yyyy.MM.dd-HH.mm.ss:SSS', new Date(Date.UTC(0, 0))),
        chainID: chainID,
        data,
      };
    }),
    filter((value): value is NonNullable<typeof value> => !!value),  // todo never happen ? (see matchDate)
    map(lineObj => {
      // il envoit parsed date et chain id et logParser selon la regex qui touche.
      // selon la regex qui touche, c'est basé sur les résultats du group
      // et il y a semble t-il
      //
      // Bon, je pense que faut reprendre de 0, cpas tres clair ce que ilfait et on dirait des meli melo
      // genre eventStore.session il met des deployable et player dedans, ...
      // je veux prendre des logs, ligne par ligne, et renvoyer un event pour chaque type de log. avec typage de la data.
      // const match = rules.find(rule => rule.regex.exec(content));
      const obj = parseLogLine(logParserRules, lineObj.data);

      if (debugLogMatching.enabled) {

        if (!obj) {
          // ignoreRegexMatch allow us to reduce verboseness of logs we know are not useful to us
          // use with caution because a wrong regex may hide useful information.
          const verbosenessLimiter = !debugLogMatching.ignoreRegexMatch.some((strRegex) => new RegExp(strRegex).test(lineObj.data))
          if (verbosenessLimiter) {
            logger.warn(`No match on line: ${lineObj.raw}`); // todo: often ? is there a lot we should ignore, or not ?
          } // else don't log anything to limit verboseness.
        } else {
          logger.debug(`Match on line: ${lineObj.data}`);
        }
      }


      return obj;
    }),
    filter((obj): obj is NonNullable<typeof obj> => !!obj), // todo: see above
    tap(match => {
      // this.linesPerMinute++;
    }),
    // `share` ensure everything above is called once, regardless of how many downstream subscriptions there are.
    // There is no need to repeat aboves steps for every stream, and we don't want multiple times the same logs.
    share()
  );

  return {
    // Please keep the same order as the rules.
    events: {
      adminBroadcast: events.pipe(
        filter((obj) => isEvent(obj, 'adminBroadcast')),
        map(([eventName, lineObj]) => lineObj)
      ),
      deployableDamaged: events.pipe(
        filter((obj) => isEvent(obj, 'deployableDamaged')),
        map(([eventName, lineObj]) => lineObj)
      ),
      newGame: events.pipe(
        filter((obj) => isEvent(obj, 'newGame')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerConnected: events.pipe(
        filter((obj) => isEvent(obj, 'playerConnected')),
        map(([eventName, lineObj]) => ({
          ...omit(lineObj, ['ids']),
          ...extractIDs(lineObj.ids)
        }))
      ),
      playerDamaged: events.pipe(
        filter((obj) => isEvent(obj, 'playerDamaged')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerDied: events.pipe(
        filter((obj) => isEvent(obj, 'playerDied')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerDisconnected: events.pipe(
        filter((obj) => isEvent(obj, 'playerDisconnected')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerJoinSucceeded: events.pipe(
        filter((obj) => isEvent(obj, 'playerJoinSucceeded')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerPossess: events.pipe(
        filter((obj) => isEvent(obj, 'playerPossess')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerRevived: events.pipe(
        filter((obj) => isEvent(obj, 'playerRevived')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerUnPossess: events.pipe(
        filter((obj) => isEvent(obj, 'playerUnPossess')),
        map(([eventName, lineObj]) => lineObj)
      ),
      playerWounded: events.pipe(
        filter((obj) => isEvent(obj, 'playerWounded')),
        map(([eventName, lineObj]) => lineObj),
        map(data => ({
          ...omit(data, ['attackerIDs']),
          attacker: extractIDs(data.attackerIDs),
        }))
      ),
      roundEnded: events.pipe(
        filter((obj) => isEvent(obj, 'roundEnded')),
        map(([eventName, lineObj]) => lineObj)
      ),
      roundTicket: events.pipe(
        filter((obj) => isEvent(obj, 'roundTicket')),
        map(([eventName, lineObj]) => lineObj)
      ),
      roundWinner: events.pipe(
        filter((obj) => isEvent(obj, 'roundWinner')),
        map(([eventName, lineObj]) => lineObj)
      ),
      serverTickRate: events.pipe(
        filter((obj) => isEvent(obj, 'serverTickRate')),
        map(([eventName, lineObj]) => lineObj)
      ),
    },
    watch: async () => {
      logger.info(`Attempting to watch log file at "${options.logFile}"...`);
      await logReader.watch();
      logger.info(`Watching log file.`);
    },
    unwatch: async () => {
      await logReader.unwatch();
    }
  };
}

