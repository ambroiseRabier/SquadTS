import { RconSquad } from '../rcon-squad/use-rcon-squad';
import {
  BehaviorSubject, catchError,
  concatMap, EMPTY,
  exhaustMap,
  filter,
  interval,
  map,
  Observable, startWith, Subject,
  tap,
  timeout
} from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';
import { merge, omit, pick } from 'lodash';
import { CachedGameStatusOptions } from './use-cached-game-status.config';
import { LogParserConfig } from '../log-parser/log-parser.config';
import { Logger } from 'pino';


// interface Player {
//   teamID: string;
//   squadID: string;
//   name: string;
//   isLeader: string;
//   eoID: string;
//   steamID: string;
// }

// todo rcon fields that can be undefined ?
type Player = {
  // (provided by log/rcon)
  id: string;

  // (provided by log/rcon)
  eosID: string;

  // (provided by rcon)
  steamID: string;

  // (provided by log/rcon)
  teamID: string;

  // (provided by log)
  name: string;

  // (provided by rcon)
  nameWithClanTag?: string;

  // (provided by rcon) (unless this player just created a squad)
  isLeader: boolean;

  // todo: remettre !
  // null means no squad
  // (provided by rcon) (unless this player just created a squad)
  squadID: string | null;

  // Design note: We want to avoid some confusion at usage, a Squad["squadID"] does not change in a Squad lifetime (unless disband, recreate with same name).
  //              When we do `player.squad`, we are most likely thinking of the squad that `player` is currently in.
  //              Imagine a plugin saving a bunch of players, every 30sec you check the squad they are in, you most likely don't want stale data.
  //              To make it easier to see that the data is not stale, we use a function like `getSquad()` instead of `squad`.
  //
  // null means no squad
  getSquad(): Readonly<{
    // (provided by rcon) (unless this player just created a squad)
    teamID: string;
    // (provided by rcon) (unless this player just created a squad)
    squadID: string;
    // (provided by rcon) (unless this player just created a squad)
    name: string;
  }> | null;

  // (provided by log/rcon)
  controller: string;

  // (provided by log)
  ip: string;
};


// Utility type to infer the emitted type from an Observable
// Work like Awaited for promises
type ObservableValue<T> = T extends Observable<infer V> ? V : never;

// Explicit typing, some we won't have to manually update Player,
// but in the end, only steamID and eosID are guaranteed.
// en fait, c l'un ou l'autre ou les deux.
// type Player2 =
//   ( | Awaited<ReturnType<RconSquad['getListPlayers']>>[number]
//   | ObservableValue<LogParser['events']['playerConnected']>
// ) & (
//   Partial<Awaited<ReturnType<RconSquad['getListPlayers']>>[number]>
//   & Partial<ObservableValue<LogParser['events']['playerConnected']>>
//   );
//
// var j: Player2; // pas mal mais ignore ce qui se passe ds la pipe, genre ajout de squad: {}
// var k = j.;

// todo maybe there is a way not to have to deal with potential null value in plugin on player ?
// at the cost of slightly longer update time ?

// Player info when passed may be slightly out of date ? Yes, on events based on logs or rcon

export type CachedGameStatus = ReturnType<typeof useCachedGameStatus>;

/**
 * Keep track of the game status, like players, layers, squad list.
 */
