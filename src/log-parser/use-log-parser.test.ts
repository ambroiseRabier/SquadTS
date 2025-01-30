import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LogParser, useLogParser } from './use-log-parser';
import { LogReader } from './use-log-reader';
import EventEmitter from 'events';
import { firstValueFrom } from 'rxjs';

describe('Log Parser events', () => {
  let logParser: LogParser;
  let mockedLogReader: EventEmitter;


  beforeEach(async () => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    mockedLogReader = new EventEmitter();

    logParser = useLogParser(
      // note: Any missing function will just make the test fail without any information.
      {
        trace: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any,
      mockedLogReader as any,
      {
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
      },
      {
        enabled: false,
        ignoreRegexMatch: []
      }
    );
  });

  it('adminBroadcast', () => {
    mockedLogReader.emit('line', 'LogSquad: ADMIN COMMAND: Message broadcasted <coucou> from RCON');
    logParser.events.adminBroadcast.subscribe((data) => {
      expect(data).toBe({
        message: 'coucoun',
        from: 'RCON'
      });
    })
  });

  it('deployableTakeDamage', () => {
    // todo implement
    mockedLogReader.emit('line', '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57');
    // logParser.events.takeDamage.subscribe((data) => {
    //   expect(data).toBe({
    //     message: 'hello',
    //     from: 'stuff'
    //   });
    // })
  });

  it('vehicleSeatTakeDamage', () => {
    // todo implement
    mockedLogReader.emit('line', '[2025.01.27-21.39.52:306][461]LogSquadTrace: [DedicatedServer]ASQDeployable::TakeDamage(): BP_I_Sandbag_2_C_2130546928: 350.00 damage attempt by causer BP_Mortarround4_C_2130496948 instigator Mooz with damage type BP_Fragmentation_DamageType_C health remaining 214.57');
    // logParser.events.takeDamage.subscribe((data) => {
    //   expect(data).toBe({
    //     message: 'hello',
    //     from: 'stufddddf'
    //   });
    // })
  });

  it('serverTickRate', (done) => {
    logParser.events.serverTickRate.subscribe((data) => {
      expect(data).toEqual({
        "tickRate": "39.52"
      });
      done();
    })
    mockedLogReader.emit('line', '[2025.01.27-22.08.17:811][ 60]LogSquad: USQGameState: Server Tick Rate: 39.52');
  });

  it('roundEnded', (done) => {
    logParser.events.roundEnded.subscribe((data) => {
      expect(data).toEqual(undefined);
      done();
    })
    mockedLogReader.emit('line', '[2025.01.27-22.27.36:082][206]LogGameState: Match State Changed from InProgress to WaitingPostMatch');
  });


  it('playerPossess', (done) => {
    logParser.events.playerPossess.subscribe((data) => {
      expect(data).toEqual(undefined);
      done();
    })
    mockedLogReader.emit('line', 'LogSquadTrace: [DedicatedServer]ASQPlayerController::OnPossess(): PC=gekapu (Online IDs: EOS: 00025a0bc5f54f728a36b717ab288f67 steam: 76561199538744782) Pawn=BP_Soldier_INS_Rifleman1_C_2126289717 FullPath=BP_Soldier_INS_Rifleman1_C /Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1:PersistentLevel.BP_Soldier_INS_Rifleman1_C_2126289717');
  });

  it('playerPossess', (done) => {
    logParser.events.playerPossess.subscribe((data) => {
      expect(data).toEqual(undefined);
      done();
    })
    mockedLogReader.emit('line', 'LogEOS: Verbose: Using host IP from EOS_OVERRIDE_HOST_IP: 37.153.157.195/Game/Maps/Sumari/Gameplay_Layers/Sumari_Seed_v1.Sumari_Seed_v1:PersistentLevel.BP_Soldier_INS_Rifleman1_C_2126289717');
  });
})
