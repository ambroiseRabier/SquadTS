import { main } from '../main.mjs';
import { LogReader } from '../log-parser/use-log-reader';
import { Subject } from 'rxjs';
import { Rcon } from '../rcon/rcon';
import { IncludesRCONCommand, RCONCommand } from '../rcon-squad/rcon-commands';
import { Options } from '../config/config.schema';
import { merge } from 'lodash-es';
import { DeepPartial } from '../utils';
import { MockedFunction } from 'vitest';
import { GameServerInfo } from '../rcon-squad/server-info.type';
import { wait } from '../test-utils';

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
      verbosity: {
        // recommended to keep it at least at debug to fully enable debugLogMatching,
        // trace will also warn you if there is wrong or absent dates
        LogParser: 'trace',
        RCON: 'info', // not used because of the mock
        SquadServer: 'info',
        PluginLoader: 'info',
        RCONSquad: 'debug',
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
      logFile: 'C:/fake/path/logParser/is/mocked',
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

/**
 * Note that SquadList is fetched at the same time as PlayerList.
 * ListPlayers, ListSquads and ShowServerInfo are fetched at startup.
 * This function will provide empty default for ListPlayers and ListSquads.
 * ShowServerInfo will use correct data, but if your code depends on:
 * - server.helpers.getTeamName()
 * - server.info
 * you likely want to provide your own response.
 */
export function setRconMock(
  rconExec: MockedFunction<Rcon['execute']>,
  resolvedValues: Partial<{
    ShowServerInfo: string;
    ListPlayers: string;
    ListSquads: string;
  }> &
    Record<string, string>
) {
  // @ts-expect-error No idea how to solve that :/, underlying type is still a string so no big issue here.
  rconExec.mockImplementation((command: string) => {
    for (const commandID in resolvedValues as Record<string, string>) {
      if (command.match(new RegExp(`^${commandID}`))) {
        if (typeof resolvedValues[commandID] === 'string') {
          return Promise.resolve(resolvedValues[commandID]);
        } else {
          throw new Error(
            `Rcon exec called with ${command}, but mocked value was not a string ! (${JSON.stringify(resolvedValues[commandID])})`
          );
        }
        break;
      }
    }

    // SquadTS itself does not critically depend on this data.
    // It is used for:
    // - server.helpers.getTeamName()
    // - server.info
    // So having a default instead of providing it in every test is really convenient.
    // Note that team faction is not matching the one in squad list.
    if (command.match(new RegExp(`^${RCONCommand.ShowServerInfo}`))) {
      console.warn(
        '⚠️ Returning default data for ShowServerInfo command, if you are using server.info in your tests, provide your own data !'
      );
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
    }

    // Provide an empty player list as default.
    if (command.match(new RegExp(`^${RCONCommand.ListPlayers}`))) {
      return Promise.resolve(`----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----
`);
    }

    // Provide an empty player squad as default.
    // Note that team faction is not matching default serverInfo.
    if (command.match(new RegExp(`^${RCONCommand.ListSquads}`))) {
      return Promise.resolve(`----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
Team ID: 2 (Manticore Security Task Force)
`);
    }
  });
}
