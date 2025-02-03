import { concatMap, exhaustMap,  interval, map, startWith, Subject, tap } from 'rxjs';
import { merge } from 'lodash';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { Player, Squad } from './use-cached-game-status';


export function useRconUpdates(rconSquad: RconSquad, updateInterval: CachedGameStatusOptions["updateInterval"], getPlayers: () => Player[], getSquads: () => Squad[]) {
  const squads$ = new Subject<Awaited<ReturnType<typeof rconSquad.getSquads>>>();
  const players$ = new Subject<Player[]>();

  // Update squads
  const squadUpdate$ = interval(updateInterval.playersAndSquads * 1000)
    .pipe(
      // Emit first value immediately
      startWith(0),
      // Notes:
      // switchMap: will cancel getSquads request if it doesn't return before next interval tick. (we don't want that !)
      // concatMap: will queue request (so if request are really slow for a moment then really fast we are gonna spam
      //            rcon with requests in a short time, we don't want that either)
      //
      // exhaustMap: Ensures that if a request is already in progress, new emissions are ignored until
      // the current request completes. This is particularly useful for ensuring no queuing happens at all.
      // exhaustMap is almost correct, we may have 2x the interval waiting time if request take 1.01x the interval
      exhaustMap(rconSquad.getSquads)
    );

  // Player update interval (that depends on squads$)
  const playerUpdate$ = squadUpdate$.pipe(
    concatMap(updatedSquads => {
      squads$.next(updatedSquads); // Ensure `squads$` is updated first
      return rconSquad.getListPlayers(); // Then fetch players
    }),
    map(players => {
      //   // todo also get last controller from logParser ?
      // Map players to include squad info from latest squads$
      return players.map(player => ({
        ...player,
        squad: getSquads().find(
          // We need to check both id, because each team can have a squad one for example.
          squad =>
            squad.teamID === player.teamID &&
            squad.squadID === player.squadID
        )
      }));
    }),
    tap(currentPlayers => {

      // wip todo (change squad et change leader, ce serait bien d'avoir le previous non aussi?
      // const playersWithDifferentSquadID = players$.getValue()
      //   .filter(playerBefore => {
      //     // Find the corresponding player in updatedPlayers
      //     const playerNow = updatedPlayers.find(p => p.eosID === playerBefore.eosID);
      //     // Ignore player that have disconnected AND Keep only those with a different squadID
      //     return playerNow && playerNow.squad?.squadID !== playerBefore.squad?.squadID;
      //   });
      //
      // playerChangedSquad.next(playersWithDifferentSquadID);

      // We update players already in cache.
      const updatedPrevious = getPlayers().map(player => (
        // Find the corresponding player in updatedPlayers, and deep merge it.
        // If no player is found, ignore, probably a disconnect, log parser will handle this
        merge(player, currentPlayers.find(p => p.eosID === player.eosID) || {})
      ));

      const newPlayers: Player[] = currentPlayers.filter(
        player => !getPlayers().find(p => p.eosID === player.eosID
      ));

      // todo: Let logs handle disconnected players for now ?

      // Update `players$` after squads$ so we always take advantage of squads$ updates immediately.
      players$.next([...updatedPrevious, ...newPlayers]);
    })
  );

  return {
    players$,
    squads$,
    watch: () => {
      // Subscribing will start the interval of squad/players RCON updates.
      playerUpdate$.subscribe();
    }
  };
}
