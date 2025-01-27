import path from 'node:path';
import TailModule from 'tail';
import { LogParserConfig } from './log-parser.config';
import { filter, map, Subject, tap } from 'rxjs';
import { Logger } from 'pino';
import { parse } from 'date-fns';
import { SFTPTail } from '../ftp-tail/sftp-tail';
import { FTPTail } from '../ftp-tail/ftp-tail';
import { Base } from '../rcon/chat-processor';
import { parseWithRules } from './parse-with-rules';


// const rules = {
//   adminBroadcast: {
//
//     regex: /LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)/,
//     refine: ({message, from}: Record<string, string>) => ({
//       message,
//       from
//     })
//   }
// } as const;
//
// Utility type to extract named capturing groups from a regex string
// Ex: "<?name>.<?ext>" will give "name" | "ext"
type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;
//
// const rules2 = {
//   adminBroadcast: "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"
// } as const;
//
export type ObjectFromRegexStr<T extends string> = {
  [K in ExtractGroupNames<T>]: string;
};
//
// type ExtractGroupNames<T extends string> =
//   T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
//     ? GroupName | ExtractGroupNames<Rest>
//     : never;
//
// export type ObjectFromRegexStr<T extends string> = {
//   [K in ExtractGroupNames<T>]: string;
// };
//
// // type CasesToEvents<TCases extends Record<string, string>, AdditionalData> = {
// //   [K in keyof TCases]: Subject<
// //     UnionToObject<ExtractGroupNames<TCases[K]>> & Base & AdditionalData
// //   >;
// // };
// type CasesToEvents<TCases extends Record<string, string>> = {
//   [K in keyof TCases]: ObjectFromRegexStr<TCases[K]>;
// };
//
//
// const rules4 = Object.fromEntries(Object.entries(rules2)
//   .map(([eventName, regex]) => {
//     return [eventName, (line: string) => (new RegExp(regex).exec(line)?.groups as ObjectFromRegexStr<typeof regex>)]
//   })) as any as CasesToEvents<typeof rules2>




// const rules5 = [
//   ["adminBroadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"]
// ] as const;
//
// // const ss: typeof rules5[number][number] = rules5;
//
// const rules6 = rules5.map(([eventName, regex]) => {
//   return [eventName, (line: string) => (new RegExp(regex).exec(line)?.groups as ObjectFromRegexStr<typeof regex>)]
// }).flat();
//
//
// const r7 = Object.fromEntries(rules6);
// r7.




// function regexToGroups(regex: string, line: string): {
//   return new RegExp(regex).exec(line)?.groups;
// }


// type SS = {
//   adminBroadcast: Subject<{ message: string; from: string; }>;
// };
//
// export interface Rule {
//   regex: RegExp;
//   onMatch: (match: RegExpExecArray) => void; // todo wip structure
// }

type LogParserRules = typeof logParserRules;

/**
 * Replace "as const" in parseLogLine, it give a more narrow type to properly narrow
 * the relationship between the first element of each tuple (the event name) and its corresponding regex type.
 *
 * In other words, we are saying that "adminBroadcast" will never be mixed with the object outputted from regex
 * for "roundEnded" or "roundWinner".
 *
 * example of inferred type:
 *
 * type Example =
 *   | readonly ["adminBroadcast", { message: string; from: string }]
 *   | readonly ["roundEnded", Record<string, never>] // No named groups in the regex
 *   | readonly ["roundWinner", { winner: string; layer: string }]
 *   | readonly ["serverTickRate", { tickRate: string }]; // tickRate is still string here
 *
 * Instead of (wrong one, received with just `as const` in parseLogLine instead of this type):
 *
 * type Example =
 *   readonly [
 *     "adminBroadcast" | "roundEnded" | "roundWinner" | "serverTickRate",
 *     { message: string; from: string }
 *       | Record<string, never>
 *       | { winner: string; layer: string }
 *       | { tickRate: string }
 *   ]
 *
 */
type ParseLogLineReturn = {
  [K in LogParserRules[number] as K[0]]: readonly [
    K[0],
    ObjectFromRegexStr<K[1]>
  ];
}[LogParserRules[number][0]];

function parseLogLine(rules: Rules, line: string) {
  for (const [eventName, regex] of rules) {
    const match = new RegExp(regex).exec(line);
    if (match) {
      return [
        eventName,
        match.groups! as ObjectFromRegexStr<typeof regex>,
      ] as ParseLogLineReturn;
    } else {
      return null;
    }
  }
}

