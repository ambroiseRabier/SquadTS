import { extractIDs } from './id-parser';
import { omit } from 'lodash';
import { Subject } from 'rxjs';


export type Base = {
  raw: string;
  time: Date;
} & ReturnType<typeof extractIDs>;

// Utility type to extract named capturing groups from a regex string
// Ex: "<?name>.<?ext>" will give "name" | "ext"
type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;

type UnionToObject<T extends string> = {
  [K in T]: string;
};

type CasesToEvents<TCases extends Record<string, string>, AdditionalData> = {
  [K in keyof TCases]: Subject<
    UnionToObject<ExtractGroupNames<TCases[K]>> & Base & AdditionalData
  >;
};


export type SquadEvents<AdditionalData = {}> = CasesToEvents<typeof cases, AdditionalData>;


// Notes:
// - We don't use Regex directly (ex:/myregex/) but strings (ex: "myregex"),
// to allow TS to make typing out of the named capturing groups based on the string.
// Recommend to use a tool like Regex101 to edit.
const cases = {
  CHAT_MESSAGE: "\\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \\[Online IDs:(?<ids>[^\\]]+)\\] (?<name>.+?) : (?<message>.*)",

  POSSESSED_ADMIN_CAMERA: "\\[Online Ids:(?<name>[^\\]]+)\\] (.+) has possessed admin camera\\.",

  UNPOSSESSED_ADMIN_CAMERA: "\\[Online IDs:(?<name>[^\\]]+)\\] (.+) has unpossessed admin camera\\.",

  PLAYER_WARNED: "Remote admin has warned player (?<name>.*)\\. Message was \"(?<reason>.*)\"",

  PLAYER_KICKED: "Kicked player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*)",

  SQUAD_CREATED: "(?<playerName>.+) \\(Online IDs:(?<ids>[^)]+)\\) has created Squad (?<squadID>\\d+) \\(Squad Name: (?<squadName>.+)\\) on (?<teamName>.+)",

  PLAYER_BANNED: "Banned player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*) for interval (?<interval>.*)"
} as const; // as const really important to get typing from named capture groups in regex

export const events = Object.keys(cases);


export function processBody(body: string) {
  for (const [eventName, pattern] of Object.entries(cases)) {
    const matches = body.match(pattern);
    if (matches) {
      const content = {
        // Add custom fields like message or name depending on pattern it matched.
        ...omit(matches.groups, ['ids']),
        raw: body,
        time: new Date(),
        // matches.groups is not null as we specified group name above
        // It will add steam ID and and eos ID, if `ids` is provided.
        ...(matches.groups!.ids ? extractIDs(matches.groups!.ids) : undefined)
      };

      // Match found, exit the loop, only one match expected.
      return {
        eventName,
        content
      };
    }
  }
}
