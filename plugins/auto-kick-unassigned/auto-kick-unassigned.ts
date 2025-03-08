import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { AutoKickUnassignedOptions } from './auto-kick-unassigned.config';
import { formatDuration, intervalToDuration } from 'date-fns';

interface PlayerTimeout {
  timeout: NodeJS.Timeout;
  warningInterval: NodeJS.Timeout;
  unassignedSince: number; // timestamp
}

const autoKickUnassigned: SquadTSPlugin<AutoKickUnassignedOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const playerTimeouts = new Map<string, PlayerTimeout>();

  // Check at startup
  for (const player of server.players) {
    if (!player.squad) {
      await startUnassignedTimer(player.eosID);
    }
  }

  function clearPlayerTimeout(eosID: string) {
    const timeoutData = playerTimeouts.get(eosID);
    if (timeoutData) {
      clearTimeout(timeoutData.timeout);
      clearInterval(timeoutData.warningInterval);
      playerTimeouts.delete(eosID);
    }
  }

  async function startUnassignedTimer(eosID: string) {
    // Don't start timer if we're in seed and it's disabled
    if (!options.enabledInSeed && server.info.isSeed) {
      return;
    }

    // Check the player threshold
    const players = server.players;
    if (players.length < options.playerThreshold) {
      return;
    }
    logger.trace(`Starting unassigned timer for player ${eosID}`);

    clearPlayerTimeout(eosID);

    const unassignedSince = Date.now();

    // Kick timeout
    const kickTimeout = setTimeout(async () => {
      const player = server.helpers.getPlayerByEOSID(eosID);
      if (player && !player.squad) {
        await server.rcon.kick(
          eosID,
          options.kickMessage.replace(
            '%unassignedTimeout%',
            formatDuration({ seconds: options.unassignedTimeout }, { zero: true })
          )
        );
        logger.info(
          `Kicked player ${player.nameWithClanTag} (${player.eosID}) for not joining a squad in time.`
        );
      }
      clearPlayerTimeout(eosID);
    }, options.unassignedTimeout * 1000);

    // Warn interval
    const warningInterval = setInterval(async () => {
      const player = server.helpers.getPlayerByEOSID(eosID);
      if (player && !player.squad) {
        const start = Date.now();
        const end = unassignedSince + options.unassignedTimeout * 1000;
        const duration = formatDuration(intervalToDuration({ start, end }), { zero: true });

        if (start >= end) {
          // skip if duration is 0 or inferior, no point warning a player that he will be kicked in less than a tick.
          return;
        }

        await server.rcon.warn(eosID, options.warnMessage.replaceAll('%remainingTime%', duration));
        logger.debug(
          `Warned player ${player.nameWithClanTag} (${player.eosID}) for being unassigned.`
        );
      } else {
        clearPlayerTimeout(eosID);
      }
    }, options.warnMessageInterval * 1000);

    playerTimeouts.set(eosID, {
      timeout: kickTimeout,
      warningInterval,
      unassignedSince,
    });
  }

  // Monitor player squad changes
  server.events.playersSquadChange.subscribe(async players => {
    for (const player of players) {
      if (!player.squad) {
        await startUnassignedTimer(player.eosID);
      } else {
        clearPlayerTimeout(player.eosID);
      }
    }
  });

  // Check new joining players
  server.addPlayer$.subscribe(async player => {
    // If RCON update is faster than log update, player may already have joined the squad
    if (!player.squad) {
      await startUnassignedTimer(player.eosID);
    }
  });

  // Clear timeouts when players disconnect
  server.events.playerDisconnected.subscribe(data => {
    clearPlayerTimeout(data.player.eosID);
  });

  // Handle server population changes
  server.events.playerConnected.subscribe(async () => {
    if (server.players.length < options.playerThreshold) {
      // Clear all timeouts when server goes below the threshold
      for (const eosID of playerTimeouts.keys()) {
        clearPlayerTimeout(eosID);
      }
    }
  });

  return async () => {
    // Clean up all timeouts
    for (const eosID of playerTimeouts.keys()) {
      clearPlayerTimeout(eosID);
    }
  };
};

export default autoKickUnassigned;
