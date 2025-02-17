```ts
// Option 1: Change behavior of server.rcon.getListPlayers
const playerList: Awaited<ReturnType<RconSquad['getListPlayers']>> = [
  {
    teamID: '1',
    role: 'IMF_Rifleman_01',
    eosID: '0002a10186d9414496bf20d22d3860ba',
    id: '1',
    isLeader: false,
    nameWithClanTag: '-TWS- Yuca',
    squadID: undefined,
    steamID: '76561198016942077',
  },
];
jest.spyOn(testBed.server.rcon, 'getListPlayers').mockResolvedValue(playerList);
expect(testBed.server.rcon.getListPlayers).toHaveBeenCalled();

// Option 2: ...
rconExec.mockImplementation((command: string) => {
  switch (command) {
    case 'ShowServerInfo':
      // ShowServerInfo is called at the start, but is only used for:
      // - server.helpers.getTeamName()
      // - server.info
      // If you are using none of them, you may skip settnigs ShowServerInfo
      // Note: this server info has 0 players
      return Promise.resolve(
        JSON.stringify({
          MaxPlayers: 24,
          GameMode_s: 'Skirmish',
          MapName_s: 'Skorpo_Skirmish_v1',
          SEARCHKEYWORDS_s: 'squadtstestserver,skorposkirmishv1,skirmish',
          GameVersion_s: 'v8.2.1.369429.845',
          LICENSEDSERVER_b: false,
          PLAYTIME_I: '5616',
          Flags_I: '7',
          MATCHHOPPER_s: 'TeamDeathmatch',
          MatchTimeout_d: 120,
          SESSIONTEMPLATENAME_s: 'GameSession',
          Password_b: false,
          PlayerCount_I: '0',
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
        } as GameServerInfo)
      );

    case 'ListPlayers':
      return Promise.resolve(`----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`);
    default:
      throw new Error(`Rcon exec called with ${command}, it wasn't mocked !`);
  }
});
```

Pros and cons:

- Options 1:
  - More resilient to change from Squad, if ListPlayers string becomes different, one change in typing and all test will have to update or not compile.
- Options 2:
  - It test rcon-squad-execute code.
  - Closer to reality.
  - Easy copy paste for tester.

---

```ts
setRconMock(rconExec, {
  ListPlayers: `----- Active Players -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Name: -TWS- Yuca | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: IMF_Rifleman_01
----- Recently Disconnected Players [Max of 15] -----
`,
  ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 3 | Locked: False | Creator Name: stefjimanez76 | Creator Online IDs: EOS: 0002d1a8ee534edab8f366b826c1abf3 steam: 76561198214250793
ID: 2 | Name: TWS | Size: 3 | Locked: False | Creator Name: ComboAz | Creator Online IDs: EOS: 00020817daeb4e2faf717bdeeb18a9da steam: 76561197996303481
Team ID: 2 (Manticore Security Task Force)
ID: 1 | Name: SPEC OPS TWS | Size: 9 | Locked: True | Creator Name: Amzer | Creator Online IDs: EOS: 0002eca389864a621f1a51e2722df6be steam: 76561199594212551
ID: 2 | Name: Squad 2 | Size: 8 | Locked: False | Creator Name: kilmol | Creator Online IDs: EOS: 00021617235142d796774a04ed3d82fd steam: 76561199579221103
`,
  ShowServerInfo: JSON.stringify({
    MaxPlayers: 24,
    GameMode_s: 'Skirmish',
    MapName_s: 'Skorpo_Skirmish_v1',
    SEARCHKEYWORDS_s: 'squadtstestserver,skorposkirmishv1,skirmish',
    GameVersion_s: 'v8.2.1.369429.845',
    LICENSEDSERVER_b: false,
    PLAYTIME_I: '5616',
    Flags_I: '7',
    MATCHHOPPER_s: 'TeamDeathmatch',
    MatchTimeout_d: 120,
    SESSIONTEMPLATENAME_s: 'GameSession',
    Password_b: false,
    PlayerCount_I: '0',
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
```

```ts
it('Broadcast on heli crash (option 1)', () => {
  // Option 1: Change behavior of server.rcon.getListPlayers
  const playerList: Awaited<ReturnType<RconSquad['getListPlayers']>> = [
    {
      teamID: '1',
      role: 'IMF_Rifleman_01',
      eosID: '0002a10186d9414496bf20d22d3860ba',
      id: '1',
      isLeader: false,
      nameWithClanTag: '-TWS- Yuca',
      squadID: undefined,
      steamID: '76561198016942077',
    },
  ];
  jest.spyOn(testBed.server.rcon, 'getListPlayers').mockResolvedValue(playerList);

  // ...
  setRconMock(rconExec, {
    ListSquads: `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`,
    ShowServerInfo: JSON.stringify({
      MaxPlayers: 24,
      GameMode_s: 'Skirmish',
      MapName_s: 'Skorpo_Skirmish_v1',
      SEARCHKEYWORDS_s: 'squadtstestserver,skorposkirmishv1,skirmish',
      GameVersion_s: 'v8.2.1.369429.845',
      LICENSEDSERVER_b: false,
      PLAYTIME_I: '5616',
      Flags_I: '7',
      MATCHHOPPER_s: 'TeamDeathmatch',
      MatchTimeout_d: 120,
      SESSIONTEMPLATENAME_s: 'GameSession',
      Password_b: false,
      PlayerCount_I: '0',
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

  // JE me méfie des data sur les events rcon par rapport aux logs.

  // spyOn on Observable... doesn't seem easy or not possible.
  // Avantage: on n'a pas à gérer AdminInCamera list. Ni la date. (on peut utiliser jest pour la changer em amont, au pire)
  // Désavantage: Un peu plus verbeux ? Faut connaître le format des logs ? --> fc de helpers
  // Et remplacer par des Subject, c'est un peu lourd dans plugin-test-helpers.
  testBed.chatEventsEmit.possessedAdminCamera(
    '0002a10186d9424436bf50d22d3860ba',
    '71531192016942077',
    'Yuca'
  );

  jest.spyOn(testBed.server.rcon, 'broadcast');

  // Real logs
  testBed.emitLogs(`
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): SQVehicleSeat::TakeDamage[GenericDamage] BP_MI8_C_2146067116 for 1000.000000 damage (type=SQDamageType_Collision)
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): Yuca: 1000.00 damage taken by causer Yuca instigator (Online Ids: Yuca) EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 health remaining -155.75
      [20:15:08.977] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Pawn=BP_Soldier_RU_SL_Pilot_C_2146068204 FullPath=BP_Soldier_RU_SL_Pilot_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_Soldier_RU_SL_Pilot_C_2146068204
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Exited Vehicle Pawn=Yuca (Asset Name=BP_MI8_C) FullPath=BP_MI8_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_MI8_C_2146067116 Seat Number=0
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquad: Player:-TWS- Yuca ActualDamage=1000.000000 from -TWS- Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Player Controller ID: BP_PlayerController_C_2146085496)caused by BP_MI8_C_2146067116
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:-TWS- Yuca KillingDamage=1000.000000 from BP_PlayerController_C_2146085496 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Contoller ID: BP_PlayerController_C_2146085496) caused by BP_MI8_C_2146067116
      [20:15:08.978] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:868][363]LogSquad: Warning: Suicide -TWS- Yuca
    `);

  // Equivalent, first one needs spyOn
  expect(testBed.server.rcon.broadcast).toHaveBeenCalledWith('Yuca crash landed.');
});

it('Broadcast on heli crash (option 2)', () => {
  // Option 2:
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
      MaxPlayers: 24,
      GameMode_s: 'Skirmish',
      MapName_s: 'Skorpo_Skirmish_v1',
      SEARCHKEYWORDS_s: 'squadtstestserver,skorposkirmishv1,skirmish',
      GameVersion_s: 'v8.2.1.369429.845',
      LICENSEDSERVER_b: false,
      PLAYTIME_I: '5616',
      Flags_I: '7',
      MATCHHOPPER_s: 'TeamDeathmatch',
      MatchTimeout_d: 120,
      SESSIONTEMPLATENAME_s: 'GameSession',
      Password_b: false,
      PlayerCount_I: '0',
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

  // JE me méfie des data sur les events rcon par rapport aux logs.

  // spyOn on Observable... doesn't seem easy or not possible.
  // Avantage: on n'a pas à gérer AdminInCamera list. Ni la date. (on peut utiliser jest pour la changer em amont, au pire)
  // Désavantage: Un peu plus verbeux ? Faut connaître le format des logs ? --> fc de helpers
  // Et remplacer par des Subject, c'est un peu lourd dans plugin-test-helpers.
  testBed.rcon.chatPacketEvent.next(
    '[Online Ids:EOS: 0002a10186d9424436bf50d22d3860ba steam: 71531192016942077] Yuca has possessed admin camera.'
  );

  // Real logs
  testBed.emitLogs(`
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): SQVehicleSeat::TakeDamage[GenericDamage] BP_MI8_C_2146067116 for 1000.000000 damage (type=SQDamageType_Collision)
      [20:15:08.977] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:867][363]LogSquadTrace: [DedicatedServer]ASQVehicleSeat::TraceAndMessageClient(): Yuca: 1000.00 damage taken by causer Yuca instigator (Online Ids: Yuca) EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 health remaining -155.75
      [20:15:08.977] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Pawn=BP_Soldier_RU_SL_Pilot_C_2146068204 FullPath=BP_Soldier_RU_SL_Pilot_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_Soldier_RU_SL_Pilot_C_2146068204
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077) Exited Vehicle Pawn=Yuca (Asset Name=BP_MI8_C) FullPath=BP_MI8_C /Game/Maps/Manicouagan/Gameplay_Layers/Manicouagan_Invasion_v1.Manicouagan_Invasion_v1:PersistentLevel.BP_MI8_C_2146067116 Seat Number=0
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquad: Player:-TWS- Yuca ActualDamage=1000.000000 from -TWS- Yuca (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Player Controller ID: BP_PlayerController_C_2146085496)caused by BP_MI8_C_2146067116
      [20:15:08.978] DEBUG: [LogParser] Match on line: LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:-TWS- Yuca KillingDamage=1000.000000 from BP_PlayerController_C_2146085496 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Contoller ID: BP_PlayerController_C_2146085496) caused by BP_MI8_C_2146067116
      [20:15:08.978] WARN: [LogParser] No match on line: [2025.02.13-19.13.17:868][363]LogSquad: Warning: Suicide -TWS- Yuca
    `);

  expect(rconExec).toHaveBeenCalledWith(GameCommands.AdminBroadcast, 'Yuca crash landed.');
});
```

La deuxième approche est plus verbeuse mais semble mieux. Si un log change ou le format du retour List player.
Oui il y a plein de chose à changer, mais on voit direct le soucis si on compare avec ce que l'on reçoit du jeu.

Le truc, c'est que la 1ère approche est plus pratique quand on développe et que l'on a pas de logs pour tester.
Mais comme dans les 2 cas on mets des logs du jeu. Cela force de toute façon à avoir de l'info du jeu.
Si on veut créer la situation sans la produire dans le jeu et récup les logs de suite, faut prendre une autre approche sans le
test server, comme celle pour switch command. switch command, qui d'ailleurs dépend de RCON mais se passe des logs facilement.

---

jest and await import and tsx, hard to make them work together :/ plugins not loading.
