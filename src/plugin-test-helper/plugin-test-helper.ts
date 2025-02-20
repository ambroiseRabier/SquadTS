import { main } from '../main.mjs';
import { LogReader } from '../log-parser/use-log-reader';
import { Subject } from 'rxjs';
import { Rcon } from '../rcon/rcon';
import { IncludesRCONCommand } from '../rcon-squad/rcon-commands';
import { Options } from '../config/config.schema';
import { merge } from 'lodash-es';
import { DeepPartial } from '../utils';

export type TestServer = Awaited<ReturnType<typeof useTestServer>>;

interface Props {
  executeFn: <T extends string>(command: IncludesRCONCommand<T>) => Promise<string>;
  optionsOverride?: DeepPartial<Options>;
  pluginOptionOverride?: Record<string, unknown>;
}

/**
 * Watch out for...
 * ServerInfo has to be updated manually. (as for now, it isn't used by other events, so it can be ignored if not
 * directly used by the plugin)
 * Player list has to be updated manually.
 * Player squad list has to be updated manually.
 * Date mismatch between logs and RCON... (may or may not impact anything)
 */
export async function useTestServer({ executeFn, optionsOverride, pluginOptionOverride }: Props) {
  console.info('Starting test server... (this may take a while)');

  const mockLogReader: LogReader = {
    line$: new Subject<string>(),
    connect: async () => {
      /* no-op */
    },
    watch: async () => {
      /* no-op */
    },
    unwatch: async () => {
      /* no-op */
    },
  };

  // Since it is a class, TS complain even though all public properties are present.
  const mockRcon: Partial<Rcon> & { chatPacketEvent: Subject<string> } = {
    execute: executeFn,
    connect: async () => {
      /* no-op */
    },
    disconnect: async () => {
      /* no-op */
    },
    chatPacketEvent: new Subject<string>(),
  };

  const baseOptions: Options = {
    // rcon is not used because of the mock
    rcon: {
      autoReconnectDelay: 5000,
      host: '127.0.0.1',
      port: 25575,
      password: 'examplePassword',
      debugCondenseLogs: false, // Keep it false as this may be confusing in tests.
      debugCondenseLogsIgnoreSinceDisconnect: false, // same as above
    },
    logger: {
      verboseness: {
        // recommended to keep it at least at debug to fully enable debugLogMatching,
        // trace will also warn you if there is wrong or absent dates
        LogParser: 'trace',
        RCON: 'info', // not used because of the mock
        SquadServer: 'info',
        PluginLoader: 'info',
        RCONSquad: 'info',
        AdminList: 'info',
        LogReader: 'info', // not used because of the mock
        GithubInfo: 'info',
      },
      debugLogMatching: {
        showMatching: true, // recommended to keep it true for easier debug (help you confirm the logs you've placed are processed
        showNonMatching: true, // recommended to keep it true for easier debug (may help you find syntax error in logs you modified)

        // You may enable this with default values when you are sending a huge number of logs
        // You may also just disable showNonMatching, but this removes a little bit of help.
        ignoreRegexMatch: [],
      },
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
        initialTailSize: 1048576,
      },
      mode: 'ftp',
    },
    cacheGameStatus: {
      updateInterval: {
        // 1 is min value in config...
        serverInfo: 60, // Remember: expected value is in second in config. (todo: probably should make a manual update trigger too)
        layerInfo: 60, // unused for now, not implemented.
        playersAndSquads: 60, // manually trigger update yourself.
      },
    },
    rconSquad: {
      dryRun: false, // no dry run as we mock rcon anyway.
    },
    // Haven't thought of connectors for testing with TestServer for now.
    // ...
    connectors: {
      discord: {
        enabled: false,
        token: '', // ignored when enabled is false
      },
    },
    adminList: {
      remote: [],
    },
  };

  const manualRCONUpdateForTest = new Subject<void>();
  const server = await main({
    mocks: {
      logReader: mockLogReader,
      rcon: mockRcon as Rcon,
      // Default config for mocking, you may customize it for your tests.
      config: merge(baseOptions, optionsOverride),
      pluginOptionOverride: pluginOptionOverride,

      // Note that player can also be added to internal cache with logs, but it needs a set of five logs and is
      // more verbose. If you need some logs exclusive properties like ip, you do need that though.
      manualRCONUpdateForTest,
    },
  });

  console.info('Test server ready !');

  return {
    server,
    line$: mockLogReader.line$ as Subject<string>,
    rcon: mockRcon as Rcon,
    /**
     * Call this after update RCON ListPlayers return value.
     */
    triggerRCONUpdate: async () => {
      manualRCONUpdateForTest.next(); // todo: no need to close that to stop server ?
      // Let observable do his job before proceeding.
      await wait(0);
    },

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
        .forEach(line => (mockLogReader.line$ as Subject<string>).next(line));
    },
  };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
