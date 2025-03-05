import { AutoKickUnassignedOptions } from './auto-kick-unassigned.config';
import { afterAll, afterEach, beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';

describe('AutoKickUnassigned', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await testBed.server.unwatch();
  });

  it(
    'should properly track and handle unassigned players',
    async () => {
      // Initial server state: 3 players
      // - unassignedPlayer: no squad (will be warned then kicked)
      // - squadPlayer: in squad (will leave squad later)
      // - newPlayer: will join later with no squad
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: unassigned123 steam: 76561198000000001 | Name: UnassignedPlayer | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
ID: 1 | Online IDs: EOS: squad456 steam: 76561198000000002 | Name: SquadPlayer | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (United States Army)
ID: 1 | Name: Squad 1 | Size: 1 | Locked: False | Creator Name: SquadPlayer | Creator Online IDs: EOS: squad456 steam: 76561198000000002
Team ID: 2 (Manticore Security Task Force)`,
      });

      const pluginConfig: AutoKickUnassignedOptions = {
        enabled: true,
        loggerVerbosity: 'trace',
        enabledInSeed: true,
        playerThreshold: 1,
        unassignedTimeout: 4,
        warnMessageInterval: 2,
        warnMessage: 'Join a squad! Time remaining: %remainingTime%',
        kickMessage: 'Kicked for being unassigned for %unassignedTimeout%',
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        pluginOptionOverride: {
          'auto-kick-unassigned': {
            ...pluginConfig,
            __skipValidation: true, // Skip validation for short timeouts
          },
        },
      });

      // Wait for the first warn. offset 10ms
      await vi.advanceTimersByTimeAsync(pluginConfig.warnMessageInterval * 1000 + 10);
      expect(rconExec).toHaveBeenNthCalledWith(
        4,
        expect.stringMatching(
          /AdminWarn "unassigned123" Join a squad! Time remaining: \d+ seconds?/
        )
      );

      // Simulate:
      // - SquadPlayer leaving their squad
      // - UnassignedPlayer joining a squad
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: unassigned123 steam: 76561198000000001 | Name: UnassignedPlayer | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: USA_Rifleman_01
ID: 1 | Online IDs: EOS: squad456 steam: 76561198000000002 | Name: SquadPlayer | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (United States Army)
ID: 1 | Name: Squad 1 | Size: 1 | Locked: False | Creator Name: SquadPlayer | Creator Online IDs: EOS: squad456 steam: 76561198000000002
Team ID: 2 (Manticore Security Task Force)`,
      });
      rconExec.mockClear();
      await testBed.triggerRCONUpdate();

      await vi.advanceTimersByTimeAsync(pluginConfig.warnMessageInterval * 1000 + 10);
      // No second warning since he joined a squad.
      expect(rconExec).not.toHaveBeenNthCalledWith(
        4,
        expect.stringMatching(
          /AdminWarn "unassigned123" Join a squad! Time remaining: \d+ seconds?/
        )
      );
      // First warning for squad456
      expect(rconExec).toHaveBeenNthCalledWith(
        4,
        expect.stringMatching(/AdminWarn "squad456" Join a squad! Time remaining: \d+ seconds?/)
      );

      // Simulate:
      // - UnassignedPlayer hasn't changed, still in the same squad
      // - SquadPlayer disconnecting (note: implementation does not rely on log event here)
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: unassigned123 steam: 76561198000000001 | Name: UnassignedPlayer | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (United States Army)
ID: 1 | Name: Squad 1 | Size: 1 | Locked: False | Creator Name: SquadPlayer | Creator Online IDs: EOS: squad456 steam: 76561198000000002
Team ID: 2 (Manticore Security Task Force)`,
      });
      rconExec.mockClear();
      await testBed.triggerRCONUpdate();

      // Wait for kick timeout and verify:
      // - unassignedPlayer (now in squad) was not kicked
      // - squadPlayer (disconnected) was not kicked
      await vi.advanceTimersByTimeAsync(pluginConfig.unassignedTimeout * 1000 + 10);

      // Verify no kicks were issued
      expect(rconExec).not.toHaveBeenCalledWith(expect.stringMatching(/^AdminKick/));

      // Add new unassigned player
      // Disconnect the other player (we don't need this one anymore)
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 2 | Online IDs: EOS: new789 steam: 76561198000000004 | Name: NewPlayer | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: USA_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
      });
      rconExec.mockClear();
      await testBed.triggerRCONUpdate();
      testBed.emitNewPlayerLogs({
        controller: 'BP_PlayerController_C_2147254333',
        eosID: 'new789',
        id: '2',
        ip: '109.196.154.134',
        isLeader: false,
        name: 'NewPlayer', // possibly confusing, since RCON give name with clan tag, not name.
        squad: undefined,
        squadIndex: undefined,
        steamID: '76561199181620211',
        teamID: '1',
      });

      // Wait for warning and kick of new player
      await vi.advanceTimersByTimeAsync(pluginConfig.warnMessageInterval * 1000 + 10);
      expect(rconExec).toHaveBeenNthCalledWith(
        4,
        expect.stringMatching(/AdminWarn "new789" Join a squad! Time remaining: \d+ seconds?/)
      );
      await vi.advanceTimersByTimeAsync(pluginConfig.unassignedTimeout * 1000 + 10);
      // Do not warn if negative timing (he will be kicked in the micro-second after...)
      expect(rconExec).not.toHaveBeenNthCalledWith(
        5,
        expect.stringMatching(/AdminWarn "new789" Join a squad! Time remaining: -?\d+ seconds?/)
      );
      expect(rconExec).toHaveBeenNthCalledWith(
        5,
        expect.stringMatching(/AdminKick "new789" Kicked for being unassigned for [\d.]+ seconds?/)
      );
    },
    {
      timeout: 10000,
    }
  );
});
