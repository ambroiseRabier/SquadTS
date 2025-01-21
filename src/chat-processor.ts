
// interface ChatMessage {
//   raw: string;
//   chat: string;
//   name: string;
//   message: string;
//   time: Date;
// }


// interface ChatCase {
//   pattern: RegExp;
//   eventName: string;
//   convertor: (matches: string[]) => Omit<ChatMessage, 'raw' | 'time'>;
//   idsMatchIndex: number;
// }

import { extractIDsLower, iterateIDs, lowerPlatform } from './id-parser';

interface ChatCaseCommon {
  pattern: RegExp;
  idsMatchIndex: number;
}

type ChatCase = {
  eventName: "CHAT_MESSAGE";
  convertor: (matches: string[]) => {
    chat: string;
    name: string;
    message: string;
  };
} | {
  eventName: "POSSESSED_ADMIN_CAMERA";
  convertor: (matches: string[]) => {
    name: string;
  };
};


// todo: name capturing group en regex ?
// todo: event name plus clair, concis, genre enum ? ou const string[] ?
const cases: (ChatCaseCommon & ChatCase)[] = [
  {
    pattern: /\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \[Online IDs:(?<ids>[^\]]+)\] (?<name>.+?) : (?<message>.*)/,
    eventName: "CHAT_MESSAGE",
    // convertor: (matches: string[]) => ({
    //   chat: matches[1],
    //   name: matches[3],
    //   message: matches[4]
    // }),
    // idsMatchIndex: 2
  },
  {
    pattern: /\[Online Ids:([^\]]+)\] (.+) has possessed admin camera\./,
    eventName: "POSSESSED_ADMIN_CAMERA",
    convertor: (matches: string[]) => ({
      name: matches[2],
    }),
    idsMatchIndex: 1
  },
];

export function processBody(body: string) {
  for (const { pattern, eventName, convertor, idsMatchIndex } of cases) {
    const matches = body.match(pattern);
    if (matches) {
      Logger.verbose('SquadRcon', 2, `Matched ${convertToReadableText(eventName)}: ${body}`);

      const result = {
        ...convertor(matches),
        raw: body,
        time: new Date()
      };

      result = {...result, ...extractIDsLower(matches[idsMatchIndex])}

      this.emit(eventName, result);

      return; // Match found, exit the loop
    }
  }
}

// Example: "CHAT_MESSAGE" to "chat message"
function convertToReadableText(input: string): string {
  return input
    .toLowerCase()
    .split('_')
    .join(' ');
}
