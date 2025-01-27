const rules22 = [
  ["adminBroadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"]
] as const;

export function parseLogLine(rules: readonly [string, string][], line: string) {
  for (const [eventName, regex] of rules) {
    const match = new RegExp(regex).exec(line);
    if (match) {
      return [
        eventName,
        match.groups!,
      ];
    } else {
      return null;
    }
  }
}
