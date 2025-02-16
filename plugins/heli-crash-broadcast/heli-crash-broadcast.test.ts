import { afterAll, beforeAll, describe, expect, it, MockedFunction, vi } from 'vitest';
import { TestServer, useTestServer } from '../../src/plugin-test-helper/plugin-test-helper';
import { Rcon } from '../../src/rcon/rcon';
import { GameServerInfo } from '../../src/rcon-squad/server-info.type';
import { RCONCommand } from '../../src/rcon-squad/rcon-commands';
import { HeliCrashBroadCastOptions } from './heli-crash-broadcast.config';

// Note that SquadList is fetched first, before PlayerList. Same a server info, fetched immediately at startup
function setRconMock(rconExec: MockedFunction<Rcon['execute']>, resolvedValues: Partial<{
  ShowServerInfo: string;
  ListPlayers: string;
  ListSquads: string;
}> & Record<string, string>) {
  rconExec.mockImplementation((command: string) => {
    const throwFc = () => { throw new Error(`Rcon exec called with ${command}, it wasn't mocked !`); };

    // We should check for mock for every command where a return value is expected.
    if (command.match(new RegExp(`^${RCONCommand.ShowServerInfo}.*`))) {
      // ShowServerInfo is called at the start, but is only used for:
      // - server.helpers.getTeamName()
      // - server.info
      // If you are using none of them, you may skip settings ShowServerInfo
      // Note: this server info has 0 players
      return Promise.resolve(resolvedValues.ShowServerInfo ?? throwFc());
    } else if (command.match(new RegExp(`^${RCONCommand.ListPlayers}.*`))) {
      return Promise.resolve(resolvedValues.ListPlayers ?? throwFc());
    } else if (command.match(new RegExp(`^${RCONCommand.ListSquads}.*`))) {
      return Promise.resolve(resolvedValues.ListSquads ?? throwFc());
    } else {
      // AdminBroadcast for example does not return anything (or at least it is unused in SquadTS), this is ok.
      return Promise.resolve('');
    }
  });
}

// test intended to run in order with one time executed initial startup
describe('Heli crash broadcast', () => {
  let testBed: TestServer;
  let rconExec: MockedFunction<Rcon['execute']> = vi.fn();

  beforeAll(async () => {
    // server immediately call ShowServerInfo, player list and squd list, on startup, we provide some default
    // that we recommend you change immediately (although very little of SquadTS use server info itself)
    // ListPlayers and ListSquads also emitted.
    setRconMock(rconExec, {
      ListPlayers: `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----
`,
      ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`,
      ShowServerInfo: JSON.stringify({
        "MaxPlayers":24,"GameMode_s":"Skirmish","MapName_s":"Skorpo_Skirmish_v1","SEARCHKEYWORDS_s":"squadtstestserver,skorposkirmishv1,skirmish","GameVersion_s":"v8.2.1.369429.845","LICENSEDSERVER_b":false,
        "PLAYTIME_I":"5616","Flags_I":"7","MATCHHOPPER_s":"TeamDeathmatch","MatchTimeout_d":120,"SESSIONTEMPLATENAME_s":"GameSession","Password_b":false,"PlayerCount_I":"0",
        "ServerName_s":"SquadTS Test Server","CurrentModLoadedCount_I":"0","AllModsWhitelisted_b":false,"TeamTwo_s":"USA_S_CombinedArms","TeamOne_s":"IMF_S_CombinedArms",
        "NextLayer_s":"Al Basrah RAAS v1","eu-central-1_I":"14","eu-west-2_I":"15","eu-north-1_I":"50","us-east-1_I":"84","me-central-1_I":"79","us-west-1_I":"152","ap-east-1_I":"238",
        "ap-southeast-2_I":"289","ap-southeast-1_I":"17","Region_s":"eu-central-1","PlayerReserveCount_I":"0","PublicQueueLimit_I":"25","PublicQueue_I":"0","ReservedQueue_I":"0","BeaconPort_I":"15003"
      } as GameServerInfo)
      // todo place others.
    });

    // An error in useTestServer result in "Failure cause not provided for 'Broadcast on heli crash'"
    // Type error in server files will not be surfaced by vitest.
    testBed = await useTestServer({
      executeFn: rconExec as Rcon['execute'],
      pluginOptionOverride: {
        'heli-crash-broadcast': <HeliCrashBroadCastOptions>{
          enabled: true,
          loggerVerbosity: 'debug',
          messages: [
            '%pilot% crash landed.'
          ]
        }
      }
    });




    // todo: ne pas load tout les plugins ?
    // todo: config fixe, eventuellement personalisable ?
    // renvoyer les plugins à partir de main(), pour pouvoir faire spyOn
    // testBed.plugins['heli-crash-broadcast'] spyOn... To have been called
    // ... on s'en fou non ? on fait du black box testing.
    // let plugin = heliCrashBroadcast()
  });

  afterAll(async () => {
    testBed.server.unwatch(); // todo unimplemeted
  });

  // afterEach(() => {
  //   rconExec.mockClear();
  // });

  it('Broadcast on heli crash', async () => {
    setRconMock(rconExec, {
      ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
      ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`,
      ShowServerInfo: JSON.stringify({
        "MaxPlayers":24,"GameMode_s":"Skirmish","MapName_s":"Skorpo_Skirmish_v1","SEARCHKEYWORDS_s":"squadtstestserver,skorposkirmishv1,skirmish","GameVersion_s":"v8.2.1.369429.845","LICENSEDSERVER_b":false,
        "PLAYTIME_I":"5616","Flags_I":"7","MATCHHOPPER_s":"TeamDeathmatch","MatchTimeout_d":120,"SESSIONTEMPLATENAME_s":"GameSession","Password_b":false,"PlayerCount_I":"0",
        "ServerName_s":"SquadTS Test Server","CurrentModLoadedCount_I":"0","AllModsWhitelisted_b":false,"TeamTwo_s":"USA_S_CombinedArms","TeamOne_s":"IMF_S_CombinedArms",
        "NextLayer_s":"Al Basrah RAAS v1","eu-central-1_I":"14","eu-west-2_I":"15","eu-north-1_I":"50","us-east-1_I":"84","me-central-1_I":"79","us-west-1_I":"152","ap-east-1_I":"238",
        "ap-southeast-2_I":"289","ap-southeast-1_I":"17","Region_s":"eu-central-1","PlayerReserveCount_I":"0","PublicQueueLimit_I":"25","PublicQueue_I":"0","ReservedQueue_I":"0","BeaconPort_I":"15003"
      } as GameServerInfo)
    });
    await testBed.triggerRCONUpdate();
    // wait for server to fetch rcon player list


    //testBed.rcon.chatPacketEvent.next("[Online Ids:EOS: 0002a10186d9424436bf50d22d3860ba steam: 71531192016942077] Yuca has possessed admin camera.");

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
  })
})
