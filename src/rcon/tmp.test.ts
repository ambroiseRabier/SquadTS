import { it } from '@jest/globals';

// Utility type to extract named capturing groups from a regex string
// Ex: "<?name>.<?ext>" will give "name" | "ext"
type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;

type ObjectFromRegexStr<T extends string> = {
  [K in ExtractGroupNames<T>]: string;
};

// type CasesToEvents<TCases extends Record<string, string>, AdditionalData> = {
//   [K in keyof TCases]: Subject<
//     UnionToObject<ExtractGroupNames<TCases[K]>> & Base & AdditionalData
//   >;
// };
type CasesToEvents<TCases extends Record<string, string>> = {
  [K in keyof TCases]: (line: string) => ObjectFromRegexStr<TCases[K]>;
};

it('should ', () => {
  const rules2 = {
    adminBroadcast: "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"
  } as const;

  const rules4 = Object.fromEntries(Object.entries(rules2)
    .map(([eventName, regex]) => {
      return [eventName, (line: string) => (new RegExp(regex).exec(line)?.groups as ObjectFromRegexStr<typeof regex>)]
    })) as any as CasesToEvents<typeof rules2>;

  console.log(rules4);
  console.log(rules4.adminBroadcast('LogSquad: ADMIN COMMAND: Message broadcasted <hello> from <world>'));


  const rules22 = [
    ["adminBroadcast", "LogSquad: ADMIN COMMAND: Message broadcasted <(?<message>.+)> from (?<from>.+)"]
  ] as const;

  const tested = 'LogSquad: ADMIN COMMAND: Message broadcasted <hello> from <world>';
  const r5 = rules22
    .find(([eventName, regex]) => {
      return new RegExp(regex).exec(tested)?.groups;
    });

  // if (r5.length > 0) {
  //   r5[0].
  // }
});

function parseLogLine(rules: readonly [string, string][], line: string) {
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
