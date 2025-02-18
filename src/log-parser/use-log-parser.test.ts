import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogParser, useLogParser } from './use-log-parser';
import { LogParserConfig } from './log-parser.config';
import { Subject } from 'rxjs';
import { createMockLogger } from '../test-utils';
import { Logger } from 'pino';
import { LogReader } from './use-log-reader';


describe('Log Parser events', () => {
  let logParser: LogParser;
  let mockedLogReader: {
    line$: Subject<string>;
  };
  // note: Any missing function will just make the test fail without any information.
  const fakeLogger = createMockLogger();
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
  };

  beforeAll(() => {
    vi.useFakeTimers(); // Mock timers
    vi.setSystemTime(new Date('2025-02-01T00:00:00Z')); // Freeze time
  });

  afterAll(() => {
    vi.useRealTimers(); // Restore real timers
  });

  beforeEach(async () => {
    // Clear previous mock calls and implementations
    vi.clearAllMocks();

    mockedLogReader = {
      line$: new Subject<string>(),
    };

    logParser = useLogParser(
      fakeLogger as unknown as Logger,
      mockedLogReader as unknown as LogReader,
      logParserConfig,
      {
        showMatching: true,
        showNonMatching: true,
        ignoreRegexMatch: [],
      }
    );
  });

  it('should ignore first incomplete line', () => {
    // any event subscription
    logParser.events.adminBroadcast.subscribe(() => { /* no-op */ });
    // Note if there is any other error, this test will also fail.
    expect(() => {
      // incomplete date, happen at start when we start reading file.
      mockedLogReader.line$.next(
        '-13.27.36:294][437]LogEOS: Warning: [LogEOSAuth] Unable to get Epic account id from product user id - No logged in user found'
      );
    }).not.toThrow();
  });

  it('should not log multiple time for many subscriber', async () => {
    // todo
    logParser = useLogParser(
      // note: Any missing function will just make the test fail without any information.
      fakeLogger,
      mockedLogReader as any,
      logParserConfig,
      {
        showMatching: true,
        showNonMatching: true,
        ignoreRegexMatch: [],
      }
    );

    const mockEvent = vi.fn();
    // any event subscription, but two of them (can be a mix)
    logParser.events.adminBroadcast.subscribe(mockEvent);
    logParser.events.adminBroadcast.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON'
    ); // log in the past

    // If we receive two time the same logs, we have a bug, most likely .share() not being used with RXJS.
    expect(fakeLogger.trace).toHaveBeenNthCalledWith(
      1,
      'Receiving: [2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON'
    );
    expect(fakeLogger.trace).not.toHaveBeenNthCalledWith(
      2,
      'Receiving: [2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON'
    );
    expect(mockEvent).toHaveBeenCalled(); // just assert that even has been called, not object of the test
  });

  it('adminBroadcast', () => {
    const mockEvent = vi.fn();
    logParser.events.adminBroadcast.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.39.52:306][461]LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '461',
      date: expect.any(Date),
      message: 'coucou',
      from: 'RCON',
    });
  });

  it('deployableDamaged', () => {
    const mockEvent = vi.fn();
    logParser.events.deployableDamaged.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57'
    );
    // Better IDE support if using ToEqual instead of toHaveBeenCalledWith
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '461',
      damage: '350.00',
      damageType: 'BP_Fragmentation_DamageType',
      date: expect.any(Date),
      deployable: 'BP_I_Sandbag_2',
      healthRemaining: '214.57',
      attackerName: 'Mooz',
      weapon: 'BP_Mortarround4',
    });
  });

  it('loginRequest', () => {
    const mockEvent = vi.fn();
    logParser.events.loginRequest.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.31-17.17.59:404][483]LogNet: Login request: ?Name=Yuca userId: RedpointEOS:0002a10386d9114496bf20d22d3860ba platform: RedpointEOS'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '483',
      date: expect.any(Date),
      name: 'Yuca',
      eosID: '0002a10386d9114496bf20d22d3860ba',
    });
  });

  it('newGame', () => {
    const mockEvent = vi.fn();
    logParser.events.newGame.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.50.48:212][280]LogWorld: Bringing World /Game/Maps/TransitionMap.TransitionMap up for play (max tick rate 40) at 2025.01.27-13.50.48'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '280',
      date: expect.any(Date),
      dlc: 'Game',
      layerClassname: 'TransitionMap',
      mapClassname: 'Maps',
    });
  });

  it('playerAddedToTeam', () => {
    const mockEvent = vi.fn();
    logParser.events.playerAddedToTeam.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.31-17.18.07:493][805]LogSquad: Player  Yuca has been added to Team 1'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '805',
      date: expect.any(Date),
      name: 'Yuca',
      teamID: '1',
    });
  });

  it('playerConnected', () => {
    const mockEvent = vi.fn();
    logParser.events.playerConnected.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.27.36:082][206]LogSquad: PostLogin: NewPlayer: BP_PlayerController_C /Game/Maps/Kamdesh_Highlands/Gameplay_Layers/Kamdesh_Invasion_v1.Kamdesh_Invasion_v1:PersistentLevel.BP_PlayerController_C_2130426410 (IP: 92.106.127.65 | Online IDs: EOS: 000215531fcb4a1f935b477b9da213ff steam: 76561129553531043)'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '206',
      date: expect.any(Date),
      eosID: '000215531fcb4a1f935b477b9da213ff',
      ip: '92.106.127.65',
      controller: 'BP_PlayerController_C_2130426410',
      steamID: '76561129553531043',
    });
  });

  it('playerDamaged', () => {
    const mockEvent = vi.fn();
    logParser.events.playerDamaged.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.04.23:734][749]LogSquad: Player:-TWS- Ramzer ActualDamage=47.000000 from  NiceLP (Online IDs: EOS: 0002e45ac2af4c1c38fc08691a3f591e steam: 76161198185177949 | Player Controller ID: BP_PlayerController_C_2130489498)caused by BP_SVDM_Optic_C_2130416661'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '749',
      date: expect.any(Date),
      attacker: {
        controller: 'BP_PlayerController_C_2130489498',
        eosID: '0002e45ac2af4c1c38fc08691a3f591e',
        nameWithClanTag: ' NiceLP',
        steamID: '76161198185177949',
      },
      damage: '47.000000',
      victim: {
        nameWithClanTag: '-TWS- Ramzer',
      },
      weapon: 'BP_SVDM_Optic',
    });
  });

  it('playerDamaged by bot ignored (no eos id)', () => {
    const mockEvent = vi.fn();
    logParser.events.playerDamaged.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.02.04-16.23.20:701][155]LogSquad: Player:*FLS*  TGD_Emokid ActualDamage=50.399998 from nullptr (Online IDs: INVALID | Player Controller ID: None)caused by BP_Projectile_7_62mm_C_2095247838'
    );
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('playerDied', () => {
    const mockEvent = vi.fn();
    logParser.events.playerDied.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.05.10:229][600]LogSquadTrace: [DedicatedServer]ASQSoldier::Die(): Player:  UFFD KillingDamage=-300.000000 from BP_PlayerController_C_2131535015 (Online IDs: EOS: 0002eca389864a629f1a11e2722df6be steam: 76561199394112551 | Contoller ID: BP_PlayerController_C_2131535015) caused by BP_Soldier_RU_Medic_C_2130417755'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '600',
      date: expect.any(Date),
      attacker: {
        controller: 'BP_PlayerController_C_2131535015',
        eosID: '0002eca389864a629f1a11e2722df6be',
        steamID: '76561199394112551',
      },
      damage: '300.000000',
      victim: {
        nameWithClanTag: '  UFFD',
      },
      weapon: 'BP_Soldier_RU_Medic',
    });
  });

  it('playerDisconnected', () => {
    const mockEvent = vi.fn();
    logParser.events.playerDisconnected.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.05.26:087][233]LogNet: UChannel::Close: Sending CloseBunch. ChIndex == 0. Name: [UChannel] ChIndex: 0, Closing: 0 [UNetConnection] RemoteAddr: 86.208.113.0:60419, Name: EOSIpNetConnection_2130439491, Driver: GameNetDriver EOSNetDriver_2131536283, IsServer: YES, PC: BP_PlayerController_C_2130438728, Owner: BP_PlayerController_C_2130438728, UniqueId: RedpointEOS:0002201300c327a19a4c6ae06dc955a3'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '233',
      date: expect.any(Date),
      eosID: '0002201300c327a19a4c6ae06dc955a3',
      ip: '86.208.113.0',
      controller: 'BP_PlayerController_C_2130438728',
    });
  });

  it('playerJoinSucceeded', () => {
    const mockEvent = vi.fn();
    logParser.events.playerJoinSucceeded.subscribe(mockEvent);
    mockedLogReader.line$.next('[2025.01.27-22.09.43:029][469]LogNet: Join succeeded: ShyGuy');
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '469',
      date: expect.any(Date),
      name: 'ShyGuy',
    });
  });

  it('playerInitialized', () => {
    const mockEvent = vi.fn();
    logParser.events.playerInitialized.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.31-17.18.07:493][805]LogGameMode: Initialized player Yuca with 1'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '805',
      date: expect.any(Date),
      name: 'Yuca',
      id: '1',
    });
  });

  it('playerPossess', () => {
    const mockEvent = vi.fn();
    logParser.events.playerPossess.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.27.36:082][206]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=gekapu (Online IDs: EOS: 00025a0bc5f54f728a36b717ab288f67 steam: 76561199538744782) Pawn=BP_Soldier_INS_Rifleman1_C_2126289717 FullPath=BP_Soldier_INS_Rifleman1_C /Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1:PersistentLevel.BP_Soldier_INS_Rifleman1_C_2126289717'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '206',
      date: expect.any(Date),
      eosID: '00025a0bc5f54f728a36b717ab288f67',
      steamID: '76561199538744782',
      playerSuffix: 'gekapu',
      possessClassname: 'BP_Soldier_INS_Rifleman1',
    });
  });

  it('playerRevived', () => {
    const mockEvent = vi.fn();
    logParser.events.playerRevived.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.39.29:924][584]LogSquad:  Abdellechômeur (Online IDs: EOS: 0002626fee8e4d39864e713c21ebed1c steam: 76561198272567281) has revived  Guava ice (Online IDs: EOS: 00027c18ff1e4a53babc382bdb7a26e1 steam: 76561199162788472).'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      revived: {
        eosID: '00027c18ff1e4a53babc382bdb7a26e1',
        nameWithClanTag: ' Guava ice', // that space before name is surprising.
        steamID: '76561199162788472',
      },
      reviver: {
        eosID: '0002626fee8e4d39864e713c21ebed1c',
        nameWithClanTag: ' Abdellechômeur',
        steamID: '76561198272567281',
      },
    });
  });

  it('playerUnPossess (?)', () => {
    const mockEvent = vi.fn();
    logParser.events.playerUnPossess.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.52.07:907][438]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=Bahalzik (Online IDs: EOS: 000254cba7114b34a10bc6f7ab633263 steam: 76561198319876586) current health value 100.000000'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '438',
      date: expect.any(Date),
      eosID: '000254cba7114b34a10bc6f7ab633263',
      name: 'Bahalzik',
      steamID: '76561198319876586',
    });
  });

  it('playerUnPossess exit vehicle', () => {
    const mockEvent = vi.fn();
    logParser.events.playerUnPossess.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-21.52.23:104][ 44]LogSquadTrace: [DedicatedServer]ASQPlayerController::OnUnPossess(): PC=TactiBarsik (Online IDs: EOS: 000266e1887646d88da2642dcfad4de1 steam: 76561199079599841) Exited Vehicle Pawn=TactiBarsik (Asset Name=BP_BFV_Turret_Woodland_C) FullPath=BP_BFV_Turret_Woodland_C /Game/Maps/Kamdesh_Highlands/Gameplay_Layers/Kamdesh_Invasion_v1.Kamdesh_Invasion_v1:PersistentLevel.BP_BFV_Turret_Woodland_C_2130421802 Seat Number=2'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '44',
      date: expect.any(Date),
      eosID: '000266e1887646d88da2642dcfad4de1',
      name: 'TactiBarsik',
      steamID: '76561199079599841',
    });
  });

  it('playerWounded', () => {
    const mockEvent = vi.fn();
    logParser.events.playerWounded.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.23.56:380][439]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player: ShyGuy KillingDamage=199.097168 from BP_PlayerController_C_2130401015 (Online IDs: EOS: 0002df5431ae4860a812f52ca0f1e6b8 steam: 76561199672835673 | Controller ID: BP_PlayerController_C_2130401015) caused by BP_Soldier_RU_Pilot_C_2130397914'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '439',
      date: expect.any(Date),
      attacker: {
        controller: 'BP_PlayerController_C_2130401015',
        eosID: '0002df5431ae4860a812f52ca0f1e6b8',
        steamID: '76561199672835673',
      },
      damage: 199.097168,
      victim: {
        nameWithClanTag: ' ShyGuy',
      },
      weapon: 'BP_Soldier_RU_Pilot',
    });
  });

  it('playerWounded by bot ignored (no eosID) ignored', () => {
    const mockEvent = vi.fn();
    logParser.events.playerWounded.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.02.04-16.24.25:152][722]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player: AbouHamza KillingDamage=0.000000 from nullptr (Online IDs: INVALID | Controller ID: None) caused by BP_Soldier_INS_Rifleman1_C_2095247640'
    );
    expect(mockEvent).not.toHaveBeenCalled();
  });

  it('roundEnded', () => {
    const mockEvent = vi.fn();
    logParser.events.roundEnded.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.27.36:082][206]LogGameState: Match State Changed from InProgress to WaitingPostMatch'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '206',
      date: expect.any(Date),
    });
  });

  it('roundTicket (won)', () => {
    const mockEvent = vi.fn();
    logParser.events.roundTicket.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.27.36:082][206]LogSquadGameEvents: Display: Team 2, 78th Detached Logistics Brigade ( Russian Ground Forces ) has won the match with 776 Tickets on layer Kamdesh Invasion v1 (level Kamdesh Highlands)!'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '206',
      date: expect.any(Date),
      action: 'won',
      faction: 'Russian Ground Forces',
      layer: 'Kamdesh Invasion v1',
      level: 'Kamdesh Highlands',
      subFaction: '78th Detached Logistics Brigade',
      team: '2',
      tickets: '776',
    });
  });

  it('roundTicket (lost)', () => {
    const mockEvent = vi.fn();
    logParser.events.roundTicket.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.27.36:082][206]LogSquadGameEvents: Display: Team 1, 1st Cavalry Regiment ( United States Army ) has lost the match with 373 Tickets on layer Kamdesh Invasion v1 (level Kamdesh Highlands)!'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '206',
      date: expect.any(Date),
      action: 'lost',
      faction: 'United States Army',
      layer: 'Kamdesh Invasion v1',
      level: 'Kamdesh Highlands',
      subFaction: '1st Cavalry Regiment',
      team: '1',
      tickets: '373',
    });
  });

  it('vehicleSeatTakeDamage', () => {
    expect(true).toEqual(false);
    // todo implement
    mockedLogReader.line$.next(
      '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57'
    );
    // logParser.events.takeDamage.subscribe((data) => {
    //   expect(data).toBe({
    //     message: 'hello',
    //     from: 'stufddddf'
    //   });
    // })
  });

  it('serverTickRate', () => {
    const mockEvent = vi.fn();
    logParser.events.serverTickRate.subscribe(mockEvent);
    mockedLogReader.line$.next(
      '[2025.01.27-22.08.17:811][ 60]LogSquad: USQGameState: Server Tick Rate: 39.52'
    );
    expect(mockEvent.mock.calls[0][0]).toEqual({
      chainID: '60',
      date: expect.any(Date),
      tickRate: '39.52',
    });
  });
});
