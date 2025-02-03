import { RconSquad } from '../rcon-squad/use-rcon-squad';
import {
  BehaviorSubject,
  catchError,
  concatMap,
  EMPTY,
  exhaustMap,
  filter,
  interval,
  map,
  Observable,
  startWith,
  Subject,
  tap,
  timeout
} from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';
import { merge, omit } from 'lodash';
import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { LogParserConfig } from '../log-parser/log-parser.config';
import { Logger } from 'pino';
import { usePlayerGet } from './use-player-get';
import { useRconUpdates } from './use-rcon-updates';
import { useLogUpdates } from './use-log-updates';


// todo rcon fields that can be undefined ?
export type Player = {
  // (provided by log/rcon)
  id: string;

  // (provided by log/rcon)
  eosID: string;

  // (provided by rcon)
  steamID: string;

  // (provided by log/rcon)
  teamID: string;

  // (provided by log)
  name?: string;

  // (provided by rcon)
  // Be careful, because a player can change clan tag middle game...
  nameWithClanTag?: string;

  // (provided by rcon) (defaulted to false in log connect)
  isLeader: boolean;

  // null means no squad
  // (provided by rcon) (defaulted to null in log connect)
  squadID: string | null;

  // (provided by log)
  controller?: string;

  // (provided by log)
  ip?: string;

  // (provided by rcon)
  role?: string;
};

// todo: rn, only rcon provide squad, we are not using squad created log.
// interface Squad {
//   // (provided by rcon) (unless this player just created a squad)
//   teamID: string;
//   // (provided by rcon) (unless this player just created a squad)
//   squadID: string;
//   // (provided by rcon) (unless this player just created a squad)
//   name: string;
// }
export type Squad = Awaited<ReturnType<RconSquad['getSquads']>>[number];

// Design note: We want to avoid some confusion at usage, a Squad["squadID"] does not change in a Squad lifetime (unless disband, recreate with same name).
//              When we do `player.squad`, we are most likely thinking of the squad that `player` is currently in.
//              Imagine a plugin saving a bunch of players, every 30sec you check the squad they are in, you most likely don't want stale data.
//              To make it easier to see that the data is not stale, we use a function like `getSquad()` instead of `squad`.
//
// null means no squad


// Utility type to infer the emitted type from an Observable
// Work like Awaited for promises
type ObservableValue<T> = T extends Observable<infer V> ? V : never;

export type CachedGameStatus = ReturnType<typeof useCachedGameStatus>;

/**
 * Keep track of the game status, like players, layers, squad list.
 */
