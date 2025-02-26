import { Player } from './use-cached-game-status';
import { merge } from 'lodash-es';

// Note:Allow old to be undefined for convenience, perfectly supported by lodash merge.
/**
 * Deep merge an old and new player, if the new player has no squad, resulting player will not have squad.
 * @param old
 * @param newPlayer
 */
export function mergeOldNewPlayer(old: Player | undefined, newPlayer: Player) {
  return {
    ...merge(old, newPlayer),
    // lodash will not override with undefined, but that stops player from ever leaving a squad !
    squad: newPlayer.squad,
    squadIndex: newPlayer.squadIndex,
  };
}
