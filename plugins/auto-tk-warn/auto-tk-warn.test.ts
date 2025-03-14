import { afterAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';
import { wait } from '../../src/utils';
import { AutoTKWarnOptions } from './auto-tk-warn.config';

// test intended to run in order with one time executed initial startup
describe('Auto TK warn', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  afterAll(async () => {
    await testBed.server.unwatch();
  });

  it(
    'Warn and disband squad with excess players',
    async () => {
      setRconMock(rconExec, {
        ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: IMF_Rifleman_01
ID: 1 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860b2 steam: 76561198016942072 | Name: Stef | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`,
      });

      const pluginConfig: AutoTKWarnOptions = {
        enabled: true,
        loggerVerbosity: 'debug',
        attackerMessage: 'Please apologise for ALL TKs in ALL chat!',
        attackerMessageDelay: 0.1,
        victimMessage: '%attackerName% team killed you.',
        victimMessageDelay: 0.5,
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        pluginOptionOverride: {
          'auto-tk-warn': {
            __skipValidation: true, // Useful hack to avoid validation and force short timing and speed up test!
            ...pluginConfig,
          },
        },
      });

      testBed.emitLogs(
        '[2025.01.27-22.23.56:380][439]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player:-TWS- Yuca KillingDamage=199.097168 from BP_PlayerController_C_2130401015 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860b2 steam: 76561198016942072 | Controller ID: BP_PlayerController_C_2130401015) caused by BP_Soldier_RU_Pilot_C_2130397914'
      );

      expect(rconExec).not.toHaveBeenCalledWith(
        'AdminWarn "0002a10186d9414496bf20d22d3860b2" Please apologise for ALL TKs in ALL chat!'
      );

      // Based on options above, with margin 400 ms (this test may fail if your CPU is slowed down :/, a fix is welcome)
      await wait(0.4 * 1000);
      expect(rconExec).toHaveBeenCalledWith(
        'AdminWarn "0002a10186d9414496bf20d22d3860b2" Please apologise for ALL TKs in ALL chat!'
      );
      expect(rconExec).not.toHaveBeenCalledWith(
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Stef team killed you.'
      );

      await wait((0.9 - 0.4) * 1000);
      expect(rconExec).toHaveBeenCalledWith(
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Stef team killed you.'
      );
    },
    {
      timeout: 10000,
    }
  );
});
