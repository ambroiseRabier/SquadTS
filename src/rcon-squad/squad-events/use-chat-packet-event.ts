import { filter, map, share, Subject } from 'rxjs';
import { omit } from 'lodash-es';
import { Logger } from 'pino';
import { matchWithRegex } from '../../log-parser/log-parser-helpers';
import { extractIDs } from '../../rcon/id-parser';

export function useChatPacketEvent(logger: Logger, chatPacketEvent: Subject<string>) {
  const message = chatPacketEvent.pipe(
    map(body =>
      matchWithRegex(
        body,
        '\\[(?<chat>ChatAll|ChatTeam|ChatSquad|ChatAdmin)] \\[Online IDs:(?<ids>[^\\]]+)\\] (?<name>.+?) : (?<message>.*)'
      )
    ),
    filter((groups): groups is NonNullable<typeof groups> => !!groups),
    map(groups => ({
      ...omit(groups, ['ids']),
      player: extractIDs(groups.ids),
    })),
    map(addTime),
    share()
  );

  return {
    // todo: should chatMessage event ignore commands ?
    message,
    command: message.pipe(
      map(data => {
        const match = data.message.match(/!(?<command>[^ ]+) ?(?<message>.*)/);
        if (match) {
          return {
            ...data,
            // re-add the '!' as it is easier to identify as a command and plugin config usually include it.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            command: '!' + match.groups!.command.toLowerCase(),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            message: match.groups!.message.trim(),
          };
        } else {
          return null;
        }
      }),
      filter((obj): obj is NonNullable<typeof obj> => !!obj)
    ),
    possessedAdminCamera: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          '\\[Online Ids:(?<ids>[^\\]]+)\\] (?<nameWithoutClanTag>.+) has possessed admin camera\\.'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(data => ({
        ...omit(data, 'ids'),
        ...extractIDs(data.ids),
      })),
      map(addTime)
    ),
    unPossessedAdminCamera: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          '\\[Online Ids:(?<ids>[^\\]]+)\\] (?<nameWithoutClanTag>.+) has unpossessed admin camera\\.'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(data => ({
        ...omit(data, 'ids'),
        ...extractIDs(data.ids),
      })),
      map(addTime)
    ),
    playerWarned: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          'Remote admin has warned player (?<nameWithClanTag>.*)\\. Message was "(?<reason>.*)"'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(addTime)
    ),
    playerKicked: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          'Kicked player (?<playerID>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*)'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(obj => ({
        ...omit(obj, 'ids'),
        ...extractIDs(obj.ids),
      })),
      map(addTime)
    ),
    squadCreated: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          '(?<playerName>.+) \\(Online IDs:(?<ids>[^)]+)\\) has created Squad (?<squadIndex>\\d+) \\(Squad Name: (?<squadName>.+)\\) on (?<teamName>.+)'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(data => ({
        ...omit(data, ['ids', 'playerName']),
        creator: {
          // same key name as in log parser !
          name: data.playerName,
          squadName: data.squadName,
          ...extractIDs(data.ids),
        },
      })),
      map(addTime)
    ),
    playerBanned: chatPacketEvent.pipe(
      map(body =>
        matchWithRegex(
          body,
          'Banned player (?<id>[0-9]+)\\. \\[Online IDs=(?<ids>[^\\]]+)\\] (?<name>.*) for interval (?<interval>.*)'
        )
      ),
      filter((obj): obj is NonNullable<typeof obj> => !!obj),
      map(obj => ({
        ...omit(obj, 'ids'),
        ...extractIDs(obj.ids),
      })),
      map(addTime)
    ),
  };
}

function addTime<T>(data: T): T & { date: Date } {
  return {
    ...data,
    // Careful: Date in local with timezone, server may also have a clock offset by a few minutes...
    date: new Date(),
  };
}