export function useCachedGameStatus(rconSquad: RconSquad, logParser: LogParser, config: CachedGameStatusOptions, logParserConfig: LogParserConfig, logger: Logger) {
  const players$ = new BehaviorSubject<
    // Annoying to type, but this is accurate, player can be retrieved
    // using rcon or logs, but when retrieved using rcon,
    // it will merge with any previous existing player with matching eosID
    // (
    //   ObservableValue<(typeof playerUpdate$)>[number]
    // | ObservableValue<typeof logParser.events.playerConnected>
    //   & (
    //     Partial<ObservableValue<(typeof playerUpdate$)>[number]>
    //     & Partial<ObservableValue<typeof logParser.events.playerConnected>>
    //   )
    //   )[]
    // above bof...
    // {}
    Player[]
  >([]);
  const squads$ = new BehaviorSubject<Awaited<ReturnType<typeof rconSquad.getSquads>>>([]);


  // I've got both logs and and rcon to get player list.
  // logs should everything I need. But I may start squadTS in the middle of the game
  // meaning I first need to retrieve full player list with rcon at each start,
  // and enhance the data with logs
  // I can then base myself entirely on logs to update the player list.
  //
  // However, this only is possible if logs actually provide all the necessary data.
  // how do I know who is leader ?
  // how do I know who joined a squad ? team ?
  // I don't see any logs for that.

  // Update squads
  const squadUpdate$ = interval(config.updateInterval.playersAndSquads * 1000)
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

  const playerChangedSquad = new Subject<Player[]>();

  // pareil
  type C = Omit<
    Awaited<ReturnType<typeof rconSquad.getListPlayers>>[number],
    'squadId'
  > & {
    squad: Awaited<ReturnType<typeof rconSquad.getSquads>>[number];
  };
  type D = ObservableValue<typeof playerUpdate$>[number];
  var d:D; // contient nameWithTag et eosID, c suffisant.


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
        ...omit(player, ['squadID']),
        squad: squads$.getValue().find(
          // We need to check both id, because each team can have a squad one for example.
          squad =>
            squad.teamID === player.teamID &&
            squad.squadID === player.squadID
        )
      }));
    }),
    tap(updatedPlayers => {

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


      // Update `players$` after squads$ so we always take advantage of squads$ updates immediately.
      players$.next(
        players$.getValue().map(player => (
          // Find the corresponding player in updatedPlayers, and deep merge it.
          // If no player is found, ignore, probably a disconnect, log parser will handle this
          merge(player, updatedPlayers.find(p => p.eosID === player.eosID) || {})
        ))
      );
    })
  );


  const loginTimeout = 60 * 1000 + (logParserConfig.mode !== 'tail' ? logParserConfig.ftp.fetchInterval * 1000 : 0);

  // Add player through logs
  logParser.events.loginRequest.pipe(
    // Wait for matching playerConnected, for every login request, start an independent chain (concatMap)
    concatMap((loginRequest) => (
      logParser.events.playerConnected.pipe(
        filter(playerConnected => playerConnected.eosID === loginRequest.eosID),
        // Theoretical case where playerConnected isn't fired (failed login ?)
        // Add a timeout here to ensure the chain does not wait forever.
        // If playerConnected event doesn't fire in 60 seconds (in tail, +fetchInterval in ftp/sftp), terminate this chain.
        timeout(loginTimeout),
        // Send both events
        map(playerConnected => ({loginRequest, playerConnected})),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred (did the player failed to connect ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    )),
    concatMap(({loginRequest, ...rest}) => (
      logParser.events.playerAddedToTeam.pipe(
        filter(playerAddedToTeam => playerAddedToTeam.name === loginRequest.name),
        timeout(loginTimeout),
        map(playerAddedToTeam => ({loginRequest, playerAddedToTeam, ...rest})),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player not join a team ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    )),
    concatMap(({loginRequest, ...rest}) => (
      logParser.events.playerInitialized.pipe(
        filter(playerInitialized => playerInitialized.name === loginRequest.name),
        timeout(loginTimeout),
        map(playerInitialized => ({loginRequest, playerInitialized, ...rest})),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player not initialize ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    )),
    concatMap(({loginRequest, ...rest}) => (
      logParser.events.playerJoinSucceeded.pipe(
        filter(playerJoinSucceeded => playerJoinSucceeded.name === loginRequest.name),
        timeout(loginTimeout),
        map(playerJoinSucceeded => ({loginRequest, playerJoinSucceeded, ...rest})),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player failed to join ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    )),
  ).subscribe(({loginRequest, playerConnected, playerJoinSucceeded, playerAddedToTeam, playerInitialized}) => {
    // I believe there is a possibility for multiple subscribe to be called for the same player if
    // playerConnected or playerJoinSucceeded were cancelled. And player rejoined successfully before timeout.
    // Thanksfully the code bellow can be run multiple time and will give the same result.
    //
    // Maybe also, if another player joined with the same name and logs are out of order... we could get an unexpected behavior.
    // But there isn't much I can do about that, because playerJoined do not give an unique ID.

    // If RCON run more often than log parser, RCON may have already registered the player. So we merge it.
    const existingPlayer = players$.getValue().find(player => player.eosID === loginRequest.eosID);
    players$.next([
      ...players$.getValue().filter(player => player.eosID !== loginRequest.eosID),
      {
        ...existingPlayer,
        name: loginRequest.name,
        eosID: loginRequest.eosID,
        controller: playerConnected.playerController,
        steamID: playerConnected.steamID,
        ip: playerConnected.ip,
        teamID: playerAddedToTeam.teamID,
        id: playerInitialized.id - 1 // Seems like the log we get, is offset by one
      }
    ]);
  });

  // todo idea, behaviorSubject per player ? following actions per ID and name ?

  // todo wip
  logParser.events.playerDisconnected.subscribe(playerDisconnected => {
    // todo track disconnected, and reuse their data if reconnect
    players$.next(players$.getValue().filter(player => player.eosID !== playerDisconnected.eosID));
  });


  // todo, suad created event du tchat depuis rcon, existe aussi en logs ? le tchat c juste rcon ou logs aussi ?
  // par contre, créer c pas la meme chose que de changer de lead, donc different qd meme.

  // idea: do somekind of waiter, that emit only when all needed variable on player
  //       are set ?

  // todo: disconnectplayer, garder info sur eux et re-utiliser si reconnect.

  // todo in which case it will not find the player ?
  // we do rcon get list of players when logging in
  function getPlayerByName(name: string) {
    // `player.name` can be undefined, we don't want to match undefined in find and return a player
    // when `name` is undefined.
    if (name === undefined) {
      return undefined;
    }
    return players$.getValue().find(player => (player as any).name === name); // todo tmp
  }
  function getPlayerByEOSID(eosID: string) {
    if (eosID === undefined) {
      return undefined;
    }
    return players$.getValue().find(player => player.eosID === eosID);
  }

  return {
    /**
     * Events enriched in data using existing saved game status.
     */
    events: {
      ...logParser.events,
      playerChangedSquad,
      playerWounded: logParser.events.playerWounded.pipe(
        map(data => {
          return {
            ...data,
            victim: getPlayerByName(data.victim.nameWithClanTag),
            attacker: getPlayerByEOSID(data.attacker.eosID),
          }
        })
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
          ...getPlayerByName(data.nameWithClanTag),
          ...data
        }))
      ),
      playerKicked: rconSquad.chatEvents.playerKicked.pipe(
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
    // todo maybe export them from servers as "helpers"
    getPlayerByName,
    getPlayerByEOSID,
    players$,
    players: players$.getValue(),
    squads$,
    squads: squads$.getValue(),
    /**
     * Call before logParser are watching.
     * (todo: nope) For maximum efficiency. Should be called after rcon is connected but before logs are downloaded.
     */
    watch: async () => {

      // subscribing will start the interval of squad/players RCON updates.
      playerUpdate$.subscribe();

      // todo (logs vient du passé au début, faut corriger)
      // bon plus simple de ne pas géré pour l'instant.
      //
      // Initial logs are taken from the PAST, so the source of truth is rconSquad.getListPlayers
      /// ....

      // Initialise players$ data,
      // rconSquad.getListPlayers will give us up-to-date data on players.
      //
      //
      // We may also not get enough logs to have a complete list of players.
      // However, once SquadTS is started, we retrieve all logs and logs will be the source of true.
      // players$.next(await rconSquad.getListPlayers()); todo tmp

      // todo, maybe I actually should call this before getting logs from past ?
    },
  };
}
