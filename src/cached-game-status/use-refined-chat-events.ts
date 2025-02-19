// Unless there is a chatEvents being received after a log disconnected,
// getPlayerByEOSID(data.player.eosID)! should be ok.
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CachedGameStatus } from './use-cached-game-status';
import { usePlayerGet } from './use-player-get';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { filter, map } from 'rxjs';

interface Props {
  rconSquad: RconSquad;
  cachedGameStatus: CachedGameStatus;
}

/**
 * Events enriched in data using existing saved game status.
 */
export type RefinedChatEvents = ReturnType<typeof useRefinedChatEvents>;

export function useRefinedChatEvents({ rconSquad, cachedGameStatus }: Props) {
  const { tryGetPlayerByNameWithClanTag, getPlayerByEOSID } = usePlayerGet(() =>
    cachedGameStatus.players$.getValue()
  );

  return {
    ...rconSquad.chatEvents,
    message: rconSquad.chatEvents.message.pipe(
      map(data => ({
        ...data,
        player: {
          // Prefer merging getPlayerByEOSID first as it can be out of date.
          ...getPlayerByEOSID(data.player.eosID)!,
          ...data.player,
        },
      }))
    ),
    command: rconSquad.chatEvents.command.pipe(
      map(data => ({
        ...data,
        player: {
          ...getPlayerByEOSID(data.player.eosID)!,
          ...data.player,
        },
      }))
    ),
    possessedAdminCamera: rconSquad.chatEvents.possessedAdminCamera.pipe(
      map(data => ({
        ...getPlayerByEOSID(data.eosID)!,
        ...data,
      }))
    ),
    unPossessedAdminCamera: rconSquad.chatEvents.unPossessedAdminCamera.pipe(
      map(data => ({
        ...getPlayerByEOSID(data.eosID)!,
        ...data,
      }))
    ),
    playerWarned: rconSquad.chatEvents.playerWarned.pipe(
      filter(data => !!tryGetPlayerByNameWithClanTag(data.nameWithClanTag)),
      map(data => ({
        ...tryGetPlayerByNameWithClanTag(data.nameWithClanTag)!,
        ...data,
      }))
    ),
    playerKicked: rconSquad.chatEvents.playerKicked.pipe(
      map(data => ({
        ...getPlayerByEOSID(data.eosID)!,
        ...data,
      }))
    ),
    playerBanned: rconSquad.chatEvents.playerBanned.pipe(
      map(data => ({
        ...getPlayerByEOSID(data.eosID)!,
        ...data,
      }))
    ),
    squadCreated: rconSquad.chatEvents.squadCreated.pipe(
      map(data => ({
        ...data,
        creator: {
          ...getPlayerByEOSID(data.creator.eosID)!,
          ...data.creator,
        },
      }))
    ),
  };
}
