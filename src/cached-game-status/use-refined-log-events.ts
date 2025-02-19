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

export function useRefinedLogEvents({logParser, cachedGameStatus}: Props) {
  const {
    tryGetPlayerByNameWithClanTag,
    getPlayerByEOSID,
    tryGetPlayerByName,
  } = usePlayerGet(() => cachedGameStatus.players$.getValue());

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
        return merge({attacker, victim}, data);
      }),
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
        return merge({attacker, victim}, data);
      })
    ),
    deployableDamaged: logParser.events.deployableDamaged.pipe(
      filter(data => !!tryGetPlayerByName(data.attackerName)),
      map(data => {
        // We just filtered above, so it safe to assert not null.
        const attacker = tryGetPlayerByName(data.attackerName)!;

        return {
          ...data,
          attacker,
        };
      })
    ),

    playerDisconnected: logParser.events.playerDisconnected.pipe(
      map(data => ({
        ...omit(data, ['controller', 'ip', 'eosID']),
        player: {
          ...getPlayerByEOSID(data.eosID)!,
          // Make sure we use latest info here
          controller: data.controller,
          ip: data.ip,
        },
      }))
    ),
  };
}
