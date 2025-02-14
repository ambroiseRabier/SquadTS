import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import { TestServer, useTestServer } from '../../src/plugin-test-helper/plugin-test-helper';
import { Rcon } from '../../src/rcon/rcon';
import { afterEach } from 'node:test';
import { Player } from '../../src/cached-game-status/use-cached-game-status';
import { RconSquad } from '../../src/rcon-squad/use-rcon-squad';

describe('Heli crash broadcast', () => {
  let server: TestServer;
  let rconExec: jest.MockedFunction<Rcon['execute']> = jest.fn();
  beforeAll(async () => {
    server = await useTestServer(rconExec as Rcon['execute']);
  });

  afterEach(() => {
    rconExec.mockClear();
  })

  it('Broadcast on heli crash', () => {
//     rconExec.mockImplementation((command: string) => {
//       if (command === 'ListPlayers') {
//         return `----- Active Players -----
// ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
// ----- Recently Disconnected Players [Max of 15] -----
// `
//       }
//     })

    const playerList: Awaited<ReturnType<RconSquad['getListPlayers']>> = [
      {
        teamID: '1',
        role: 'IMF_Rifleman_01',
        eosID: '0002a10186d9414496bf20d22d3860ba',
        id: '1',
        isLeader: false,
        nameWithClanTag: '-TWS- Yuca',
        squadID: undefined,
        steamID: '76561198016942077'
      }
    ]

    jest.spyOn(server.rcon, 'getListPlayers').mockResolvedValue(playerList);
    expect(server.rcon.getListPlayers).toHaveBeenCalled();

    // server.rcon.getListPlayers.mockResolvedValue(getPlayerListFromStr(`
    //   ----- Active Players -----
    //   ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
    //   ----- Recently Disconnected Players [Max of 15] -----
    // `));

    // Real logs
    server.helpers.emitLogs(`
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): SQVehicleSeat::TakeDamage[GenericDamage] BP_MI8_C_2146067116 for 1000.000000 damage (type=SQDamageType_Collision)
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): Yuca: 1000.00 damage taken by causer Yuca instigator (Online Ids: Yuca) EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 health remaining -155.75
      [20:15:08.977] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Pawn=BP_Soldier_RU_SL_Pilot_C_2146068204 FullPath=BP_Soldier_RU_SL_Pilot_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_Soldier_RU_SL_Pilot_C_2146068204
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Exited Vehicle Pawn=Yuca (Asset Name=BP_MI8_C) FullPath=BP_MI8_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_MI8_C_2146067116 Seat Number=0
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquad: Player:-TWS- Yuca ActualDamage=1000.000000 from -TWS- Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Player Controller ID: BP_PlayerController_C_2146085496)caused by BP_MI8_C_2146067116
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:-TWS- Yuca KillingDamage=1000.000000 from BP_PlayerController_C_2146085496 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Contoller ID: BP_PlayerController_C_2146085496) caused by BP_MI8_C_2146067116
      [20:15:08.978] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:868][363]LogSquad: Warning: Suicide -TWS- Yuca
    `);

    // server.rcon.getListPlayers.mockResolvedValue([
    //   // {
    //   //   role?: string,
    //   //   isLeader: boolean,
    //   //   squadID: string | undefined,
    //   //   teamID: "1" | "2",
    //   //   nameWithClanTag?: string,
    //   //   ids?: string,
    //   //   id?: string,
    //   //   steamID: string,
    //   //   eosID: string
    //   // }
    // ]);
  });
})
