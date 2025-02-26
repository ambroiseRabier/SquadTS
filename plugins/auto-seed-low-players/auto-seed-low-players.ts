import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { AutoSeedLowPlayers } from './auto-seed-low-players.config';
import { filter } from 'rxjs';
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
      .replace('%nextLayer%', nextLayer)
      .replace('%threshold%', options.playerThreshold.toString());

    await server.rcon.broadcast(message);

    // Also warn each player individually
    for (const player of server.players) {
      await server.rcon.warn(player.eosID, message);
    }
  };

  // Function to change map
  const changeMap = async () => {
    if (isChangingMap) {
      return;
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
    } catch (error) {
      logger.error('Failed to change map:', error);
    } finally {
      isChangingMap = false;
    }
  };

  // Function to handle low player count
  const handleLowPlayerCount = () => {
    if (lowPlayerTimeout) return; // Already waiting

    lowPlayerTimeout = setTimeout(
      async () => {
        // Double check player count before changing map
        if (server.players.length <= options.playerThreshold) {
          await changeMap();
        }
        lowPlayerTimeout = null;
      },
      options.duration * 60 * 1000
    ); // Convert minutes to milliseconds
  };

  // Function to cancel low player count timeout
  const cancelLowPlayerCount = () => {
    if (lowPlayerTimeout) {
      clearTimeout(lowPlayerTimeout);
      lowPlayerTimeout = null;
    }
  };

  const onPlayerCountChange = async (players: Player[]) => {
    if (players.length <= options.playerThreshold && !server.info.isSeed) {
      // Broadcast message when going below threshold
      const message = options.broadcastMessages.bellowThreshold
        .replace('%playerThreshold%', options.playerThreshold.toString())
        .replace('%duration%', formatDuration({ minutes: options.duration }));
      await server.rcon.broadcast(message);

      handleLowPlayerCount();
    } else {
      cancelLowPlayerCount();
    }
  };

  // Subscribe to player count changes
  server.players$.pipe(filter(() => !isChangingMap)).subscribe(onPlayerCountChange);

  // Once at startup
  await onPlayerCountChange(server.players);

  // Cleanup function
  return async () => {
    cancelLowPlayerCount();
  };
};

export default autoSeedLowPlayers;
