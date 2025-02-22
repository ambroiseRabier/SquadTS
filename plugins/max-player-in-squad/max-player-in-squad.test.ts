import { afterAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import {
  setRconMock,
  TestServer,
  useTestServer,
} from '../../src/plugin-test-helper/plugin-test-helper';
import { Rcon } from '../../src/rcon/rcon';
import { MaxPlayerInSquadOptions } from './max-player-in-squad.config';
import { wait } from '../../src/utils';

// test intended to run in order with one time executed initial startup
describe('Max player in squad', () => {
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
ID: 1 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860b2 steam: 76561198016942072 | Name: crewman2 | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
ID: 2 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860b3 steam: 76561198016942073 | Name: crewman3 | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
ID: 3 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860b4 steam: 76561198016942074 | Name: crewman4 | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
ID: 4 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860b5 steam: 76561198016942075 | Name: badInfantry5 | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
        ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: FiveManMBT | Size: 5 | Locked: False | Creator Name: Yuca | Creator Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077
Team ID: 2 (Manticore Security Task Force)
`,
      });

      const pluginConfig: MaxPlayerInSquadOptions = {
        enabled: true,
        loggerVerbosity: 'debug',
        enabledInSeed: true,
        maxWarnBeforeDisband: 2,
        messages: {
          warn: 'Warning (%warn_count%) - Taille de la squad %squadType% trop grande, le max est %max%.',
          disband:
            'The squad %squadName% has exceeded the allowed warnings and will now be disbanded.',
          disbandBroadcast:
            'Team %teamNumber% Squad %squadIndex% "%squadName%" has been disbanded because it exceed maximum player count (%maxPlayerInSquad%) for squad type (%squadType%).',
        },
        squadTypes: [
          {
            containWord: 'MBT',
            maxPlayers: 4,
          },
        ],
        warnRate: 0.1,
      };

      testBed = await useTestServer({
        executeFn: rconExec as Rcon['execute'],
        pluginOptionOverride: {
          'max-player-in-squad': {
            __skipValidation: true, // Useful hack to avoid validation and force short timing and speed up test !
            ...pluginConfig,
          },
        },
      });
      // MaxPlayerInSquad trigger on player change squad an once at startup for
      // every squad.
      //await testBed.triggerRCONUpdate();

      // offset 50%, only once, or too much offset will skip... and we end up with two warns.
      await wait(pluginConfig.warnRate * 1000 * 1.5);
      // start at 4, since 1,2,3 is used by ListPlayers and more
      expect(rconExec).toHaveBeenNthCalledWith(
        4,
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Warning (1/2) - Taille de la squad FiveManMBT trop grande, le max est 4.'
      );
      await wait(pluginConfig.warnRate * 1000);
      expect(rconExec).toHaveBeenNthCalledWith(
        5,
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Warning (2/2) - Taille de la squad FiveManMBT trop grande, le max est 4.'
      );
      await wait(pluginConfig.warnRate * 1000);
      expect(rconExec).toHaveBeenNthCalledWith(
        6,
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" The squad FiveManMBT has exceeded the allowed warnings and will now be disbanded.'
      );
      expect(rconExec).toHaveBeenNthCalledWith(
        7,
        'AdminWarn "0002a10186d9414496bf20d22d3860b2" The squad FiveManMBT has exceeded the allowed warnings and will now be disbanded.'
      );
      expect(rconExec).toHaveBeenNthCalledWith(
        8,
        'AdminWarn "0002a10186d9414496bf20d22d3860b3" The squad FiveManMBT has exceeded the allowed warnings and will now be disbanded.'
      );
      expect(rconExec).toHaveBeenNthCalledWith(
        9,
        'AdminWarn "0002a10186d9414496bf20d22d3860b4" The squad FiveManMBT has exceeded the allowed warnings and will now be disbanded.'
      );
      expect(rconExec).toHaveBeenNthCalledWith(
        10,
        'AdminWarn "0002a10186d9414496bf20d22d3860b5" The squad FiveManMBT has exceeded the allowed warnings and will now be disbanded.'
      );
      expect(rconExec).toHaveBeenNthCalledWith(11, 'AdminDisbandSquad 1 1');
      expect(rconExec).toHaveBeenNthCalledWith(
        12,
        'AdminBroadcast Team 1 Squad 1 "FiveManMBT" has been disbanded because it exceed maximum player count (4) for squad type (MBT).'
      );
    },
    {
      timeout: 10000,
    }
  );
});