export function useCachedGameStatus(rconSquad: RconSquad, logParser: LogParser, config: CachedGameStatusOptions, logParserConfig: LogParserConfig, logger: Logger) {
  const players$ = new BehaviorSubject<Player[]>([]);
  const squads$ = new BehaviorSubject<Squad[]>([]);
  const rconUpdates = useRconUpdates(rconSquad, config.updateInterval, players$.getValue.bind(players$), squads$.getValue.bind(squads$)); // bind( missing ?)
  const logUpdates = useLogUpdates({
    logParser,
    logParserConfig,
    logger,
    getPlayers: players$.getValue.bind(players$),
    getSquads: squads$.getValue.bind(squads$),
  });

  const playerChangedSquad = new Subject<Player[]>();

  // todo idea, behaviorSubject per player ? following actions per ID and name ?


  const playerGet = usePlayerGet(() => players$.getValue());
  const {
    getPlayerByEOSID,
    getPlayersByName,
    getPlayersByNameWithClanTag,
    tryGetPlayerByName,
    tryGetPlayerByNameWithClanTag
  } = playerGet;

  function getSquad(squadID: string, teamID: string) {
    return squads$.getValue().find(
      // We need to check both id, because each team can have a squad one for example.
      squad =>
        squad.teamID === teamID &&
        squad.squadID === squadID
    );
  }


  // todo, suad created event du tchat depuis rcon, existe aussi en logs ? le tchat c juste rcon ou logs aussi ?
  // par contre, créer c pas la meme chose que de changer de lead, donc different qd meme.

  // idea: do somekind of waiter, that emit only when all needed variable on player
  //       are set ?

  // todo: disconnectplayer, garder info sur eux et re-utiliser si reconnect.

  // todo: suspicion que l'on ait par defaut un espace avant le name ds les logs (corriger les logs alors)

  // todo: maybe stop mixing undef and null ?
  function getPlayerSquad(eosID: string) {
    // Guard against plugin dev mistakes
    if (!eosID) {
      throw new Error('Provided eosID is nullish');
    }
    const player = getPlayerByEOSID(eosID);
    if (player === undefined || !player.squadID) {
      return undefined;
    } else {
      return getSquad(player.squadID, player.teamID);
    }
  }


  return {
    /**
     * Events enriched in data using existing saved game status.
     */
    events: {
      ...logParser.events,
      playerChangedSquad,

      // todo, saving up-to-date player controller from playerWounded ? (getPlayerByEOSID return stale controller)
      //     may not be expected !
      playerWounded: logParser.events.playerWounded.pipe(
        map(data => {
          // Both RCON and logParser give eosID, 100% chance we get the player.
          const attacker = getPlayerByEOSID(data.attacker.eosID)!;
          const victim = tryGetPlayerByNameWithClanTag(data.victim.nameWithClanTag);

          // Send back augmented data, but playerWounded log event data has priority as it is the most up-to-date.
          // This concerns attacker.controller and victim.nameWithClanTag
          return merge({attacker, victim}, data);
        }),
      )
    },
    chatEvents: {
      ...rconSquad.chatEvents,
      message: rconSquad.chatEvents.message.pipe(
        map(data => ({
          ...data,
          player: {
            // Prefer merging getPlayerByEOSID first as it can be out of date.
            ...getPlayerByEOSID(data.player.eosID),
            ...data.player
          },
        }))
      ),
      command: rconSquad.chatEvents.command.pipe(
        map(data => ({
          ...data,
          player: {
            ...getPlayerByEOSID(data.player.eosID),
            ...data.player
          },
        }))
      ),
      possessedAdminCamera: rconSquad.chatEvents.possessedAdminCamera.pipe(
        map(data => ({
          ...getPlayerByEOSID(data.eosID),
          ...data
        }))
      ),
      unPossessedAdminCamera: rconSquad.chatEvents.unPossessedAdminCamera.pipe(
        map(data => ({
          ...getPlayerByEOSID(data.eosID),
          ...data
        }))
      ),
      playerWarned: rconSquad.chatEvents.playerWarned.pipe(
        map(data => ({
          ...tryGetPlayerByNameWithClanTag(data.nameWithClanTag),
          ...data
        }))
      ),
      playerKicked: rconSquad.chatEvents.playerKicked.pipe(
        map(data => ({
          ...getPlayerByEOSID(data.eosID),
          ...data
        }))
      ),
      playerBanned: rconSquad.chatEvents.playerBanned.pipe(
        map(data => ({
          ...getPlayerByEOSID(data.eosID),
          ...data
        }))
      ),
      squadCreated: rconSquad.chatEvents.squadCreated.pipe(
        map(data => ({
          ...data,
          creator: {
            ...getPlayerByEOSID(data.creator.eosID),
            ...data.creator
          }
        }))
      )
    },
    ...playerGet,
    // You may subscribe to only one player by using pipe and filter by eosID
    players$,
    // Note that data is immutable and won't be updated by reference, to get non stale data,
    // call players each time, or getPlayerByEOSID
    // Example:
    // Up-To-Date: if (getPlayerByEOSID(savedEOSID).isLeader) ...
    // Stale:  if (savedPlayer.isLeader) ...
    //
    // You may also use players$ stream.
    players: players$.getValue(),
    squads$,
    squads: squads$.getValue(),
    /**
     * Call before logParser are watching.
     * (todo: nope) For maximum efficiency. Should be called after rcon is connected but before logs are downloaded.
     */
    watch: () => {
      // Will start adding and removing player in cache, from logs
      logUpdates.players$.subscribe(players$.next.bind(players$));
      logUpdates.watch();

      // Start the interval of squad/players RCON updates.
      rconUpdates.players$.subscribe(players$.next.bind(players$));
      rconUpdates.squads$.subscribe(squads$.next.bind(squads$));
      rconUpdates.watch();
    },
    unWatch: () => {
      logUpdates.players$.unsubscribe();
      logUpdates.unwatch();

      rconUpdates.players$.unsubscribe();
      rconUpdates.squads$.unsubscribe();
      rconUpdates.unwatch();
    }
  };
}
