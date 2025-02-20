import { catchError, concatMap, EMPTY, filter, map, timeout } from 'rxjs';
import { LogParser } from '../log-parser/use-log-parser';
import { LogParserConfig } from '../log-parser/log-parser.config';
import { Logger } from 'pino';

/**
 * Far more valuable than `playerConnected`, as it provides significantly more detailed information.
 * It is based on 5 consecutive logs
 */
export function obtainEnteringPlayer(
  events: LogParser['events'],
  logParserConfig: LogParserConfig,
  logger: Logger
) {
  const chainTimeout =
    60 * 1000 + (logParserConfig.mode !== 'tail' ? logParserConfig.ftp.fetchInterval * 1000 : 0);

  const addPlayer$ = events.loginRequest.pipe(
    // Wait for matching playerConnected, for every login request, start an independent chain (concatMap)
    concatMap(loginRequest =>
      events.playerConnected.pipe(
        filter(playerConnected => playerConnected.eosID === loginRequest.eosID),
        // Theoretical case where playerConnected isn't fired (failed login ?)
        // Add a timeout here to ensure the chain does not wait forever.
        // If playerConnected event doesn't fire in 60 seconds (in tail, +fetchInterval in ftp/sftp), terminate this chain.
        timeout(chainTimeout),
        // Send both events
        map(playerConnected => ({ loginRequest, playerConnected })),
        // Handle the timeout error
        catchError(err => {
          logger.error(
            `Timeout occurred (did the player failed to connect ?): ${err.message}`,
            err
          );
          return EMPTY; // Emit nothing
        })
      )
    ),
    concatMap(({ loginRequest, ...rest }) =>
      events.playerAddedToTeam.pipe(
        filter(playerAddedToTeam => playerAddedToTeam.name === loginRequest.name),
        timeout(chainTimeout),
        map(playerAddedToTeam => ({
          loginRequest,
          playerAddedToTeam,
          ...rest,
        })),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player not join a team ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    ),
    concatMap(({ loginRequest, ...rest }) =>
      events.playerInitialized.pipe(
        filter(playerInitialized => playerInitialized.name === loginRequest.name),
        timeout(chainTimeout),
        map(playerInitialized => ({
          loginRequest,
          playerInitialized,
          ...rest,
        })),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player not initialize ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    ),
    concatMap(({ loginRequest, ...rest }) =>
      events.playerJoinSucceeded.pipe(
        filter(playerJoinSucceeded => playerJoinSucceeded.name === loginRequest.name),
        timeout(chainTimeout),
        map(playerJoinSucceeded => ({
          loginRequest,
          playerJoinSucceeded,
          ...rest,
        })),
        // Handle the timeout error
        catchError(err => {
          logger.error(`Timeout occurred  (did the player failed to join ?): ${err.message}`, err);
          return EMPTY; // Emit nothing
        })
      )
    ),
    // Merging into one player
    map(
      ({
        loginRequest,
        playerConnected,
        // Make it visible it is unused. And that map use the output of 5 events.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        playerJoinSucceeded,
        playerAddedToTeam,
        playerInitialized,
      }) => {
        // I believe there is a possibility for multiple subscribe to be called for the same player if
        // playerConnected or playerJoinSucceeded were cancelled. And player rejoined successfully before timeout.
        // Thanksfully the code bellow can be run multiple time and will give the same result.
        //
        // Maybe also, if another player joined with the same name and logs are out of order... we could get an unexpected behavior.
        // But there isn't much I can do about that, because playerJoined do not give an unique ID.

        return {
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
        };
      }
    )
  );

  return addPlayer$;
}
