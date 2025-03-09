import { Server, Socket } from 'socket.io';
import { delay, filter, map, race, Subscription, switchMap, take } from 'rxjs';
import { SquadServer } from '../../src/squad-server';
import { DaveWhitelisterSocketIoOptions } from './dave-whitelister-socket-io.config';
import { Logger } from 'pino';
import * as util from 'node:util';
// import { createServer } from 'http';

/**
 * Only for usage by https://github.com/fantinodavide/Squad_Whitelister
 * Offer the same API as SquadJS.
 *
 * Client example:
 *
 *       const socket = io.connect('ws://IP:PORT', {
 *         auth: {
 *           token: "MySecretPassword"
 *         }
 *       })
 */
export function useSocketIO(
  server: SquadServer,
  options: DaveWhitelisterSocketIoOptions,
  logger: Logger
) {
  function setEmissions(socket: Socket) {
    const subs: Subscription[] = [];
    // idea: maybe a per player observable would allow to refactor that in a more readable code?
    subs.push(
      server.events.playerConnected
        .pipe(
          switchMap(playerConnected => {
            // Wait for nameWithClanTag to be set
            const waitForClanTag = server.players$.pipe(
              filter(
                players =>
                  players.find(player => player.eosID === playerConnected.eosID)
                    ?.nameWithClanTag !== undefined
              ),
              map(players => ({
                ...playerConnected,
                // Since we wait for nameWithClanTag, the player from players will be more up-to-date
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                ...players.find(player => player.eosID === playerConnected.eosID)!,
              })),
              take(1)
            );
            // Or disconnect to happen before RCON ListPlayers run and give us nameWithClanTag
            const disconnect = server.events.playerDisconnected.pipe(
              filter(data => data.player.eosID === playerConnected.eosID),
              map(data => data.player)
            );

            return race(waitForClanTag, disconnect);
          })
        )
        .subscribe(player => {
          logger.debug(`PLAYER_CONNECTED (${player.nameWithClanTag})`);
          // Used for: Updating player data, sending welcome messages
          socket.emit('PLAYER_CONNECTED', {
            player: {
              ...player,
              name: player.nameWithClanTag,
            },
          });
        })
    );

    subs.push(
      server.events.playerDisconnected
        .pipe(
          // Since we use playerDisconnected in playerConnected,
          // We give a small delay to make sure this is called after, as getting disconnect before connected
          // may be really confusing for the client.
          delay(0)
        )
        .subscribe(data => {
          logger.debug(`PLAYER_DISCONNECTED (${data.player.nameWithClanTag})`);
          console.log(data);
          // Used for: Updating player data
          socket.emit('PLAYER_DISCONNECTED', {
            player: {
              ...data.player,
              name: data.player.nameWithClanTag,
            },
          });
        })
    );

    subs.push(
      server.chatEvents.message.subscribe(data => {
        logger.debug(`CHAT_MESSAGE (${data.message})`);
        // Used for: Processing commands and linking codes
        socket.emit('CHAT_MESSAGE', {
          ...data,
          player: {
            ...data.player,
            name: data.player.nameWithClanTag,
          },
        });
      })
    );

    return subs;
  }

  logger.info('Opening socket.io server');

  // Sufficient for socket.io, no need of a httpServer.
  const io = new Server(options.websocketPort);
  // const httpServer = createServer();
  // const io = new Server(httpServer, {
  //   cors: {
  //     origin: `http://localhost:${options.websocketPort}`,
  //     methods: ['GET', 'POST']
  //   }
  // });
  // httpServer.listen(options.websocketPort);

  io.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token === options.securityToken) {
      next();
    } else {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', socket => {
    logger.info('Client connected.');

    const subs = setEmissions(socket);

    // No typing, much confusion, first param is for data, and second server as callback for a response.
    socket.on('rcon.warn', async (data: { steamID: string; message: string }, acknowldedgeCb) => {
      logger.debug(`rcon.warn ${util.inspect(data, false, null, true)}`);
      const res = await server.rcon.warn(data.steamID, data.message);
      acknowldedgeCb(res);
    });
    socket.on('rcon.getListPlayers', (data, acknowldedgeCb) => {
      logger.debug('rcon.getListPlayers');
      // return server.rcon.getListPlayers();
      // more data, and also is instant, but may be slightly out of date.
      const res = server.players
        // only taking players with nameWithClanTag, mean we will have to await
        // for RCON ListPlayers to be called in addition to player connected logs.
        .filter(player => player.nameWithClanTag !== undefined)
        // The whitelister expects nameWithClanTag in name.
        .map(player => ({ ...player, name: player.nameWithClanTag }));
      acknowldedgeCb(res);
    });

    socket.on('disconnect', reason => {
      logger.info(`Client disconnected (${reason}).`);
      subs.forEach(sub => sub.unsubscribe());
    });

    socket.on('error', data => {
      logger.error(`Error: ${util.inspect(data, false, null, true)}`);
    });
  });

  return {
    close: async () => {
      logger.info('Closing socket.io server');
      // Both needed.
      // httpServer.close();
      await io.close();
    },
  };
}
