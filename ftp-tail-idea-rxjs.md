```ts
import { Subject, timer, from, Observable } from 'rxjs';
import { exhaustMap, repeat } from 'rxjs/operators';

export function intervalPlayersSquads(
  updateInterval: CachedGameStatusOptions['updateInterval'],
  rconSquad: RconSquad,
  manualRCONUpdateForTest?: Subject<void>
): Observable<void> {
  return (manualRCONUpdateForTest ?? timer(0, updateInterval.playersAndSquads * 1000)).pipe(
    exhaustMap(async () => {
      const response = await obtainRCONPlayersAndSquads(rconSquad);
      return response;
    }),
    repeat() // Ensures the stream re-triggers indefinitely
  );
}
```

avec rattrapage retard

```ts
import { Subject, timer, from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

export function intervalPlayersSquads(
  updateInterval: CachedGameStatusOptions['updateInterval'],
  rconSquad: RconSquad,
  manualRCONUpdateForTest?: Subject<void>
): Observable<void> {
  return (manualRCONUpdateForTest ?? new Subject<void>()).pipe(
    switchMap(() => {
      // Use a recursive function to trigger dynamically adjusted intervals
      return new Observable<void>(subscriber => {
        const triggerNext = async () => {
          try {
            const startTime = Date.now();
            await obtainRCONPlayersAndSquads(rconSquad); // Execute the RCON fetch
            const executionTime = Date.now() - startTime; // Time taken to fetch
            const delay = Math.max(0, updateInterval.playersAndSquads * 1000 - executionTime); // Adjust the delay
            setTimeout(triggerNext, delay); // Schedule the next execution
          } catch (err) {
            subscriber.error(err);
          }
        };
        triggerNext(); // Initial trigger
      });
    })
  );
}
```

plutot que des promises, lequel est plus lisible ? puis gestion des erreurs aussi.
