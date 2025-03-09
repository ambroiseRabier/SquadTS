import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { AutoSeedLowPlayers } from './auto-seed-low-players.config';
import { concatMap, filter, firstValueFrom } from 'rxjs';
import { formatDuration } from 'date-fns';
import { Player } from '../../src/cached-game-status/use-cached-game-status';

const autoSeedLowPlayers: SquadTSPlugin<AutoSeedLowPlayers> = async (
  server,
  connectors,
  logger,
  options
) => {
  let lowPlayerTimeout: NodeJS.Timeout | null = null;
  let isChangingMap = false;

  // Function to pick a random seed layer
  const getRandomSeedLayer = () => {
    const index = Math.floor(Math.random() * options.seedLayers.length);
    return options.seedLayers[index];
  };

  // Function to broadcast and warn players about map change
  const announceMapChange = async (nextLayer: string) => {
    const message = options.broadcastMessages.beforeChangeMap
      .replaceAll('%nextLayer%', nextLayer)
      .replaceAll('%threshold%', options.playerThreshold.toString());

    await server.rcon.broadcast(message);

    // Also warn each player individually
    for (const player of server.players) {
      await server.rcon.warn(player.eosID, message);
    }
  };

  // Function to change map
  const changeMap = async () => {
    if (isChangingMap) {
      // should not happen, since we ignore any events when we are changing map.
      throw new Error('Change map called while already changing map.');
    }
    isChangingMap = true;

    try {
      const nextLayer = getRandomSeedLayer();
      logger.info(`Changing map to seed layer: ${nextLayer}`);

      // Announce map change
      await announceMapChange(nextLayer);

      // Wait 10 seconds before changing map (as mentioned in config description)
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Change the map
      await server.rcon.execute(`AdminChangeLayer ${nextLayer}`);

      // Wait for new game events
      await firstValueFrom(server.events.newGame);

      // Wait for server info to be updated also (or server.info.isSeed will return a wrong value)
      await firstValueFrom(server.info$);
    } catch (error) {
      logger.error('Failed to change map:', error);
    } finally {
      isChangingMap = false;
    }
  };

  // Function to handle low player count
  const handleLowPlayerCount = async () => {
    lowPlayerTimeout = setTimeout(
      async () => {
        // After a few minutes...
        // - Double-check the player count.
        // - Check if the map is not already in Seed. A admin could have changed the map manually before the timeout.
        if (server.players.length <= options.playerThreshold && !server.info.isSeed) {
          await changeMap();
        }
        lowPlayerTimeout = null;
      },
      // Convert minutes to milliseconds
      options.duration * 60 * 1000
    );

    // Broadcast after settings timeout, to avoid possible double broadcast.
    // Broadcast message when going below threshold (only once when lowPlayerTimeout starts, and not on every player count change)
    const message = options.broadcastMessages.bellowThreshold
      .replaceAll('%playerThreshold%', options.playerThreshold.toString())
      .replaceAll('%duration%', formatDuration({ minutes: options.duration }));
    await server.rcon.broadcast(message);
  };

  // Function to cancel low player count timeout
  const cancelLowPlayerCount = () => {
    if (lowPlayerTimeout) {
      clearTimeout(lowPlayerTimeout);
      lowPlayerTimeout = null;
    }
  };

  const onPlayerCountChange = async (players: Player[]) => {
    if (players.length <= options.playerThreshold) {
      // If the countdown to changeMap has not already been started, start it.
      if (!lowPlayerTimeout) {
        await handleLowPlayerCount();
      }
    } else {
      cancelLowPlayerCount();
    }
  };

  // Once at startup
  // Note: isChangingMap cannot be true at startup.
  if (!server.info.isSeed) {
    await onPlayerCountChange(server.players);
  }

  // Subscribe to player count changes
  let totalPlayers = server.players.length;
  server.players$
    .pipe(
      // Ignore if we are already in seed
      filter(() => !server.info.isSeed),

      // ignore all player count change events if we are changing map to seed.
      filter(() => !isChangingMap),

      // Check if player count has changed (server.players$ emit for any change in players)
      filter(players => {
        const changed = players.length !== totalPlayers;
        totalPlayers = players.length;
        return changed;
      }),

      // Instead of putting onPlayerCountChange in subscribe, where it may run concurrently!
      // We place it in concatMap, guaranteing sequential execution.
      concatMap(onPlayerCountChange)
    )
    .subscribe();

  // Cleanup function
  return async () => {
    cancelLowPlayerCount();
  };
};

export default autoSeedLowPlayers;
