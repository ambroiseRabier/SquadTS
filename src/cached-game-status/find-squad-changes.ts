import { Player } from './use-cached-game-status';
import { mergeOldNewPlayer } from './merge-old-new-player';

export function findSquadChanges(oldPlayerList: Player[], newPlayerList: Player[]) {
  const playerStillConnected = newPlayerList
    .map(playerNow => [playerNow, oldPlayerList.find(p => p.eosID === playerNow.eosID)] as const)
    .filter(
      (playerNow): playerNow is readonly [playerNow: Player, playerBefore: Player] => !!playerNow[1]
    );

  // Check both for different squad ID, and also if the "id" is the same, but he changed team.
  const playersWithDifferentSquadID = playerStillConnected.filter(
    ([playerNow, playerBefore]) =>
      playerBefore.squadIndex !== playerNow.squadIndex ||
      (playerBefore.squadIndex === playerNow.squadIndex && playerBefore.teamID !== playerNow.teamID)
  );

  return playersWithDifferentSquadID.map(([playerNow, playerBefore]) =>
    mergeOldNewPlayer(playerBefore, playerNow)
  );
}
