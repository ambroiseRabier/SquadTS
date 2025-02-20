import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { exhaustMap, from, interval, Subject } from 'rxjs';

export function intervalPlayersSquads(
  updateInterval: CachedGameStatusOptions['updateInterval'],
  rconSquad: RconSquad,
  manualRCONUpdateForTest?: Subject<void>
) {
  // I don't know why, but wrapping into a ternary condition for DRY make typescript unhappy with exhaustMap.
  if (manualRCONUpdateForTest) {
    return manualRCONUpdateForTest.pipe(
      exhaustMap(async () => await obtainRCONPlayersAndSquads(rconSquad))
    );
  } else {
    return interval(updateInterval.playersAndSquads * 1000).pipe(
      // Notes:
      // switchMap: will cancel getSquads request if it doesn't return before next interval tick. (we don't want that !)
      // concatMap: will queue request (so if request are really slow for a moment then really fast we are gonna spam
      //            rcon with requests in a short time, we don't want that either)
      //
      // exhaustMap: Ensures that if a request is already in progress, new emissions are ignored until
      // the current request completes. This is particularly useful for ensuring no queuing happens at all.
      // exhaustMap is almost correct, we may have 2x the interval waiting time if request take 1.01x the interval
      exhaustMap(async () => await obtainRCONPlayersAndSquads(rconSquad))
    );
  }
}

export function intervalServerInfo(
  updateInterval: CachedGameStatusOptions['updateInterval'],
  rconSquad: RconSquad
) {
  return interval(updateInterval.serverInfo * 1000).pipe(exhaustMap(rconSquad.showServerInfo));
}

async function obtainRCONPlayersAndSquads(rconSquad: RconSquad) {
  const squads = await rconSquad.getSquads();
  const players = await rconSquad.getListPlayers();

  return {
    squads,
    players: players.map(player => ({
      ...player,
      squad: squads.find(
        squad => squad.teamID === player.teamID && squad.squadID === player.squadID
      ),
    })),
  };
}
