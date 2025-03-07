import { BehaviorSubject, exhaustMap, Subject, Subscription } from 'rxjs';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { LogParser } from '../log-parser/use-log-parser';
import { findSquadChanges } from './find-squad-changes';
import { obtainEnteringPlayer } from './obtain-entering-player';
import { intervalPlayersSquads, intervalServerInfo } from './rcon-updates';
import { mergeOldNewPlayer } from './merge-old-new-player';

// todo use squad created log ?
export type Squad = Awaited<ReturnType<RconSquad['getSquads']>>[number];

export interface Player {
  // (provided by log/rcon)
  id: string;

  // (provided by log/rcon)
  eosID: string;

  // (provided by rcon)
  steamID: string;

  // Note: teamNumber is used by squad game, but teamID seems fine in opposition to
  //       squadIndex, it will always refer to the same thing.
  // (provided by log/rcon)
  teamID: '1' | '2';

  // (provided by log)
  name?: string;

  // (provided by rcon)
  // Be careful, because a player can change clan tag mid-game...
  nameWithClanTag?: string;

  // (provided by rcon) (defaulted to false in log connect)
  isLeader: boolean;

  // Note: it is name squadIndex like the game does (see rcon "ListCommands 1")
  //       instead of confusing squadID (although RCON ListPlayers use squadID label)
  // (provided by rcon) (defaulted to undefined in log connect)
  squadIndex?: string;

  // (provided by log)
  controller?: string;

  // (provided by log)
  ip?: string;

  // (provided by rcon)
  role?: string;

  // (provided by rcon)
  squad?: Squad;
}

interface Props {
  initialPlayers: Player[];
  initialSquads: Squad[];
  initialServerInfo: Awaited<ReturnType<RconSquad['showServerInfo']>>;
  logParser: LogParser;
  config: CachedGameStatusOptions;
  rconSquad: RconSquad;
  manualRCONUpdateForTest?: Subject<void>;
  addPlayer$: ReturnType<typeof obtainEnteringPlayer>;
}

export type CachedGameStatus = ReturnType<typeof useCachedGameStatus>;

/**
 * Cache game information like players/squads/server-info from both logs and RCON.
 */
export function useCachedGameStatus({
  initialPlayers,
  initialServerInfo,
  initialSquads,
  logParser,
  config,
  rconSquad,
  manualRCONUpdateForTest,
  addPlayer$,
}: Props) {
  const players$ = new BehaviorSubject<Player[]>(initialPlayers);
  const squads$ = new BehaviorSubject<Squad[]>(initialSquads);
  const serverInfo$ = new BehaviorSubject<Awaited<ReturnType<RconSquad['showServerInfo']>>>(
    initialServerInfo
  );
  const playersSquadChange$ = new Subject<Player[]>();

  // todo idea, behaviorSubject per player ? following actions per eosID ?
  // todo: squad created event (depuis RCON et depuis logs) ?
  // todo: squad change lead event (depuis RCON seulement) ?
  // todo suivre diconnected player pdt un moment ?

  const sub: Subscription[] = [];

  return {
    players$,
    squads$,
    serverInfo$,
    playersSquadChange$,
    addPlayer$,
    watch: () => {
      sub.push(
        // ---- Log based events ----

        logParser.events.playerDisconnected.subscribe(playerDisconnected => {
          // Note that we may have player disconnected events without ever having a connect event, because logs
          // can start being read at any time.
          // Remove players through logs

          // todo track disconnected, and reuse their data if reconnect
          players$.next(
            players$.getValue().filter(player => player.eosID !== playerDisconnected.eosID)
          );
        }),

        addPlayer$.subscribe(newPlayer => {
          // If the player already exist (obtained through RCON), merge it.
          const existingPlayer = players$
            .getValue()
            .find(player => player.eosID === newPlayer.eosID);

          // Emit the updated player list.
          players$.next([
            ...players$.getValue().filter(player => player.eosID !== newPlayer.eosID),
            mergeOldNewPlayer(existingPlayer, newPlayer),
          ]);
        }),

        // ---- RCON based events ----

        intervalPlayersSquads(config.updateInterval, rconSquad, manualRCONUpdateForTest).subscribe(
          ({ players, squads }) => {
            const squadChanges = findSquadChanges(players$.getValue(), players);

            players$.next(
              players.map(player =>
                // Find the corresponding player in updatedPlayers, and deep merge it.
                // If no player is found, ignore, probably a disconnect, log parser will handle this
                // override with the new player if there is any existing keys.
                mergeOldNewPlayer(
                  players$.getValue().find(p => p.eosID === player.eosID),
                  player
                )
              )
            );

            squads$.next(squads);

            // It is likely expected by plugin dev to be triggered after players and squads have been updated
            playersSquadChange$.next(squadChanges);
          }
        ),

        intervalServerInfo(config.updateInterval, rconSquad, manualRCONUpdateForTest).subscribe(
          serverInfo => {
            serverInfo$.next(serverInfo);
          }
        ),

        logParser.events.newGame.pipe(exhaustMap(rconSquad.showServerInfo)).subscribe(info => {
          serverInfo$.next(info);
        })
      );
    },
    unwatch: () => {
      sub.forEach(sub => sub.unsubscribe());
    },
  };
}
