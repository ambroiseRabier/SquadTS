import { SquadNameValidatorOptions } from './squad-name-validator.config';
import { afterAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';

describe('SquadNameValidator', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  afterAll(async () => {
    await testBed.server.unwatch();
  });

  it(
    'Respond to !hello command with Hello world!',
    async () => {
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 5 | Locked: False | Creator Name: Yuca | Creator Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077
Team ID: 2 (Manticore Security Task Force)`,
      });

      const pluginConfig: SquadNameValidatorOptions = {
        enabled: true, // Keep it true or the plugin won't be loaded.
        loggerVerbosity: 'debug', // debug or trace recommended.
        mustContain: ['INF'],
        enableDisband: true,
        warnMessage: 'Wrong squad name! Valid ones must contains any of: %mustContain%.',
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        pluginOptionOverride: {
          'squad-name-validator': pluginConfig,
        },
      });

      expect(rconExec).toHaveBeenCalledWith(
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Wrong squad name! Valid ones must contains any of: INF.'
      );
      expect(rconExec).toHaveBeenCalledWith('AdminDisbandSquad 1 1');

      rconExec.mockClear();

      // Valid squad name
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: INF MIC ENG required | Size: 5 | Locked: False | Creator Name: Yuca | Creator Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077
Team ID: 2 (Manticore Security Task Force)`,
      });
      await testBed.triggerRCONUpdate();

      expect(rconExec).not.toHaveBeenCalledWith(expect.stringMatching('AdminDisband'));
    },
    {
      timeout: 10000, // Tests with test server are a bit slow, default 5 sec timeout is not enough.
    }
  );
});
