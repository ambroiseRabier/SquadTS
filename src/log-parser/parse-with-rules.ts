import { ObjectFromRegexStr } from './use-log-parser';

/**
 * @param rules e.g: const rules = [
 *   ["adminBroadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"],
 *   ["roundEnded", "^\\[([0-9.:-]+)]\\[([ 0-9]*)]LogGameState: Match State Changed from InProgress to WaitingPostMatch"],
 * ] as const;
 * @param line
 */
export function parseWithRules<T extends ReadonlyArray<readonly [string, string]>>(rules: T, line: string) {
  for (const [eventName, regex] of rules) {
    const match = new RegExp(regex).exec(line);
    if (match) {
      return [
        eventName,
        match.groups! as ObjectFromRegexStr<typeof regex>,
      ] as const;
    } else {
      return null;
    }
  }
}
