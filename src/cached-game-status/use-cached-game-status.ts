import {RconSquad} from '../rcon-squad/use-rcon-squad';
import { BehaviorSubject, interval, map, switchMap } from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';

/**
 * Keep track of the game status, like players, layers, squad list.
 */
export function useCachedGameStatus(rconSquad: RconSquad, logParser: LogParser) {
  const players$ = new BehaviorSubject<Awaited<ReturnType<typeof rconSquad.getListPlayers>>>([]);
  const squads$ = new BehaviorSubject<Awaited<ReturnType<typeof rconSquad.getSquads>>>([]);


  // Update players
  interval(30 * 1000)
    .pipe(
      switchMap(async () => {
        //   // todo also get last controller from logParser ?
        return await rconSquad.getListPlayers();
      }),
      map(players => {
        return players.map(player => ({
          ...player,
          squad: squads$.getValue().find(
            // teamID is either 1 or 2, squadID 1 will be the first created squad, so we need to check both.
            squad => squad.teamID === player.teamID && squad.squadID === player.squadID
          )
        }))
      })
    )
    .subscribe((players) => {
      players$.next(players);
    });


  // Update squads
  interval(30 * 1000)
    .pipe(
      switchMap(rconSquad.getSquads)
    )
    .subscribe((updatedSquads) => {
      squads$.next(updatedSquads);
    });


  return {
    players$,
    players: players$.getValue(),
    squads$,
    squads: squads$.getValue()
  };
}
