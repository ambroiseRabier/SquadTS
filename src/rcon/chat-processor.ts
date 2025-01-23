import { extractIDs } from './id-parser';
import { omit } from 'lodash';
import { Action } from './action';


// todo: some typing to explain the events send is needed, this may change format.
// unless you can extract group name from regex string as type ?
type Base = {
  raw: string;
  time: Date;
};

type ChatCase = {
  eventName: "CHAT_MESSAGE";
  body: {
    chat: string;
    name: string;
    message: string;
  } & Base;
} | {
  eventName: "POSSESSED_ADMIN_CAMERA";
  convertor: (matches: string[]) => {
    name: string;
  } & Base;
};

// // Utility type to extract named capturing groups from a regex string
// type ExtractCapturedGroups<T extends string> =
//   T extends `${string}(?<${infer Group}>${string})${string}`
//     ? { [K in Group]: string }
//     : never;
//
// type CasesToEvents<TCases extends Record<string, string>> = {
//   [K in keyof TCases]: Action<ExtractCapturedGroups<TCases[K]>>;
// };
//
// export type SquadEvents = CasesToEvents<typeof cases2>;
//
// const cases2 = {
//   CHAT_MESSAGE: "\\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \\[Online IDs:(?<ids>[^\\]]+)\\] (?<name>.+?) : (?<message>.*)",
//
//   POSSESSED_ADMIN_CAMERA: "\\[Online Ids:(?<name>[^\\]]+)\\] (.+) has possessed admin camera\\.",
//
//   UNPOSSESSED_ADMIN_CAMERA: "\\[Online IDs:(?<name>[^\\]]+)\\] (.+) has unpossessed admin camera\\.",
//
//   PLAYER_WARNED: "Remote admin has warned player (?<name>.*)\\. Message was \"(?<reason>.*)\"",
//
//   PLAYER_KICKED: "Kicked player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*)",
//
//   SQUAD_CREATED: "(?<playerName>.+) \\(Online IDs:(?<ids>[^)]+)\\) has created Squad (?<squadID>\\d+) \\(Squad Name: (?<squadName>.+)\\) on (?<teamName>.+)",
//
//   PLAYER_BANNED: "Banned player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*) for interval (?<interval>.*)"
// };


// const evt: CasesToEvents<typeof cases2>;
// evt.POSSESSED_ADMIN_CAMERA.on(payload => {})

// Utility type to extract named capturing groups from a regex string
// Ex: "<?name>.<?ext>" will give "name" | "ext"
type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;

type UnionToObject<T extends string> = {
  [K in T]: string;
};

export type CasesToEvents<TCases extends readonly { eventName: string; pattern: string }[]> = {
  [K in TCases[number] as K["eventName"]]: Action< UnionToObject<ExtractGroupNames<K["pattern"]>> >; // ok
};

export type SquadEvents = CasesToEvents<typeof cases>;


// Notes:
// - We could use a simple Record here, but having idsPrefix make it not possible.
// - We don't use Regex directly (ex:/myregex/) but strings (ex: "myregex"),
// to allow TS to make typing out of the named capturing groups based on the string.
const cases = [
  {
    pattern: "\\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \\[Online IDs:(?<ids>[^\\]]+)\\] (?<name>.+?) : (?<message>.*)",
    eventName: "CHAT_MESSAGE",
  },
  {
    pattern: "\\[Online Ids:(?<name>[^\\]]+)\\] (.+) has possessed admin camera\\.",
    eventName: "POSSESSED_ADMIN_CAMERA",
  },
  {
    pattern: "\\[Online IDs:(?<name>[^\\]]+)\\] (.+) has unpossessed admin camera\\.",
    eventName: "UNPOSSESSED_ADMIN_CAMERA",
  },
  {
    pattern: "Remote admin has warned player (?<name>.*)\\. Message was \\\"(?<reason>.*)\\\"",
    eventName: "PLAYER_WARNED",
  },
  {
    pattern: "Kicked player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*)",
    eventName: "PLAYER_KICKED",
  },
  {
    pattern: "(?<playerName>.+) \\(Online IDs:(?<ids>[^)]+)\\) has created Squad (?<squadID>\\d+) \\(Squad Name: (?<squadName>.+)\\) on (?<teamName>.+)",
    eventName: "SQUAD_CREATED",
    idsPrefix: "player",
  },
  {
    pattern: "Banned player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*) for interval (?<interval>.*)",
    eventName: "PLAYER_BANNED",
  },
] as const;


export function processBody(body: string) {
  for (const c of cases) {
    const { pattern, eventName } = c;
    const idsPrefix = (c as any).idsPrefix;
    const matches = body.match(pattern);
    if (matches) {
      const content = {
        // Add custom fields like message or name depending on pattern it matched.
        ...omit(matches.groups, ['ids']),
        raw: body,
        time: new Date(),
        // matches.groups is not null as we specified group name above
        // It will add steam ID and and eos ID, if `ids` is provided.
        ...(matches.groups!.ids ? extractIDs(matches.groups!.ids, idsPrefix) : undefined)
      };

      // Match found, exit the loop, only one match expected.
      return {
        eventName,
        content
      };
    }
  }
}
