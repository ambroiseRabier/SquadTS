import Database from 'better-sqlite3';

export interface SeedingRecord {
  eosID: string;
  steamID: string;
  displayName: string;
  totalSeedTime: number; // in minutes
  consumedTime: number; // in minutes
  lastSeenInSeed: number; // timestamp
  lastWhitelistGrant?: number; // timestamp
}

export function useSeedRewardDB(dbPath: string) {
  const db = new Database(dbPath, { fileMustExist: false });

  // Enable WAL mode for better concurrent access (note: IA suggestion, haven't confirmed this)
  /*
   * WAL (Write-Ahead Logging) is a SQLite journaling mode that:
   * 1. Allows multiple readers to access the database while a writer is active
   * 2. Makes writes faster because they're appended to a log file instead of modifying the main database file directly
   * 3. Provides better crash recovery
   * The default SQLite journaling mode ("delete") blocks all readers when a writer is active. With WAL mode:
   * Readers see a consistent snapshot of the database
   * Writers don't block readers
   * Multiple processes can access the database safely
   * This is particularly useful for our plugin because:
   * 1. We're frequently updating seeding times
   * 2. We need to read the database to check for rewards/expiry
   * 3. Multiple plugin instances might share the same database (as mentioned in the config description)
   * The tradeoff is that WAL mode uses slightly more disk space for the log file, but the performance and concurrency benefits usually outweigh this.
   * */
  db.pragma('journal_mode = WAL');

  const init = () => {
    // Note: sync operation, but this is file since SQLite operations are CPU-bound
    //       and better-sqlite3 uses native code which doesn't block NodeJS event loop.
    db.exec(`
      CREATE TABLE IF NOT EXISTS seeding_records (
        eosID TEXT PRIMARY KEY,
        steamID TEXT NOT NULL,
        nameWithClanTag TEXT NOT NULL,
        totalSeedTime INTEGER NOT NULL,
        consumedTime INTEGER NOT NULL,
        lastSeenInSeed INTEGER NOT NULL,
        lastWhitelistGrant INTEGER
      )
    `);
  };

  // Prepare statements for better performance
  const upsertStatement = db.prepare(`
    INSERT INTO seeding_records 
    (eosID, steamID, nameWithClanTag, totalSeedTime, consumedTime, lastSeenInSeed, lastWhitelistGrant)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(eosID) DO UPDATE SET
      nameWithClanTag = ?,
      totalSeedTime = ?,
      consumedTime = ?,
      lastSeenInSeed = ?,
      lastWhitelistGrant = ?
  `);
  const getPlayerStatement = db.prepare('SELECT * FROM seeding_records WHERE eosID = ?');
  const getAllWithWhitelistStatement = db.prepare(
    'SELECT * FROM seeding_records WHERE lastWhitelistGrant IS NOT NULL'
  );

  function upsertPlayer(record: SeedingRecord) {
    return upsertStatement.run(
      record.eosID,
      record.steamID,
      record.displayName,
      record.totalSeedTime,
      record.consumedTime,
      record.lastSeenInSeed,
      record.lastWhitelistGrant,
      record.displayName,
      record.totalSeedTime,
      record.consumedTime,
      record.lastSeenInSeed,
      record.lastWhitelistGrant
    );
  }

  return {
    init,
    upsertPlayers: (records: SeedingRecord[]) => {
      // Use transaction for batch updates
      db.transaction(() => {
        for (const record of records) {
          upsertPlayer(record);
        }
      });
    },
    upsertPlayer,
    getPlayer: (eosID: string): SeedingRecord | undefined => {
      return getPlayerStatement.get(eosID) as SeedingRecord | undefined;
    },
    getAllWithWhitelist: (): SeedingRecord[] => {
      return getAllWithWhitelistStatement.all() as SeedingRecord[];
    },
    close: () => db.close(),
  };
}
