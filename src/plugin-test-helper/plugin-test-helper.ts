import { main } from '../main';
import { LogReader } from '../log-parser/use-log-reader';
import { RconSquad } from '../rcon-squad/use-rcon-squad';
import { Observable, Subject } from 'rxjs';
import { useAdminInCam } from '../rcon-squad/squad-events/use-admin-in-cam';
import { jest } from '@jest/globals';
import { Rcon } from '../rcon/rcon';

type ObsToSub<T> = T extends Observable<infer U> ? Subject<U> : never;

export type TestServer = Awaited<ReturnType<typeof useTestServer>>;

/**
 * This uses jest, and should only be called in tests.
 *
 * Watch out for...
 * ServerInfo has to be updated manually. (as for now, it isn't used by other events, so it can be ignored if not
 * directly used by the plugin)
 * Player list has to be updated manually.
 * Player squad list has to be updated manually.
 * adminsInAdminCam is updated from chatEvents.possessedAdminCamera and chatEvents.unPossessedAdminCamera, dates
 * need to bet set to meaningful values, for it to give proper duration.
 */
export async function useTestServer(executeFn: (command: string) => Promise<string>) {
  console.info('Starting test server... (this may take a while)');
  const mockLogReader: LogReader = {
    line$: new Subject<string>(),
    watch: async () => {}, // no-op
    unwatch: async () => {}, // no-op
  };

  // const mockRCONSquad: Omit<RconSquad, 'adminsInAdminCam'> = {
  //   // Methods from useRconSquadExecute
  //   getCurrentMap: jest.fn<RconSquad['getCurrentMap']>(),
  //   getNextMap: jest.fn<RconSquad['getNextMap']>(),
  //   getListPlayers: jest.fn<RconSquad['getListPlayers']>(),
  //   getSquads: jest.fn<RconSquad['getSquads']>(),
  //   broadcast: jest.fn<RconSquad['broadcast']>(),
  //   setFogOfWar: jest.fn<RconSquad['setFogOfWar']>(),
  //   warn: jest.fn<RconSquad['warn']>(),
  //   ban: jest.fn<RconSquad['ban']>(),
  //   disbandSquad: jest.fn<RconSquad['disbandSquad']>(),
  //   kick: jest.fn<RconSquad['kick']>(),
  //   forceTeamChange: jest.fn<RconSquad['forceTeamChange']>(),
  //   showServerInfo: jest.fn<RconSquad['showServerInfo']>(),
  //
  //   // Methods & properties from useSquadEvents
  //   // We use Subject instead of no-op observable like `of()` so we can call .next(...) in tests
  //   chatEvents: {
  //     message: new Subject(),
  //     command: new Subject(),
  //     possessedAdminCamera: new Subject(),
  //     unPossessedAdminCamera: new Subject(),
  //     playerWarned: new Subject(),
  //     playerKicked: new Subject(),
  //     squadCreated: new Subject(),
  //     playerBanned: new Subject(),
  //   },
  //
  //   // Direct bindings from rcon
  //   connect: async () => { /* no-op */ },
  //   disconnect: async () => { /* no-op */ },
  //   execute: executeFn,
  // };
  //
  // // Re-use adminsInAdminCam logic instead of rewriting it here. (but this requires inserting the correct dates)
  // const {adminsInAdminCam, possessedAdminCamera, unPossessedAdminCamera} = useAdminInCam({
  //   possessedAdminCamera: mockRCONSquad.chatEvents.possessedAdminCamera,
  //   unPossessedAdminCamera: mockRCONSquad.chatEvents.unPossessedAdminCamera,
  // });
  //
  // // Since it is a class, TS complain even though all public properties are present.
  // const mockRcon: Partial<Rcon> = {
  //   execute: executeFn,
  //   connect: async () => { /* no-op */ },
  //   disconnect: async () => { /* no-op */ },
  //   chatPacketEvent: new Subject<string>()
  // }

  await main({
    mocks: {
      logReader: mockLogReader,
      rcon: mockRcon as Rcon
      // What if I just mock RCON, would that be ok?
      // rconSquad: {
      //   ...mockRCONSquad,
      //   chatEvents: {
      //     ...mockRCONSquad.chatEvents,
      //     possessedAdminCamera,
      //     unPossessedAdminCamera,
      //   },
      //   adminsInAdminCam,
      // }
    }
  });

  console.info('Test server ready !');

  return {
    line$: mockLogReader.line$ as Subject<string>,
    rcon: {
      ...mockRCONSquad,
      // Cast back to what it really is, giving type safety to tests :)
      getCurrentMap: mockRCONSquad.getCurrentMap as jest.MockedFunction<RconSquad['getCurrentMap']>,
      getNextMap: mockRCONSquad.getNextMap as jest.MockedFunction<RconSquad['getNextMap']>,
      getListPlayers: mockRCONSquad.getListPlayers as jest.MockedFunction<RconSquad['getListPlayers']>,
      getSquads: mockRCONSquad.getSquads as jest.MockedFunction<RconSquad['getSquads']>,
      broadcast: mockRCONSquad.broadcast as jest.MockedFunction<RconSquad['broadcast']>,
      setFogOfWar: mockRCONSquad.setFogOfWar as jest.MockedFunction<RconSquad['setFogOfWar']>,
      warn: mockRCONSquad.warn as jest.MockedFunction<RconSquad['warn']>,
      ban: mockRCONSquad.ban as jest.MockedFunction<RconSquad['ban']>,
      disbandSquad: mockRCONSquad.disbandSquad as jest.MockedFunction<RconSquad['disbandSquad']>,
      kick: mockRCONSquad.kick as jest.MockedFunction<RconSquad['kick']>,
      forceTeamChange: mockRCONSquad.forceTeamChange as jest.MockedFunction<RconSquad['forceTeamChange']>,
      showServerInfo: mockRCONSquad.showServerInfo as jest.MockedFunction<RconSquad['showServerInfo']>,
      chatEvents: {
        ...mockRCONSquad.chatEvents,
        possessedAdminCamera,
        unPossessedAdminCamera,
        // Cast back Observables to Subject, so that we can call .next
        // We are aware we made Subjects inside mockRCONSquad, not observable.
      } as {
        message: ObsToSub<RconSquad['chatEvents']['message']>;
        command: ObsToSub<RconSquad['chatEvents']['command']>;
        possessedAdminCamera: ObsToSub<RconSquad['chatEvents']['possessedAdminCamera']>;
        unPossessedAdminCamera: ObsToSub<RconSquad['chatEvents']['unPossessedAdminCamera']>;
        playerWarned: ObsToSub<RconSquad['chatEvents']['playerWarned']>;
        playerKicked: ObsToSub<RconSquad['chatEvents']['playerKicked']>;
        squadCreated: ObsToSub<RconSquad['chatEvents']['squadCreated']>;
        playerBanned: ObsToSub<RconSquad['chatEvents']['playerBanned']>;
      }
    },
    helpers: {
      /**
       * Helper to emit logs.
       * @param logs
       */
      emitLogs: (logs: string) => {
        logs
          .split('\n')
          .map(line => line.trimStart()) // trimStart allow indentation in test file
          .filter(line => line.length > 0) // Remove possible empty line due to code formatting
          .forEach(line => (mockLogReader.line$ as Subject<string>).next(line))
      }
    }
  }
}
