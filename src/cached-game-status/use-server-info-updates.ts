import { RconSquad } from '../rcon-squad/use-rcon-squad';
import {
  BehaviorSubject,
  exhaustMap,
  interval,
  Observable,
  Subscription,
} from 'rxjs';
import { CachedGameStatusOptions } from './use-cached-game-status.config';

export function useServerInfoUpdates(
  rconSquad: RconSquad,
  updateInterval: CachedGameStatusOptions['updateInterval'],
  initialServerInfo: Awaited<ReturnType<RconSquad['showServerInfo']>>,
  onNewGame: Observable<void>
) {
  // We don't want to deal with empty object or undefined typing, so we are immediately using initial data.
  // Note: getting is a parameter and letting index.ts handle the request, seems better than doing the request here and making both
  // useServerInfoUpdates and useCachedGameStatus async function.
  const serverInfo$ = new BehaviorSubject<
    Awaited<ReturnType<typeof rconSquad.showServerInfo>>
  >(initialServerInfo);

  const update$ = interval(updateInterval.serverInfo * 1000).pipe(
    // exhaustMap: Ensures that if a request is already in progress, new emissions are ignored until
    // the current request completes. This is particularly useful for ensuring no queuing happens at all.
    // exhaustMap is almost correct, we may have 2x the interval waiting time if request take 1.01x the interval
    exhaustMap(rconSquad.showServerInfo)
  );
  const sub: Subscription[] = [];

  return {
    serverInfo$,
    watch: () => {
      // Subscribing will start the interval of squad/players RCON updates.
      sub.push(
        update$.subscribe((info) => serverInfo$.next(info)),
        onNewGame
          .pipe(exhaustMap(rconSquad.showServerInfo))
          .subscribe((info) => {
            serverInfo$.next(info);
          })
      );
    },
    unwatch() {
      sub.forEach((sub) => sub.unsubscribe());
    },
  };
}
