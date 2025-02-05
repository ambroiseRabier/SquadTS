import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LogParser, useLogParser } from './use-log-parser';
import EventEmitter from 'events';
import { LogParserConfig } from './log-parser.config';

describe('Log Parser events', () => {
  let logParser: LogParser;
  let mockedLogReader: EventEmitter;
  // note: Any missing function will just make the test fail without any information.
  const fakeLogger = {
    trace: console.log,
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    fatal: console.error,
  } as any;
  const logParserConfig: LogParserConfig = {
    logFile: 'mock.log',
    ftp: {
      host: 'localhost',
      port: 21,
      username: 'user',
      password: 'pass',
      fetchInterval: 300,
      initialTailSize: 1024,
    },
    mode: 'ftp',
    debugEmitFirstDownloadedLogs: true, // Important, because our fixed logs have past dates and would be ignored!
  };


  beforeEach(async () => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    mockedLogReader = new EventEmitter();

    logParser = useLogParser(
      fakeLogger,
      mockedLogReader as any,
      logParserConfig,
      {
        showMatching: true,
        showNonMatching: true,
        ignoreRegexMatch: []
      }
    );
  });

  it('should ignore past logs', () => {
    logParser = useLogParser(
      // note: Any missing function will just make the test fail without any information.
      fakeLogger,
      mockedLogReader as any,
      {
        ...logParserConfig,
        debugEmitFirstDownloadedLogs: false // we are testing that.
      },
      {
        showMatching: true,
        showNonMatching: true,
        ignoreRegexMatch: []
      }
    );

    const mockEvent = jest.fn();
    // any event subscription
    logParser.events.adminBroadcast.subscribe(mockEvent);
    // date is older than today, perfectly valid adminBroadcast log.
    mockedLogReader.emit('line', `[2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON`)
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('should ignore first incomplete line', () => {
    // any event subscription
    logParser.events.adminBroadcast.subscribe((data) => {
    });
    // Note if there is any other error, this test will also fail.
    expect(() =>{
      // incomplete date, happen at start when we start reading file.
      mockedLogReader.emit('line', `-13.27.36:294][437]LogEOS: Warning: [LogEOSAuth] Unable to get Epic account id from product user id - No logged in user found`)
    }).not.toThrow();
  });

  it('adminBroadcast', () => {
    const mockEvent = jest.fn();
    logParser.events.adminBroadcast.subscribe(mockEvent)
    mockedLogReader.emit('line', '[2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON');
    expect(mockEvent).toHaveBeenCalledWith({
      message: 'coucou',
      from: 'RCON'
    });
  });

  it('deployableTakeDamage', () => {
    expect(true).toEqual(false);
    // todo implement
    mockedLogReader.emit('line', '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57');
    // logParser.events.takeDamage.subscribe((data) => {
    //   expect(data).toBe({
    //     message: 'hello',
    //     from: 'stuff'
    //   });
    // })
  });

  it('loginRequest', () => {
    const mockEvent = jest.fn();
    logParser.events.loginRequest.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.31-17.17.59:404][483]LogNet: Login request: ?Name=Yuca userId: RedpointEOS:0002a10386d9114496bf20d22d3860ba platform: RedpointEOS');
    expect(mockEvent).toHaveBeenCalledWith({
      name: "Yuca",
      eosID: "0002a10386d9114496bf20d22d3860ba",
    });
  })

  it('newGame', () => {
    const mockEvent = jest.fn();
    logParser.events.newGame.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-21.50.48:212][280]LogWorld: Bringing World /Game/Maps/TransitionMap.TransitionMap up for play (max tick rate 40) at 2025.01.27-13.50.48');
    expect(mockEvent).toHaveBeenCalledWith({
      dlc: "Game",
      layerClassname: "TransitionMap",
      mapClassname: "Maps"
    });
  });

  it('playerAddedToTeam', () => {
    const mockEvent = jest.fn();
    logParser.events.playerAddedToTeam.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.31-17.18.07:493][805]LogSquad: Player  Yuca has been added to Team 1`);
    expect(mockEvent).toHaveBeenCalledWith({
      name: 'Yuca',
      teamID: '1'
    });
  });

  it('playerConnected', () => {
    const mockEvent = jest.fn();
    logParser.events.playerConnected.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-22.27.36:082][206]LogSquad: PostLogin: NewPlayer: BP_PlayerController_C /Game/Maps/Kamdesh_Highlands/Gameplay_Layers/Kamdesh_Invasion_v1.Kamdesh_Invasion_v1:PersistentLevel.BP_PlayerController_C_2130426410 (IP: 92.106.127.65 | Online IDs: EOS: 000215531fcb4a1f935b477b9da213ff steam: 76561129553531043)`);
    expect(mockEvent).toHaveBeenCalledWith({
      eosID: "000215531fcb4a1f935b477b9da213ff",
      ip: "92.106.127.65",
      controller: "BP_PlayerController_C_2130426410",
      steamID: "76561129553531043"
    });
  });

  it('playerDamaged', () => {
    const mockEvent = jest.fn();
    logParser.events.playerDamaged.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-22.04.23:734][749]LogSquad: Player:-TWS- Ramzer ActualDamage=47.000000 from  NiceLP (Online IDs: EOS: 0002e45ac2af4c1c38fc08691a3f591e steam: 76161198185177949 | Player Controller ID: BP_PlayerController_C_2130489498)caused by BP_SVDM_Optic_C_2130416661`);
    expect(mockEvent).toHaveBeenCalledWith({
      attacker: {
        controller: "BP_PlayerController_C_2130489498",
        eosID: "0002e45ac2af4c1c38fc08691a3f591e",
        nameWithClanTag: " NiceLP",
        steamID: "76161198185177949"
      },
      damage: "47.000000",
      victim: {
        nameWithClanTag: "-TWS- Ramzer"
      },
      weapon: "BP_SVDM_Optic"
    });
  });

  it('playerDamaged by bot ignored (no eos id)', () => {
    const mockEvent = jest.fn();
    logParser.events.playerDamaged.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.02.04-16.23.20:701][155]LogSquad: Player:*FLS*  TGD_Emokid ActualDamage=50.399998 from nullptr (Online IDs: INVALID | Player Controller ID: None)caused by BP_Projectile_7_62mm_C_2095247838');
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('playerDied', () => {
    const mockEvent = jest.fn();
    logParser.events.playerDied.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-22.05.10:229][600]LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:  UFFD KillingDamage=-300.000000 from BP_PlayerController_C_2131535015 (Online IDs: EOS: 0002eca389864a629f1a11e2722df6be steam: 76561199394112551 | Contoller ID: BP_PlayerController_C_2131535015) caused by BP_Soldier_RU_Medic_C_2130417755`);
    expect(mockEvent).toHaveBeenCalledWith({
      attacker: {
        controller: "BP_PlayerController_C_2131535015",
        eosID: "0002eca389864a629f1a11e2722df6be",
        steamID: "76561199394112551"
      },
      damage: "300.000000",
      victim: {
        nameWithClanTag: "  UFFD"
      },
      weapon: "BP_Soldier_RU_Medic"
    });
  });

  it('playerDisconnected', () => {
    const mockEvent = jest.fn();
    logParser.events.playerDisconnected.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-22.05.26:087][233]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == 0. Name: [UChannel] ChIndex: 0, Closing: 0 [UNetConnection] RemoteAddr: 86.208.113.0:60419, Name: EOSIpNetConnection_2130439491, Driver: GameNetDriver EOSNetDriver_2131536283, IsServer: YES, PC: BP_PlayerController_C_2130438728, Owner: BP_PlayerController_C_2130438728, UniqueId: RedpointEOS:0002201300c327a19a4c6ae06dc955a3`);
    expect(mockEvent).toHaveBeenCalledWith({
      eosID: "0002201300c327a19a4c6ae06dc955a3",
      ip: "86.208.113.0",
      playerController: "BP_PlayerController_C_2130438728"
    });
  });

  it('playerJoinSucceeded', () => {
    const mockEvent = jest.fn();
    logParser.events.playerJoinSucceeded.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-22.09.43:029][469]LogNet: Join succeeded: ShyGuy`);
    expect(mockEvent).toHaveBeenCalledWith({
      "name": "ShyGuy"
    });
  });

  it('playerInitialized', () => {
    const mockEvent = jest.fn();
    logParser.events.playerInitialized.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.31-17.18.07:493][805]LogGameMode: Initialized player Yuca with 1`);
    expect(mockEvent).toHaveBeenCalledWith({
      "name": "Yuca",
      "id": "1"
    });
  });

  it('playerPossess', () => {
    const mockEvent = jest.fn();
    logParser.events.playerPossess.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.27.36:082][206]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=gekapu (Online IDs: EOS: 00025a0bc5f54f728a36b717ab288f67 steam: 76561199538744782) Pawn=BP_Soldier_INS_Rifleman1_C_2126289717 FullPath=BP_Soldier_INS_Rifleman1_C /Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1:PersistentLevel.BP_Soldier_INS_Rifleman1_C_2126289717');
    expect(mockEvent).toHaveBeenCalledWith({
      eosID: "00025a0bc5f54f728a36b717ab288f67",
      steamID: "76561199538744782",
      playerSuffix: "gekapu",
      possessClassname: "BP_Soldier_INS_Rifleman1"
    });
  });

  it('playerRevived', () => {
    const mockEvent = jest.fn();
    logParser.events.playerRevived.subscribe(mockEvent);
    mockedLogReader.emit('line', `[2025.01.27-21.39.29:924][584]LogSquad:  Abdellechômeur (Online IDs: EOS: 0002626fee8e4d39864e713c21ebed1c steam: 76561198272567281) has revived  Guava ice (Online IDs: EOS: 00027c18ff1e4a53babc382bdb7a26e1 steam: 76561199162788472).`)
    expect(mockEvent).toHaveBeenCalledWith({
      revived: {
        eosID: "00027c18ff1e4a53babc382bdb7a26e1",
        nameWithClanTag: " Guava ice", // that space before name is surprising.
        steamID: "76561199162788472"
      },
      reviver: {
        eosID: "0002626fee8e4d39864e713c21ebed1c",
        nameWithClanTag: " Abdellechômeur",
        steamID: "76561198272567281"
      }
    });
  });

  it('playerUnPossess (?)', () => {
    const mockEvent = jest.fn();
    logParser.events.playerUnPossess.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-21.52.07:907][438]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Bahalzik (Online IDs: EOS: 000254cba7114b34a10bc6f7ab633263 steam: 76561198319876586) current health value 100.000000');
    expect(mockEvent).toHaveBeenCalledWith({
      eosID: "000254cba7114b34a10bc6f7ab633263",
      name: "Bahalzik",
      steamID: "76561198319876586"
    });
  });


  it('playerUnPossess exit vehicle', () => {
    const mockEvent = jest.fn();
    logParser.events.playerUnPossess.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-21.52.23:104][ 44]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=TactiBarsik (Online IDs: EOS: 000266e1887646d88da2642dcfad4de1 steam: 76561199079599841) Exited Vehicle Pawn=TactiBarsik (Asset Name=BP_BFV_Turret_Woodland_C) FullPath=BP_BFV_Turret_Woodland_C /Game/Maps/Kamdesh_Highlands/Gameplay_Layers/Kamdesh_Invasion_v1.Kamdesh_Invasion_v1:PersistentLevel.BP_BFV_Turret_Woodland_C_2130421802 Seat Number=2');
    expect(mockEvent).toHaveBeenCalledWith({
      eosID: "000266e1887646d88da2642dcfad4de1",
      name: "TactiBarsik",
      steamID: "76561199079599841"
    });
  });

  it('playerWounded', () => {
    const mockEvent = jest.fn();
    logParser.events.playerWounded.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.23.56:380][439]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player: ShyGuy KillingDamage=199.097168 from BP_PlayerController_C_2130401015 (Online IDs: EOS: 0002df5431ae4860a812f52ca0f1e6b8 steam: 76561199672835673 | Controller ID: BP_PlayerController_C_2130401015) caused by BP_Soldier_RU_Pilot_C_2130397914');
    expect(mockEvent).toHaveBeenCalledWith({
      attacker: {
        controller: "BP_PlayerController_C_2130401015",
        eosID: "0002df5431ae4860a812f52ca0f1e6b8",
        steamID: "76561199672835673"
      },
      damage: 199.097168,
      victim: {
        nameWithClanTag: " ShyGuy"
      },
      weapon: "BP_Soldier_RU_Pilot"
    });
  });

  it('playerWounded by bot ignored (no eosID) ignored', () => {
    const mockEvent = jest.fn();
    logParser.events.playerWounded.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.02.04-16.24.25:152][722]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player: AbouHamza KillingDamage=0.000000 from nullptr (Online IDs: INVALID | Controller ID: None) caused by BP_Soldier_INS_Rifleman1_C_2095247640');
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('roundEnded', () => {
    const mockEvent = jest.fn();
    logParser.events.roundEnded.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.27.36:082][206]LogGameState: Match State Changed from InProgress to WaitingPostMatch');
    expect(mockEvent).toHaveBeenCalledWith(undefined);
  });

  it('roundTicket (won)', () => {
    const mockEvent = jest.fn();
    logParser.events.roundTicket.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.27.36:082][206]LogSquadGameEvents: Display: Team 2, 78th Detached Logistics Brigade ( Russian Ground Forces ) has won the match with 776 Tickets on layer Kamdesh Invasion v1 (level Kamdesh Highlands)!');
    expect(mockEvent).toHaveBeenCalledWith({
      action: "won",
      faction: "Russian Ground Forces",
      layer: "Kamdesh Invasion v1",
      level: "Kamdesh Highlands",
      subFaction: "78th Detached Logistics Brigade",
      team: "2",
      tickets: "776"
    });
  });

  it('roundTicket (lost)', () => {
    const mockEvent = jest.fn();
    logParser.events.roundTicket.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.27.36:082][206]LogSquadGameEvents: Display: Team 1, 1st Cavalry Regiment ( United States Army ) has lost the match with 373 Tickets on layer Kamdesh Invasion v1 (level Kamdesh Highlands)!');
    expect(mockEvent).toHaveBeenCalledWith({
      "action": "lost",
      "faction": "United States Army",
      "layer": "Kamdesh Invasion v1",
      "level": "Kamdesh Highlands",
      "subFaction": "1st Cavalry Regiment",
      "team": "1",
      "tickets": "373"
    });
  });

  it('vehicleSeatTakeDamage', () => {
    expect(true).toEqual(false);
    // todo implement
    mockedLogReader.emit('line', '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57');
    // logParser.events.takeDamage.subscribe((data) => {
    //   expect(data).toBe({
    //     message: 'hello',
    //     from: 'stufddddf'
    //   });
    // })
  });

  it('serverTickRate', () => {
    const mockEvent = jest.fn();
    logParser.events.serverTickRate.subscribe(mockEvent);
    mockedLogReader.emit('line', '[2025.01.27-22.08.17:811][ 60]LogSquad: USQGameState: Server Tick Rate: 39.52');
    expect(mockEvent).toHaveBeenCalledWith({
      "tickRate": "39.52"
    });
  });
})
