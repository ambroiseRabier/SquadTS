import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { BehaviorSubject, concatMap, exhaustMap, interval, map, Observable } from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';
import { merge, omit } from 'lodash';


// interface Player {
//   teamID: string;
//   squadID: string;
//   name: string;
//   isLeader: string;
//   eoID: string;
//   steamID: string;
// }



type Player = {
  eosID: string;
  steamID: string;
  // null means no team (not sure if actually possible)
  teamID?: string|null;
  // squadID?: string|null;
  name?: string; // todo: je le recup où lui...
  isLeader?: boolean;
  // null means no squad
  squad?: {
    teamID: string;
    squadID: string;
    name: string;
  };
  playerController?: string;
  ip?: string;
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


export type CachedGameStatus = ReturnType<typeof useCachedGameStatus>;

/**
 * Keep track of the game status, like players, layers, squad list.
 */
export function useCachedGameStatus(rconSquad: RconSquad, logParser: LogParser) {
  const players$ = new BehaviorSubject<
    // Annoying to type, but this is accurate, player can be retrieved
    // using rcon or logs, but when retrieved using rcon,
    // it will merge with any previous existing player with matching eosID
    (
      ObservableValue<(typeof playerUpdate$)>[number]
    | ObservableValue<typeof logParser.events.playerConnected>
      & (
        Partial<ObservableValue<(typeof playerUpdate$)>[number]>
        & Partial<ObservableValue<typeof logParser.events.playerConnected>>
      )
      )[]
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
  const squadUpdate$ = interval(30 * 1000)
    .pipe(
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
        ...omit(player, ['squadID']),
        squad: squads$.getValue().find(
          // We need to check both id, because each team can have a squad one for example.
          squad =>
            squad.teamID === player.teamID &&
            squad.squadID === player.squadID
        )
      }));
    })
  );
  playerUpdate$.subscribe(updatedPlayers => {
    // Update `players$` after squads$ so we always take advantage of squads$ updates immediately.
    players$.next(
      players$.getValue().map(player => (
        // Find the corresponding player in updatedPlayers, and deep merge it.
        // If no player is found, leave as is, probably a disconnect, log parser will handle this
        merge(player, updatedPlayers.find(p => p.eosID === player.eosID) || {})
      ))
    );
  });


  // todo wip
  logParser.events.playerConnected.subscribe(playerConnected => {
    // const current = players$.getValue();
    // Everyone has an eosID, I suppose ?
    // const player = current.find(
    //   player => playerConnected.eosID === player.eosID
    // );
    // player.playerController = playerConnected.playerController;
    // player.ip = playerConnected.ip; // ok alros soucis, car player co pas pareil que playerlist...

    // snippet useful elsewhere for sure...
    // Update informations on player that ... (yeah connected, so it is a new player by def !!
    // const updated = current.map(player =>
    //   player.eosID === playerConnected.eosID
    //     ? {
    //       ...player, // Spread operator to maintain immutability
    //       playerController: playerConnected.playerController,
    //       ip: playerConnected.ip,
    //     }
    //     : player // Preserve the other players without changes
    // );

    players$.next([
      ...players$.getValue(),
      playerConnected
    ]);
  });

  logParser.events.playerDisconnected.subscribe(playerDisconnected => {
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
    return players$.getValue().find(player => player.name === name);
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
      playerWounded: logParser.events.playerWounded.pipe(
        map(data => {
          return {
            ...data,
            victim: getPlayerByName(data.victimName),
            attacker: getPlayerByEOSID(data.attacker.eosID),
          }
        })
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
     * Call after rcon and logParser are watching.
     * (todo: nope) For maximum efficiency. Should be called after rcon is connected but before logs are downloaded.
     */
    watch: async () => {
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
      players$.next(await rconSquad.getListPlayers());
    },
  };
}
