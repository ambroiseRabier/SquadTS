// Note: easiest it to generate the file, modify it, and then ask IA to
//       rewrite a version with escaped ` and variables.
export default (pascalName: string, kebabName: string) => {
  return `import { ${pascalName}Options } from './${kebabName}.config';
import { afterAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import { setRconMock, TestServer, useTestServer, } from '../../src/use-test-server/use-test-server';
import { Rcon } from '../../src/rcon/use-rcon';


describe('${pascalName}', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  afterAll(async () => {
    // It is important to await the server unwatch, otherwise you may not have every logs displayed, including errors.
    await testBed.server.unwatch();
  });

  it(
    'Respond to !hello command with Hello world!',
    async () => {
      // Prepare RCON responses ahead of server starting, since ListPlayers,
      // ListSquads and ShowServerInfo are called at startup.
      setRconMock(rconExec, {
        ListPlayers: \`----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----\`,
        ListSquads: \`----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 5 | Locked: False | Creator Name: Yuca | Creator Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077
Team ID: 2 (Manticore Security Task Force)\`,
        // If your plugin makes use of \`server.info\` or \`server.helpers.getTeamName()\`,
        // then you likely need to set the correct server info yourself.
        // setRconMock will otherwise provide a type correct value, but with values that may be wrong
        // when related to ListPlayers and ListSquads.
        // ShowServerInfo: ...
      });

      // Config of your plugin
      const pluginConfig: ${pascalName}Options = {
        enabled: true, // Keep it true or the plugin won't be loaded.
        loggerVerbosity: 'debug', // debug or trace recommended.
        command: '!hello'
      };

      testBed = await useTestServer({
        executeFn: rconExec as unknown as Rcon['execute'],
        // This parameter allows us to load only the plugin we want to test.
        pluginOptionOverride: {
          '${kebabName}': {
            // You can use this hack bellow to skip validation of provided config.
            // This is useful if you have an option that represents a duration,
            // but your minimum required value in the config is something >1sec.
            // To speed up test, you provide an extremely short duration like 50ms
            // And skip validation with the line bellow, to avoid validation errors.
            // __skipValidation: true,
            ...pluginConfig,
          },
        },
      });

      // Mock the received chat packet event
      testBed.rcon.chatPacketEvent.next(
        '[ChatTeam] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077] -TWS- Yuca : !hello'
      );

      // Assert that RCON AdminWarn is executed as expected.
      // Since the server first calls ListPlayers, ListSquads, ShowServerInfo, the fourth call is from the plugin.
      expect(rconExec).toHaveBeenNthCalledWith(
        4,
        'AdminWarn "0002a10186d9414496bf20d22d3860ba" Hello world!'
      );

      // 🎉 -------------- Test done -------------- 🎉
      // But keep reading to learn how to use testBed :)

      // 📋 You can mock received logs, (lines will be trimmed and empty lines removed).
      // (some random logs bellow)
      testBed.emitLogs(\`
        [2025.02.13-19.13.17:867][363]LogSquad: Player:-TWS- Yuca ActualDamage=1000.000000 from -TWS- Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Player Controller ID: BP_PlayerController_C_2146085496)caused by BP_MI8_C_2146067116
        [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:-TWS- Yuca KillingDamage=1000.000000 from BP_PlayerController_C_2146085496 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Contoller ID: BP_PlayerController_C_2146085496) caused by BP_MI8_C_2146067116
      \`);

      // 📋 SquadTS often call RCON ListPlayers, ListSquad and ShowServerInfo commands,
      // In a test, you need to trigger these updates yourself.
      // Bellow, we simulate a new player joining, which is obtained through RCON (and not logs)
      setRconMock(rconExec, {
        ListPlayers: \`----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: IMF_Rifleman_01
ID: 1 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860cc steam: 76561198016942033 | Name: BobThePlayer | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----\`,
        ListSquads: \`----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 5 | Locked: False | Creator Name: Yuca | Creator Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077
Team ID: 2 (Manticore Security Task Force)\`,
      });
      // Tell the server to update his internal game status cache based on RCON response of ListPlayers, ListSquads and ShowServerInfo.
      // Has no effect on other RCON commands
      await testBed.triggerRCONUpdate();

      // 🔍 If you wonder how to get data for RCON responses and logs, check the README :)
    },
    {
      timeout: 10000 // Tests with test server are a bit slow, default 5 sec timeout is not enough.
    }
  );
});`;
};