/**
 * Another typing magic function that allows us to pass from
 *
 *   events.subscribe(([eventName, lineObj]) => {
 *     if (eventName === 'roundWinner') {
 *       lineObj.message; // not ok
 *       lineObj.winner; // ok
 *     }
 *     if (eventName === 'adminBroadcast') {
 *       lineObj.message // ok
 *       lineObj.from // ok
 *     }
 *     if (eventName === 'roundEnded') {
 *       lineObj.winner // not ok
 *     }
 *     if (eventName === 'serverTickRate'){
 *       lineObj.tickRate // ok
 *     }
 *   })
 *
 *   to
 *
 *    adminBroadcast: events.pipe(
 *      filter((obj) => isEvent(obj,'adminBroadcast')),
 *      map(([eventName, lineObj]) => lineObj) // !! Correctly inferred thanks to isEvent !
 *    ),
 *
 *
 * @param event
 * @param type
 */
function isEvent<T extends ParseLogLineReturn["0"]>(
  event: ParseLogLineReturn,
  type: T
): event is Extract<ParseLogLineReturn, readonly [T, any]> {
  return event[0] === type;
}



export const logParserRules = [
  ["adminBroadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"],
  ["roundEnded", "^\\[([0-9.:-]+)]\\[([ 0-9]*)]LogGameState: Match State Changed from InProgress to WaitingPostMatch"],
  ["roundWinner", "LogSquadTrace: \\[DedicatedServer](?:ASQGameMode::)?DetermineMatchWinner\\(\\): (?<winner>.+) won on (?<layer>.+)"],
  ["serverTickRate", "LogSquad: USQGameState: Server Tick Rate: (?<tickRate>[0-9.]+)"],
] as const;
const rules2 = [
  ["adminBrodadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"],
  ["roundEndded", "^\\[([0-9.:-]+)]\\[([ 0-9]*)]LogGameState: Match State Changed from InProgress to WaitingPostMatch"],
] as const;

type Rules = typeof logParserRules;

export type LogParser = ReturnType<typeof useLogParser>;

export function useLogParser(logger: Logger, options: LogParserConfig, rules: Rules) {
  const queue = new Subject<string>();
  const filePath = path.resolve(options.logFile);
  const logReader = getLogReader(filePath, options);

  logReader.on('line', queue.next);
  const events = queue.pipe(
    tap(line => {
      logger.trace(`Matching on line: ${line}`);
    }),
    map(line => {
      const regex = /^\[(?<date>[0-9.:-]+)]\[(?<chainID>[ 0-9]*)](?<content>.*)/;
      const matchDate = regex.exec(line);

      if (!matchDate) {
        logger.warn(`Log with no date: ${line}`); // todo often ? should be ignored or not ?
        return null;
      }

      const {date, chainID, data} = matchDate.groups!;

      return {
        date: parse(date, 'YYYY.MM.DD-hh.mm.ss:SSS', new Date(Date.UTC(0, 0))),
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
      const obj = parseLogLine(rules, lineObj.data);

      if (!obj) {
        logger.warn(`No match on line: ${lineObj.data}`); // todo: often ? is there a lot we should ignore, or not ?
      } else {
        logger.trace(`Match on line: ${lineObj.data}`);
      }

      return obj;
    }),
    filter((obj): obj is NonNullable<typeof obj> => !!obj), // todo: see above
    tap(match => {


      // this.linesPerMinute++;
    }),

  )
  //
  // const events = {
  //   adminBroadcast: new Subject<{ message: string; from: string; }>(),
  // }

  events.subscribe(([eventName, lineObj]) => {
    // eventName === ''
    if (eventName === 'roundWinner') {
      lineObj.message; // pas bon
      lineObj.winner; // bon
    }
    if (eventName === 'adminBroadcast') {
      lineObj.message // bon
      lineObj.from // bon
    }
    if (eventName === 'roundEnded') {
      lineObj.winner // pas bon
    }
    if (eventName === 'serverTickRate'){
      lineObj.tickRate
    }
  })



  return {
    events: {
      adminBroadcast: events.pipe(
        filter((obj) => isEvent(obj,'adminBroadcast')),
        map(([eventName, lineObj]) => lineObj)
      ),
    }, // todo: this replace EventEmitter .on('...', ...)
    watch: async () => {
      logger.info(`Attempting to watch log file at "${filePath}"...`);
      await logReader.watch();
      logger.info(`Watching log file.`);
    },
    unwatch: async () => {
      await logReader.unwatch();
    }
  };
}


function getLogReader(filePath: string, options: LogParserConfig) {
  switch (options.mode) {
    case 'tail':
      return new TailModule.Tail(filePath, {
        useWatchFile: true
      });
    case 'sftp':
      return new SFTPTail({
        sftp: options.sftp,
        filepath: options.logFile,
        fetchInterval: options.sftp.fetchInterval,
        tailLastBytes: options.sftp.maxTempFileSize,
      });
    case 'ftp':
      return new FTPTail({
        filepath: options.logFile,
        ftp: options.ftp,
        fetchInterval: options.ftp.fetchInterval,
        tailLastBytes: options.ftp.maxTempFileSize,
      });
    default:
      throw new Error(`Invalid mode: ${options.mode}`);
  }
}
