import { extractIDsLower } from './id-parser';
import { omit } from 'lodash';


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


// todo: event name plus clair, concis, genre enum ? ou const string[] ?
const cases = [
  {
    pattern: /\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:(?<ids>[^\]]+)\] (?<name>.+?) : (?<message>.*)/,
    eventName: "CHAT_MESSAGE"
  },
  {
    pattern: /\[Online Ids:(?<name>[^\]]+)\] (.+) has possessed admin camera\./,
    eventName: "POSSESSED_ADMIN_CAMERA"
  },
  {
    pattern: /\[Online IDs:(?<name>[^\]]+)\] (.+) has unpossessed admin camera\./,
    eventName: "UNPOSSESSED_ADMIN_CAMERA"
  },
  {
    pattern: /Remote admin has warned player (?<name>.*)\. Message was "(?<reason>.*)"/,
    eventName: "PLAYER_WARNED"
  },
  {
    pattern: /Kicked player (?<playerID>[0-9]+)\. \[Online IDs=(?<ids>[^\]]+)\] (?<name>.*)/,
    eventName: "PLAYER_KICKED"
  },
  {
    pattern: /(?<playerName>.+) \(Online IDs:(?<ids>[^)]+)\) has created Squad (?<squadID>\d+) \(Squad Name: (?<squadName>.+)\) on (?<teamName>.+)/,
    eventName: "SQUAD_CREATED"
  },
  {
    pattern: /Banned player (?<playerID>[0-9]+)\. \[Online IDs=(?<ids>[^\]]+)\] (?<name>.*) for interval (?<interval>.*)/,
    eventName: "PLAYER_BANNED"
  },
];

export function processBody(body: string) {
  for (const { pattern, eventName } of cases) {
    const matches = body.match(pattern);
    if (matches) {
      const content = {
        // Add custom fields like message or name depending on pattern it matched.
        ...omit(matches.groups, ['ids']),
        raw: body,
        time: new Date(),
        // matches.groups is not null as we specified group name above
        // It will add steam ID and and eos ID, if `ids` is provided.
        ...(matches.groups!.ids ? extractIDsLower(matches.groups!.ids) : undefined)
      };

      // Match found, exit the loop, only one match expected.
      return {
        eventName,
        content
      };
    }
  }
}
