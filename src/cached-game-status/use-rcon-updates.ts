import {
  concatMap,
  exhaustMap,
  interval,
  map,
  Observable,
  startWith,
  Subject,
  Subscription,
  tap,
} from 'rxjs';
import { merge } from 'lodash-es';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { Player, Squad } from './use-cached-game-status';

interface Props {
  rconSquad: RconSquad;
  updateInterval: CachedGameStatusOptions['updateInterval'];
  getPlayers: () => Player[];
  getSquads: () => Squad[];
  manualUpdateForTest?: Subject<void>;
}

export function useRconUpdates({
  getPlayers,
  getSquads,
  rconSquad,
  updateInterval,
  manualUpdateForTest,
}: Props) {
  // Note: we cannot place behaviorSubject here, data from logs will be merged into player and maybe also squad infos.
  const squads$ = new Subject<
    Awaited<ReturnType<typeof rconSquad.getSquads>>
  >();
  const players$ = new Subject<Player[]>();
  const playersSquadChange$ = new Subject<Player[]>();

  // Update squads
  const squadUpdate$ = !manualUpdateForTest
    ? interval(updateInterval.playersAndSquads * 1000).pipe(
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
      )
    : // Same behavior but without startWith that expect a more specific observable.
      // This is only for test server as the observable name hint
      manualUpdateForTest.pipe(exhaustMap(rconSquad.getSquads));
  // Replace startWith(0) to keep the same behavior.
  if (!!manualUpdateForTest) {
    manualUpdateForTest.next();
  }

  // Player update interval (that depends on squads$)
  const playerUpdate$ = squadUpdate$.pipe(
    concatMap((updatedSquads) => {
      squads$.next(updatedSquads); // Ensure `squads$` is updated first
      return rconSquad.getListPlayers(); // Then fetch players
    }),
    map((players) => {
      //   // todo also get last controller from logParser ?
      // Map players to include squad info from latest squads$
      return players.map((player) => ({
        ...player,
        squad: getSquads().find(
          // We need to check both id, because each team can have a squad one for example.
          (squad) =>
            squad.teamID === player.teamID && squad.squadID === player.squadID
        ),
      }));
    }),
    // Not quite sure why I need to type it Player for some errors to disappear,
    // TS should be able to find currentPlayers type to be compatible with Player by itself.
    tap((currentPlayers: Player[]) => {
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

      const playerStillConnected = currentPlayers
        .map(
          (playerNow) =>
            [
              playerNow,
              getPlayers().find((p) => p.eosID === playerNow.eosID),
            ] as const
        )
        .filter(
          (
            playerNow
          ): playerNow is readonly [playerNow: Player, playerBefore: Player] =>
            !!playerNow[1]
        );

      // Check both for different squad ID, and also if the "id" is the same but he changed team.
      const playersWithDifferentSquadID = playerStillConnected.filter(
        ([playerNow, playerBefore]) =>
          playerBefore.squadID !== playerNow.squadID ||
          (playerBefore.squadID === playerNow.squadID &&
            playerBefore.teamID !== playerNow.teamID)
      );

      playersSquadChange$.next(
        playersWithDifferentSquadID.map(([playerNow, playerBefore]) =>
          merge(playerBefore, playerNow)
        )
      );

      // We update players already in cache.
      const updatedPrevious = getPlayers().map((player) =>
        // Find the corresponding player in updatedPlayers, and deep merge it.
        // If no player is found, ignore, probably a disconnect, log parser will handle this
        merge(
          player,
          currentPlayers.find((p) => p.eosID === player.eosID) || {}
        )
      );

      const newPlayers: Player[] = currentPlayers.filter(
        (player) => !getPlayers().find((p) => p.eosID === player.eosID)
      );

      // todo: Let logs handle disconnected players for now ?

      // Update `players$` after squads$ so we always take advantage of squads$ updates immediately.
      players$.next([...updatedPrevious, ...newPlayers]);
    })
  );
  const sub: Subscription[] = [];

  return {
    playersSquadChange$,
    players$,
    squads$,
    watch: () => {
      // Subscribing will start the interval of squad/players RCON updates.
      sub.push(playerUpdate$.subscribe());
    },
    unwatch() {
      sub.forEach((sub) => sub.unsubscribe());
    },
  };
}
