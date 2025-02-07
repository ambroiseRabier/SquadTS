import { LogParser } from '../log-parser/use-log-parser';
import { LogParserConfig } from '../log-parser/log-parser.config';
import { catchError, concatMap, EMPTY, filter, map, Subject, Subscription, tap, timeout } from 'rxjs';
import { Logger } from 'pino';
import { Player, Squad } from './use-cached-game-status';

interface Props {
  logParser: LogParser;
  logParserConfig: LogParserConfig;
  logger: Logger;
  getPlayers: () => Player[];
  getSquads: () => Squad[];
}

export function useLogUpdates({
                                logParser,
                                logParserConfig,
                                logger,
                                getPlayers,
                                getSquads,
                              }: Props)
{
  const players$ = new Subject<Player[]>();
  const loginTimeout = 60 * 1000 + (logParserConfig.mode !== 'tail' ? logParserConfig.ftp.fetchInterval * 1000 : 0);

  // Add player through logs
  const addPlayer$ = logParser.events.loginRequest.pipe(
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
    tap(({loginRequest, playerConnected, playerJoinSucceeded, playerAddedToTeam, playerInitialized}) => {
      // I believe there is a possibility for multiple subscribe to be called for the same player if
      // playerConnected or playerJoinSucceeded were cancelled. And player rejoined successfully before timeout.
      // Thanksfully the code bellow can be run multiple time and will give the same result.
      //
      // Maybe also, if another player joined with the same name and logs are out of order... we could get an unexpected behavior.
      // But there isn't much I can do about that, because playerJoined do not give an unique ID.

      // If RCON run more often than log parser, RCON may have already registered the player. So we merge it.
      const existingPlayer = getPlayers().find(player => player.eosID === loginRequest.eosID);
      players$.next([
        ...getPlayers().filter(player => player.eosID !== loginRequest.eosID),
        {
          ...existingPlayer,
          name: loginRequest.name,
          eosID: loginRequest.eosID,
          controller: playerConnected.controller,
          steamID: playerConnected.steamID,
          ip: playerConnected.ip,
          teamID: playerAddedToTeam.teamID as '1' | '2',
          id: (parseInt(playerInitialized.id) - 1).toString(), // Seems like the log we get, is offset by one
          // When you join a game, you aren't leader
          isLeader: false,
          // When you join a game, you aren't in a squad
          squadID: undefined,
          squad: undefined,
        }
      ]);
    })
  );

  // Note that we may have player disconnected events without ever having a connect event, because logs
  // can start being read at any time.
  // Remove players through logs
  const removePlayer$ = logParser.events.playerDisconnected.pipe(
    tap(playerDisconnected => {
      // todo track disconnected, and reuse their data if reconnect
      players$.next(getPlayers().filter(player => player.eosID !== playerDisconnected.eosID));
    })
  );
  const sub: Subscription[] = [];

  return {
    players$,
    watch: () => {
      // Will start adding and removing player in cache
      sub.push(
        addPlayer$.subscribe(),
        removePlayer$.subscribe()
      );
    },
    unwatch() {
      sub.forEach(sub => sub.unsubscribe());
    }
  };
}
