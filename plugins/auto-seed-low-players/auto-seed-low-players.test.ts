import { AutoSeedLowPlayers } from './auto-seed-low-players.config';
import { afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';
import { GameServerInfo } from '../../src/rcon-squad/server-info.type';

// We may be able to change sequential, but it also may make logs harder to read.
describe.sequential('AutoSeedLowPlayers', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  beforeEach(async () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(async () => {
    // Important to use real timer for cleanup to properly happen (may be a code smell...)
    vi.useRealTimers();
    await testBed.server.unwatch();
    rconExec.mockClear();

    // Hack to make sure testBed is recreated on the next test.
    testBed = undefined as unknown as TestServer;
  });

  it(
    'should change map when player count stays below threshold',
    async () => {
      // Two players, bellow the threshold of 3.
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d386011 steam: 76561198016942011 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
ID: 1 | Online IDs: EOS: 0002a10186d9414496bf20d22d386022 steam: 76561198016942022 | Name: -TWS- Yuca2 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
      });

      const pluginConfig: AutoSeedLowPlayers = {
        enabled: true,
        loggerVerbosity: 'debug',
        playerThreshold: 3,
        duration: 1, // 60 seconds
        broadcastMessages: {
          bellowThreshold:
            'Player count is bellow %playerThreshold% players, map will change in %duration%.',
          beforeChangeMap:
            'The map will change to %nextLayer% because the player count is bellow %threshold% players in 10 seconds.',
        },
        seedLayers: ['Sumari_Seed_v1'],
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        pluginOptionOverride: {
          'auto-seed-low-players': {
            ...pluginConfig,
          },
        },
      });

      // Should broadcast initial warning
      expect(rconExec).toHaveBeenCalledWith(
        'AdminBroadcast Player count is bellow 3 players, map will change in 1 minute.'
      );

      // Wait for duration + 10ms offset
      await vi.advanceTimersByTimeAsync(pluginConfig.duration * 60 * 1000 + 10); // 1 minute

      // Should broadcast map change warning
      expect(rconExec).toHaveBeenCalledWith(
        'AdminBroadcast The map will change to Sumari_Seed_v1 because the player count is bellow 3 players in 10 seconds.'
      );

      // copy pasted from above.
      const playerEosIDs = ['0002a10186d9414496bf20d22d386011', '0002a10186d9414496bf20d22d386022'];

      // Should warn each player
      for (const playerEosID of playerEosIDs) {
        expect(rconExec).toHaveBeenCalledWith(
          `AdminWarn "${playerEosID}" The map will change to Sumari_Seed_v1 because the player count is bellow 3 players in 10 seconds.`
        );
      }

      // Wait for 10 seconds warning period (+ 10ms offset)
      await vi.advanceTimersByTimeAsync(10000 + 10);

      // Should change map
      expect(rconExec).toHaveBeenCalledWith('AdminChangeLayer Sumari_Seed_v1');

      // Wait duration + 10 seconds warning period + 10ms offset
      await vi.advanceTimersByTimeAsync(pluginConfig.duration * 60 * 1000 + 10000 + 10); // 1 minute 10 secnods

      // No others warning indicating another change map timeout starting until we have changed map !
      expect(rconExec).toHaveBeenLastCalledWith('AdminChangeLayer Sumari_Seed_v1');

      // Prepare rconExec
      rconExec.mockClear();

      // New game event we wait for.
      testBed.emitLogs(
        '[2025.01.27-21.50.48:212][280]LogWorld: Bringing World /Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1 up for play (max tick rate 50) at 2025.02.27-14.50.08'
      );

      // Change server info, and indicate that we are on a seed layer. Set players bellow the threshold again.
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d386011 steam: 76561198016942011 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
        ShowServerInfo: JSON.stringify({
          MaxPlayers: 24,
          GameMode_s: 'Skirmish',
          MapName_s: 'Sumari_Seed_v1', // SEED MAP HERE
          SEARCHKEYWORDS_s: 'squadtstestserver,skorposkirmishv1,skirmish',
          GameVersion_s: 'v8.2.1.369429.845',
          LICENSEDSERVER_b: false,
          PLAYTIME_I: '5616',
          Flags_I: '7',
          MATCHHOPPER_s: 'TeamDeathmatch',
          MatchTimeout_d: 120,
          SESSIONTEMPLATENAME_s: 'GameSession',
          Password_b: false,
          PlayerCount_I: '0', // player count doesn't matter here, we use a more up-to-date value in SquadTS and the plugin.
          ServerName_s: 'SquadTS Test Server',
          CurrentModLoadedCount_I: '0',
          AllModsWhitelisted_b: false,
          TeamTwo_s: 'USA_S_CombinedArms',
          TeamOne_s: 'IMF_S_CombinedArms',
          NextLayer_s: 'Al Basrah RAAS v1',
          'eu-central-1_I': '14',
          'eu-west-2_I': '15',
          'eu-north-1_I': '50',
          'us-east-1_I': '84',
          'me-central-1_I': '79',
          'us-west-1_I': '152',
          'ap-east-1_I': '238',
          'ap-southeast-2_I': '289',
          'ap-southeast-1_I': '17',
          Region_s: 'eu-central-1',
          PlayerReserveCount_I: '0',
          PublicQueueLimit_I: '25',
          PublicQueue_I: '0',
          ReservedQueue_I: '0',
          BeaconPort_I: '15003',
        } as GameServerInfo),
      });
      await testBed.triggerRCONUpdate();

      // Wait duration + 10 seconds wait + 10ms offset
      await vi.advanceTimersByTimeAsync(pluginConfig.duration * 60 * 1000 + 10000 + 10); // 1 minute 10 seconds

      // Should not trigger another map change or another warning. Because we are on a seed map.
      expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining('AdminChangeLayer'));
      expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining('AdminBroadcast'));
    },
    {
      timeout: 10000,
    }
  );

  it(
    'No change map if players above threshold',
    async () => {
      // Four players, above the threshold of 3.
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d386011 steam: 76561198016942011 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
ID: 1 | Online IDs: EOS: 0002a10186d9414496bf20d22d386022 steam: 76561198016942022 | Name: -TWS- Yuca2 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
ID: 2 | Online IDs: EOS: 0002a10186d9414496bf20d22d386033 steam: 76561198016942033 | Name: -TWS- Yuca3 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
ID: 3 | Online IDs: EOS: 0002a10186d9414496bf20d22d386044 steam: 76561198016942044 | Name: -TWS- Yuca4 | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
      });

      const pluginConfig: AutoSeedLowPlayers = {
        enabled: true,
        loggerVerbosity: 'debug',
        playerThreshold: 3,
        duration: 1, // 60 seconds
        broadcastMessages: {
          bellowThreshold:
            'Player count is bellow %playerThreshold% players, map will change in %duration%.',
          beforeChangeMap:
            'The map will change to %nextLayer% because the player count is bellow %threshold% players in 10 seconds.',
        },
        seedLayers: ['Sumari_Seed_v1'],
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        pluginOptionOverride: {
          'auto-seed-low-players': {
            ...pluginConfig,
          },
        },
      });

      // Wait duration + 10 seconds + 10ms offset
      await vi.advanceTimersByTimeAsync(pluginConfig.duration * 60 * 1000 + 10000 + 10); // 1 minute 10 seconds

      // Should not trigger another map change, or any broadcast indicating a changeMap timeout
      expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining('AdminChangeLayer'));
      expect(rconExec).not.toHaveBeenCalledWith(expect.stringContaining('AdminBroadcast'));
    },
    {
      timeout: 10000,
    }
  );
});
