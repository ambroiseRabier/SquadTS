import { LogParserRules } from './rules';

/**
 * Utility type to extract named capturing groups from a regex string
 * Ex: "<?name>.<?ext>" will give "name" | "ext"
 */
type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;

/**
 * Ex: "<?name>.<?ext>" will give `{ name: string; ext: string; }`
 */
export type ObjectFromRegexStr<T extends string> = {
  [K in ExtractGroupNames<T>]: string;
};

// todo plusieurs endroit ou on peut refactor avec cela.
export function matchWithRegex<T extends string>(
  body: string,
  regexStr: T
): ObjectFromRegexStr<T> | null {
  // If needed we can cache the regex in a Map, to avoid GC.
  const match = (new RegExp(regexStr)).exec(body);
  return match ? (match.groups as ObjectFromRegexStr<T>) : null;
}

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
export type LogEventUnion = {
  [K in LogParserRules[number] as K[0]]: readonly [
    K[0],
    ObjectFromRegexStr<K[1]>
  ];
}[LogParserRules[number][0]];

export function parseLogLine(rules: LogParserRules, line: string) {
  for (const [eventName, regex] of rules) {
    const match = new RegExp(regex).exec(line);
    if (match) {
      return [
        eventName,
        match.groups! as ObjectFromRegexStr<typeof regex>,
      ] as LogEventUnion;
    }
  }

  return null;
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
export function isEvent<T extends LogEventUnion["0"]>(
  event: LogEventUnion,
  type: T
): event is Extract<LogEventUnion, readonly [T, any]> {
  return event[0] === type;
}
