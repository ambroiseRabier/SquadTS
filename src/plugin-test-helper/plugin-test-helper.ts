import { main } from '../main.mjs';
import { LogReader } from '../log-parser/use-log-reader';
import { Subject } from 'rxjs';
import { Rcon } from '../rcon/rcon';
import { IncludesRCONCommand } from '../rcon-squad/rcon-commands';

export type TestServer = Awaited<ReturnType<typeof useTestServer>>;

/**
 * Watch out for...
 * ServerInfo has to be updated manually. (as for now, it isn't used by other events, so it can be ignored if not
 * directly used by the plugin)
 * Player list has to be updated manually.
 * Player squad list has to be updated manually.
 * Date mismatch between logs and RCON... (may or may not impact anything)
 */
export async function useTestServer(executeFn: <T extends string>(command: IncludesRCONCommand<T>) => Promise<string>) {
  console.info('Starting test server... (this may take a while)');

  const mockLogReader: LogReader = {
    line$: new Subject<string>(),
    watch: async () => {}, // no-op
    unwatch: async () => {}, // no-op
  };

  // Since it is a class, TS complain even though all public properties are present.
  const mockRcon: Partial<Rcon> & {chatPacketEvent: Subject<string>} = {
    execute: executeFn,
    connect: async () => { /* no-op */ },
    disconnect: async () => { /* no-op */ },
    chatPacketEvent: new Subject<string>()
  }

  // Update interval in ms, you should set it very low, because you will have to wait for it in the tests.
  // For server info and players and squads to be updated.
  // Note that players can also be added to internal cache through logs (but this is somewhat verbose at a set of 5 logs
  // is used to cache a player).
  const updateInterval = 50;

  const server = await main({
    mocks: {
      logReader: mockLogReader,
      rcon: mockRcon as Rcon,
      // Default config for mocking, you may customize it for your tests.
      config: {
        // rcon is not used because of the mock
        rcon: {
          autoReconnectDelay: 5000,
          host: '127.0.0.1',
          port: 25575,
          password: 'examplePassword'
        },
        logger: {
          verboseness: {
            LogParser: 'debug', // recommended to keep it at debug to fully enable debugLogMatching
            RCON: 'info', // not used because of the mock
            SquadServer: 'info',
            CachedGameStatus: 'info',
            PluginLoader: 'info',
            RCONSquad: 'info',
            AdminList: 'info',
            LogReader: 'info', // not used because of the mock
            GithubInfo: 'info'
          },
          debugLogMatching: {
            showMatching: true, // recommended to keep it true for easier debug (help you confirm the logs you've placed are processed
            showNonMatching: true, // recommended to keep it true for easier debug (may help you find syntax error in logs you modified)

            // You may enable this with default values when you are sending a huge number of logs
            // You may also just disable showNonMatching, but this removes a little bit of help.
            ignoreRegexMatch: []
          }
        },
        // log parser config is mostly ignored as we mock log reader
        logParser: {
          logFile: 'C:/servers/squad_server/SquadGame/Saved/Logs',
          ftp: {
            host: '127.0.0.1',
            port: 21,
            username: 'exampleUser',
            password: 'examplePassword',
            fetchInterval: 5000,
            initialTailSize: 1048576
          },
          mode: 'ftp'
        },
        cacheGameStatus: {
          updateInterval: {
            serverInfo: updateInterval,
            layerInfo: updateInterval,
            playersAndSquads: updateInterval,
          }
        },
        rconSquad: {
          dryRun: false, // no dry run as we mock rcon anyway.
        },
        // Haven't thought of connectors for testing with TestServer for now.
        // ...
        connectors: {
          discord: {
            enabled: false,
            token: '' // ignored when enabled is false
          }
        },
        adminList: {
          remote: []
        }
      }
    }
  });

  console.info('Test server ready !');

  return {
    updateInterval,
    server,
    line$: mockLogReader.line$ as Subject<string>,
    rcon: mockRcon as Rcon,

    /**
     * Helper to emit logs.
     * Ignore empty lines and remove front space to allow better code formatting on multiline strings.
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
