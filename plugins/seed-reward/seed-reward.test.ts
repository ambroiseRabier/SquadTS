import { afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';
import {
  defaultServerInfo,
  setRconMock,
  TestServer,
  useTestServer,
} from '../../src/plugin-test-helper/plugin-test-helper';
import path from 'path';
import fs from 'fs';
import { SeedRewardOptions } from './seed-reward.config';
import { PROJECT_ROOT } from '../../src/config/path-constants.mjs';

describe('seed-reward', () => {
  const mockExecute = vi.fn();
  const dbPath = path.resolve(PROJECT_ROOT, 'test-tmp', 'seed-reward.db');
  let testBed: TestServer;

  beforeEach(async () => {
    // Ensure test directory exists
    await fs.promises.mkdir(path.dirname(dbPath), { recursive: true });
    // Remove test database if it exists
    try {
      await fs.promises.unlink(dbPath);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Ignore if file doesn't exist
    }
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(async () => {
    // need to be called before unwatch, as some timout are used in unwatch
    // Maybe those timeout are not needed ? Or are they ?
    vi.useRealTimers();
    await testBed.server.unwatch(); // As time of writing, this take 537ms, that is way bellow 10sec hook timeout!

    // Clear performance entries
    performance.clearMarks();
    performance.clearMeasures();
    console.log('entries');
    vi.clearAllMocks();
    // Clean up test database
    try {
      await fs.promises.unlink(dbPath);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Ignore, if the file doesn't exist
    }
  });

  it(
    'should track seeding time and grant whitelist',
    async () => {
      setRconMock(mockExecute, {
        ShowServerInfo: JSON.stringify({ ...defaultServerInfo, MapName_s: 'Sumari_Seed_v1' }),
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: yucaEOSID steam: 76561198000000001 | Name: Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
      });

      const pluginConfig: SeedRewardOptions = {
        enabled: true,
        loggerVerbosity: 'debug',
        seedDuration: 2,
        whiteListDuration: 7,
        thanksMessageDelay: 10,
        seedProgressionMessageInterval: 60,
        thanksMessage: 'Thank you for joining! Progress: %percent%%',
        seedProgressionMessage: 'Seeding progress: %percent%%.',
        seedRewardMessage: 'Congrats! You have earned a %whiteListDuration%-day whitelist!',
        seedRewardBroadcastMessage:
          '%playerName% has received a %whiteListDuration%-day whitelist for contributing to the server seeding!',
        sqliteDatabasePath: dbPath,
      };

      //vi.setSystemTime(new Date(0).getTime());

      testBed = await useTestServer({
        executeFn: mockExecute,
        pluginOptionOverride: {
          'seed-reward': pluginConfig,
        },
      });

      // Although readFile will be called at start, this is acceptable on this test, as it is not cached.
      // Likely need to change test server so that mockLogReader can be set before the server starts.
      testBed.mockLogReader.readFile = vi.fn().mockImplementation(() => {
        return `
// Existing Admins.cfg file data that should stay untouched:
Group=HaveFun:teamchange,startvote
Admin=123456:Admin
`;
      });

      // Wait for initial thanks message + 10ms offset
      await vi.advanceTimersByTimeAsync(pluginConfig.thanksMessageDelay * 1000 + 10);
      // await vi.runOnlyPendingTimersAsync();
      expect(mockExecute).toHaveBeenNthCalledWith(
        4,
        'AdminWarn "yucaEOSID" Thank you for joining! Progress: 0%'
      );

      testBed.mockLogReader.writeFile = vi.fn();

      // Fast forward 2 hours (should trigger reward) + 10ms offset
      await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000 + 10);

      expect(mockExecute).toHaveBeenNthCalledWith(
        5,
        'AdminWarn "yucaEOSID" Seeding progress: 50%.'
      );

      // Check RCON calls for messages
      expect(mockExecute).toHaveBeenNthCalledWith(
        6,
        'AdminBroadcast Yuca has received a 7-day whitelist for contributing to the server seeding!'
      );
      expect(mockExecute).toHaveBeenNthCalledWith(
        7,
        'AdminWarn "yucaEOSID" Congrats! You have earned a 7-day whitelist!'
      );

      // Do not immediately rewarn player that just got warned, or it will hide previous warning.
      expect(mockExecute).not.toHaveBeenNthCalledWith(
        8,
        'AdminWarn "yucaEOSID" Seeding progress: 0%.'
      );

      // Expect Admins.cfg to be updated with Group and one Admin (whitelist).
      expect(testBed.mockLogReader.writeFile).toHaveBeenNthCalledWith(
        1,
        'C:\\fake\\config\\dir\\Admins.cfg',
        `
// Existing Admins.cfg file data that should stay untouched:
Group=HaveFun:teamchange,startvote
Group=SeedRewardPlugin:reserve // Auto-generated group for seed rewards
Admin=123456:Admin
Admin=76561198000000001:SeedRewardPlugin // Seed reward for Yuca (expires 08 Jan 2025)
`
      );
      // Make sure readFile send correct response for later, as if the file actually got saved on the server.
      (testBed.mockLogReader.readFile as MockedFunction<any>).mockImplementation(() => {
        // first call, but second parameter that is the content of the file.
        return (testBed.mockLogReader.writeFile as MockedFunction<any>).mock.calls[0][1];
      });

      // Disconnect player
      setRconMock(mockExecute, {
        ShowServerInfo: JSON.stringify({ ...defaultServerInfo, MapName_s: 'Sumari_Seed_v1' }),
        ListPlayers: `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----`,
      });
      await testBed.triggerRCONUpdate();

      // 7 days + 1h (interval of checking for outdated whitelists) + 10ms offset
      await vi.advanceTimersByTimeAsync(
        pluginConfig.whiteListDuration * 24 * 60 * 60 * 1000 + 60 * 60 * 1000 + 10
      );

      // Expect whitelist to be removed.
      expect(testBed.mockLogReader.writeFile).toHaveBeenNthCalledWith(
        2,
        'C:\\fake\\config\\dir\\Admins.cfg',
        `
// Existing Admins.cfg file data that should stay untouched:
Group=HaveFun:teamchange,startvote
Group=SeedRewardPlugin:reserve // Auto-generated group for seed rewards
Admin=123456:Admin
`
      );
    },
    {
      timeout: 10000,
    }
  );
});
