/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { LogParser } from '../log-parser/use-log-parser';
import { filter, map } from 'rxjs';
import { merge, omit } from 'lodash-es';
import { CachedGameStatus } from './use-cached-game-status';
import { usePlayerGet } from './use-player-get';

interface Props {
  logParser: LogParser;
  cachedGameStatus: CachedGameStatus;
}

/**
 * Events enriched in data using existing saved game status.
 */
export type RefinedLogEvents = ReturnType<typeof useRefinedLogEvents>;

export function useRefinedLogEvents({ logParser, cachedGameStatus }: Props) {
  const { tryGetPlayerByNameWithClanTag, getPlayerByEOSID, tryGetPlayerByName } = usePlayerGet(() =>
    cachedGameStatus.players$.getValue()
  );

  return {
    ...logParser.events,

    // todo, saving up-to-date player controller from playerWounded ? (getPlayerByEOSID return stale controller)
    //     may not be expected ! (that means updating player with new controller)
    playerWounded: logParser.events.playerWounded.pipe(
      // Since playerWounded log only give nameWithClanTag, there is a slight change we
      // are not able to identify the victim to a player.
      // May happen if there is multiple person with the same nameWithClanTag or when
      // RCON has not yet returned the player (only RCON provide nameWithClanTag).
      //
      // May give access to logParser if some plugin really need
      // playerWounded even when victim player is not fully identified.
      // We'll see if player with same nameWithClanTag happen often enough...
      filter(data => !!tryGetPlayerByNameWithClanTag(data.victim.nameWithClanTag)),
      map(data => {
        // Both RCON and logParser give eosID, 100% chance we get the player.
        const attacker = getPlayerByEOSID(data.attacker.eosID)!;
        // We just filtered above, so it safe to assert not null.
        const victim = tryGetPlayerByNameWithClanTag(data.victim.nameWithClanTag)!;
        // Send back augmented data with the latest update, concerns:
        // - attacker.controller
        // - victim.nameWithClanTag
        return merge({ attacker, victim }, data);
      })
    ),

    playerDied: logParser.events.playerDied.pipe(
      filter(data => !!tryGetPlayerByNameWithClanTag(data.victim.nameWithClanTag)),
      map(data => {
        // Both RCON and logParser give eosID, 100% chance we get the player.
        const attacker = getPlayerByEOSID(data.attacker.eosID)!;
        // We just filtered above, so it safe to assert not null.
        const victim = tryGetPlayerByNameWithClanTag(data.victim.nameWithClanTag)!;

        // Send back augmented data with the latest update, concerns:
        // - attacker.controller
        // - victim.nameWithClanTag
        return merge({ attacker, victim }, data);
      })
    ),

    deployableDamaged: logParser.events.deployableDamaged.pipe(
      filter(data => !!tryGetPlayerByName(data.attackerName)),
      map(data => {
        // We just filtered above, so it safe to assert not null.
        const attacker = tryGetPlayerByName(data.attackerName)!;

        return {
          ...omit(data, ['attackerName']),
          attacker,
        };
      })
    ),

    playerDisconnected: logParser.events.playerDisconnected.pipe(
      map(data => {
        // logParser playerDisconnected event is received at the same time by cachedGameStatus,
        // cachedGameStatus will remove the player from the list, making `getPlayerByEOSID(data.eosID)` fail.
        // cachedGameStatus.lastPlayerDisconnected is a hack to save us.
        // I still use `getPlayerByEOSID(data.eosID)`, just in case this subscription would be called first.
        const player = getPlayerByEOSID(data.eosID) ?? cachedGameStatus.lastPlayerDisconnected;

        // When starting SquadTS, we run RCON ListPlayers before parsing any log.
        // If we get any player disconnected log event, we should always be able to find the player in cached player list.
        if (!player) {
          throw new Error('Unexpected: Player not found');
        }

        if (player.eosID !== data.eosID) {
          throw new Error(
            'Unexpected: Player id mismatch, is cachedGameStatus.lastPlayerDisconnected not what we think?'
          );
        }

        return {
          ...omit(data, ['controller', 'ip', 'eosID']),
          player: {
            // Even if we don't have player connected event it is
            // safe to do, since we got RCON player data at the startup.
            ...player,
            // Make sure we use the latest info here.
            controller: data.controller,
            ip: data.ip,
          },
        };
      })
    ),
  };
}
