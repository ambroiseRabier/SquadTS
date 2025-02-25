import { afterAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import {
  setRconMock,
  TestServer,
  useTestServer,
} from '../../src/plugin-test-helper/plugin-test-helper';
import { Rcon } from '../../src/rcon/rcon';
import { HeliCrashBroadCastOptions } from './heli-crash-broadcast.config';

// Note: To get logs: rcon in debug to see response of rcon, and chatEvents
// logParser et show matched, show unmatched may help in finding extra features :)

describe('Heli crash broadcast', () => {
  let testBed: TestServer;
  const rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  afterAll(async () => {
    testBed.server.unwatch();
  });

  it('Broadcast on heli crash', async () => {
    // server immediately call ShowServerInfo, player list and squd list, on startup, we provide some default
    // that we recommend you change immediately (although very little of SquadTS use server info itself)
    // ListPlayers and ListSquads also emitted.
    setRconMock(rconExec, {
      ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
      ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`,
    });

    // An error in useTestServer result in "Failure cause not provided for 'Broadcast on heli crash'"
    // Type error in server files will not be surfaced by vitest.
    testBed = await useTestServer({
      executeFn: rconExec as Rcon['execute'],
      pluginOptionOverride: {
        'heli-crash-broadcast': <HeliCrashBroadCastOptions>{
          enabled: true,
          loggerVerbosity: 'debug',
          messages: ['%pilot% crash landed.'],
        },
      },
    });

    // Real logs (dates and chainID have been recreated for matching logs, as they were missing when I took them)
    testBed.emitLogs(`
      [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): SQVehicleSeat::TakeDamage[GenericDamage] BP_MI8_C_2146067116 for 1000.000000 damage (type=SQDamageType_Collision)
      [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): Yuca: 1000.00 damage taken by causer Yuca instigator (Online Ids: Yuca) EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 health remaining -155.75
      [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Pawn=BP_Soldier_RU_SL_Pilot_C_2146068204 FullPath=BP_Soldier_RU_SL_Pilot_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_Soldier_RU_SL_Pilot_C_2146068204
      [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Exited Vehicle Pawn=Yuca (Asset Name=BP_MI8_C) FullPath=BP_MI8_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_MI8_C_2146067116 Seat Number=0
      [2025.02.13-19.13.17:867][363]LogSquad: Player:-TWS- Yuca ActualDamage=1000.000000 from -TWS- Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Player Controller ID: BP_PlayerController_C_2146085496)caused by BP_MI8_C_2146067116
      [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:-TWS- Yuca KillingDamage=1000.000000 from BP_PlayerController_C_2146085496 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Contoller ID: BP_PlayerController_C_2146085496) caused by BP_MI8_C_2146067116
      [2025.02.13-19.13.17:868][363]LogSquad: Warning: Suicide -TWS- Yuca
    `);

    expect(rconExec).toHaveBeenCalledWith('AdminBroadcast -TWS- Yuca crash landed.');
  });
});
