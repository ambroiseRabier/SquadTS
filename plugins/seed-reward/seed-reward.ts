import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { SeedRewardOptions } from './seed-reward.config';
import { SeedingRecord, useSeedRewardDB } from './seed-reward.db';
import { useAdminFileManager } from './admin-file-manager';
import path from 'path';
import { Player } from '../../src/cached-game-status/use-cached-game-status';
import { PROJECT_ROOT } from '../../src/config/path-constants.mjs';
import { ServerConfigFile } from '../../src/squad-config/use-squad-config';
import { filter } from 'rxjs';
import fs from 'node:fs';

const seedReward: SquadTSPlugin<SeedRewardOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  // Handle absolute and relative paths.
  const normalizedPath = path.normalize(options.sqliteDatabasePath);
  const sqlitePath = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(PROJECT_ROOT, normalizedPath);

  // Create the directory if it is missing.
  await fs.promises.mkdir(path.parse(sqlitePath).dir, { recursive: true });

  const db = useSeedRewardDB(sqlitePath);
  db.init();

  const adminManager = useAdminFileManager(
    async () => server.squadConfig.rawFetch(ServerConfigFile.Admins),
    async content => server.squadConfig.rawUpload(ServerConfigFile.Admins, content),
    logger
  );
  const playerTimers = new Map<string, NodeJS.Timeout>();
  const activeSeeders = new Set<string>();

  const checkAndRewardPlayer = async (eosID: string) => {
    const record = await db.getPlayer(eosID);
    // We pull latest record from database, since we only call checkAndRewardPlayer
    // when we already have a record, there should be a record.
    // Records are not removed, so if it exist once, it exist forever.
    if (!record) {
      throw new Error(`Player ${eosID} not found in database`);
    }

    const unusedTime = record.totalSeedTime - record.consumedTime;
    if (unusedTime >= options.seedDuration * 60) {
      const player = server.players.find(p => p.eosID === eosID);
      // If the player disconnected, we don't want to whitelist when he is absent, he wouldn't know about his reward.
      if (!player) {
        return;
      }

      // Handles dates without timezone.
      const expiryDate = new Date(Date.now() + options.whiteListDuration * 24 * 60 * 60 * 1000);

      await adminManager.updateOrAddWhitelist(player.steamID, record.displayName, expiryDate);

      db.upsertPlayer({
        ...record,
        consumedTime: record.consumedTime + options.seedDuration * 60,
        lastWhitelistGrant: Date.now(),
      });

      await server.rcon.broadcast(
        options.seedRewardBroadcastMessage
          .replace('%playerName%', record.displayName)
          .replace('%whiteListDuration%', options.whiteListDuration.toString())
      );

      await server.rcon.warn(
        player.eosID,
        options.seedRewardMessage.replace(
          '%whiteListDuration%',
          options.whiteListDuration.toString()
        )
      );
    }
  };

  const startTracking = async (player: Player) => {
    if (!server.info.isSeed) {
      throw new Error('Cannot start tracking in non-seed mode');
    }

    activeSeeders.add(player.eosID);

    let record = db.getPlayer(player.eosID);

    // Update the record or make a new one if it is the first time the player join seed.
    if (record) {
      record.lastSeenInSeed = Date.now();
      record.displayName = server.helpers.getPlayerDisplayName(player);
    } else {
      record = {
        eosID: player.eosID,
        steamID: player.steamID,
        // displayName is only for human readability.
        displayName: server.helpers.getPlayerDisplayName(player),
        totalSeedTime: 0,
        consumedTime: 0,
        lastSeenInSeed: Date.now(),
      };
    }

    db.upsertPlayer(record);

    // Send the initial thanks message after delay
    setTimeout(async () => {
      if (activeSeeders.has(player.eosID)) {
        const currentRecord = db.getPlayer(player.eosID);
        if (currentRecord) {
          const unusedTime = currentRecord.totalSeedTime - currentRecord.consumedTime;
          const percent = Math.floor((unusedTime / (options.seedDuration * 60)) * 100);

          await server.rcon.warn(
            player.eosID,
            options.thanksMessage
              .replace('%whiteListDuration%', options.whiteListDuration.toString())
              .replace('%percent%', percent.toString())
          );
        }
      }
    }, options.thanksMessageDelay * 1000);

    // Set up progress update timer
    const timer = setInterval(
      async () => {
        if (activeSeeders.has(player.eosID)) {
          const currentRecord = await db.getPlayer(player.eosID);
          if (currentRecord) {
            const unusedTime = currentRecord.totalSeedTime - currentRecord.consumedTime;
            const percent = Math.floor((unusedTime / (options.seedDuration * 60)) * 100);

            await server.rcon.warn(
              player.eosID,
              options.seedProgressionMessage.replace('%percent%', percent.toString())
            );
          }
        }
      },
      options.seedProgressionMessageInterval * 60 * 1000
    );

    playerTimers.set(player.eosID, timer);
  };

  const stopTracking = async (eosID: string) => {
    if (!activeSeeders.has(eosID)) {
      throw new Error(`Player ${eosID} is not active in seed`);
    }

    const timer = playerTimers.get(eosID);
    if (timer) {
      clearInterval(timer);
      playerTimers.delete(eosID);
    }

    // We do not upsert the player when we stop tracking, this can result in a loss of less than
    // one minute seed time for the player. That is okay, as it reduce this plugin complexity.

    activeSeeders.delete(eosID);
  };

  // Check for expired whitelists every hour
  const checkExpiredWhitelists = async () => {
    const now = Date.now();
    const expiryMs = options.whiteListDuration * 24 * 60 * 60 * 1000;

    const records = await db.getAllWithWhitelist();
    const expiredSteamIDs = records
      .filter(record => record.lastWhitelistGrant && now - record.lastWhitelistGrant > expiryMs)
      .map(record => {
        logger.info(`Whitelist expired for ${record.displayName} (${record.steamID})`);
        return record.steamID;
      });

    if (expiredSteamIDs.length > 0) {
      await adminManager.removeWhitelists(expiredSteamIDs);
      logger.info(`Removed ${expiredSteamIDs.length} expired whitelists`);
    }
  };

  // Set up intervals
  const whitelistCheckInterval = setInterval(checkExpiredWhitelists, 60 * 60 * 1000);

  const updateActiveSeeders = async () => {
    // Do nothing if there is no seeder
    if (activeSeeders.size === 0) {
      return;
    }

    const now = Date.now();
    const records = [...activeSeeders]
      .map(eosID => db.getPlayer(eosID))
      .filter((r): r is SeedingRecord => !!r)
      .map(record => ({
        ...record,
        totalSeedTime: record.totalSeedTime + 1,
        lastSeenInSeed: now,
      }));

    // Update all at once
    db.upsertPlayers(records);

    // Check rewards after batch update
    for (const record of records) {
      await checkAndRewardPlayer(record.eosID);
    }
  };

  // Update active seeders every minute
  const updateInterval = setInterval(updateActiveSeeders, 60 * 1000);

  // Handle player joins/leaves
  server.players$.pipe(filter(() => server.info.isSeed)).subscribe(async players => {
    // Start tracking new players
    for (const player of players) {
      if (!activeSeeders.has(player.eosID)) {
        await startTracking(player);
      }
    }

    // Stop tracking disconnected players
    for (const eosID of activeSeeders) {
      if (!players.some(p => p.eosID === eosID)) {
        await stopTracking(eosID);
      }
    }
  });

  // Handle seed mode changes
  server.info$.subscribe(async info => {
    if (info.isSeed) {
      // Start tracking all current players
      for (const player of server.players) {
        if (!activeSeeders.has(player.eosID)) {
          await startTracking(player);
        }
      }
    } else {
      // Stop tracking all players
      for (const eosID of [...activeSeeders]) {
        await stopTracking(eosID);
      }
    }
  });

  // Run initial whitelist check
  await checkExpiredWhitelists();

  // Cleanup function
  return async () => {
    clearInterval(whitelistCheckInterval);
    clearInterval(updateInterval);

    // Clear all player timers
    for (const timer of playerTimers.values()) {
      clearInterval(timer);
    }
    playerTimers.clear();

    // Stop tracking all players
    for (const eosID of [...activeSeeders]) {
      await stopTracking(eosID);
    }

    db.close();
  };
};

export default seedReward;
