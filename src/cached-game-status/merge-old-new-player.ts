import { Player } from './use-cached-game-status';
import { merge } from 'lodash-es';

// Allow old to be undefined for convenience, perfecty supported by lodash merge.
export function mergeOldNewPlayer(old: Player | undefined, newPlayer: Player) {
  return {
    ...merge(old, newPlayer),
    // lodash will not override with undefined, but that stops player from ever leaving a squad !
    squad: newPlayer.squad,
    squadIndex: newPlayer.squadIndex,
  };
}
