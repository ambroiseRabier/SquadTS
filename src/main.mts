import { useLogger, useSubLogger } from './logger/use-logger.mjs';
import { parseConfigs, useConfig } from './config/use-config';
import { Rcon } from './rcon/rcon';
import { useRconSquad } from './rcon-squad/use-rcon-squad';
import { LogReader, useLogReader } from './log-parser/use-log-reader';
import { useLogParser } from './log-parser/use-log-parser';
import { retrieveGithubInfo } from './github-info/use-retrieve-github-info';
import path from 'node:path';
import { useCachedGameStatus } from './cached-game-status/use-cached-game-status';
import { useSquadServer } from './squad-server';
import { useDiscordConnector } from './connectors/use-discord.connector';
import { usePluginLoader } from './plugin-loader/plugin-loader.mjs';
import { Options } from './config/config.schema';
import { dirname } from 'path';
import { fileURLToPath } from 'node:url';
import { Subject } from 'rxjs';
import { useRefinedLogEvents } from './cached-game-status/use-refined-log-events';
import { useRefinedChatEvents } from './cached-game-status/use-refined-chat-events';
import { obtainEnteringPlayer } from './cached-game-status/obtain-entering-player';
import { obtainRCONPlayersAndSquads } from './cached-game-status/rcon-updates';
import { ServerConfigFile, useSquadConfig } from './squad-config/use-squad-config';
import { useAdminList } from './admin-list/use-admin-list';
import { joinSafeSubPath, promiseWithTimeout } from './utils';

interface Props {
  /**
   * You may replace log reader and rcon by your own for testing.
   */
  mocks: {
    logReader: LogReader;
    rcon: Rcon;
    config: Options; // todo: again mixing config and options, choose :/
    pluginOptionOverride?: Record<string, unknown>;
    manualRCONUpdateForTest?: Subject<void>;
  };
}

export async function main(props?: Props) {
  const logger = useLogger();
  logger.info('Starting SquadTS');

  // Load config from object if it is a test server, or from directory if non-test server.
  const { valid, config } = !!props?.mocks
    ? await parseConfigs(props.mocks.config, logger)
    : await useConfig(logger);

  if (valid) {
    logger.info('Configuration validated.');
  } else {
    logger.fatal('Invalid configuration, check above for errors.');
    // feels redundant, but using a return make the function return type have union undefined...
    throw new Error('Invalid configuration, check above for errors.');
  }

  // This will never be called, as valid bool check, will have stopped program execution before.
  // However, it does make TS aware the config is not null.
  if (!config) {
    throw new Error('Config is null');
  }

  // Wiring dependencies part
  const {
    squadServerLogger,
    rconLogger,
    logParserLogger,
    rconSquadLogger,
    pluginLoaderLogger,
    logReaderLogger,
    githubInfoLogger,
  } = useSubLogger(logger, config.logger.verbosity);
  const rcon = props?.mocks.rcon ?? new Rcon(config.rcon, rconLogger);
  const rconSquad = useRconSquad(rconSquadLogger, rcon, config.rconSquad);
  const logReader = props?.mocks.logReader ?? useLogReader(config.logParser, logReaderLogger);
  const logParser = useLogParser(
    logParserLogger,
    logReader,
    config.logParser,
    config.logger.debugLogMatching
  );
  const configFetch = async (file: ServerConfigFile) => {
    const configFile = joinSafeSubPath(config.logParser.configDir, file + '.cfg');
    return await logReader.readFile(configFile);
  };
  const configUpload = async (file: ServerConfigFile, content: string) => {
    const configFile = joinSafeSubPath(config.logParser.configDir, file + '.cfg');
    return await logReader.writeFile(configFile, content);
  };
  const squadConfig = useSquadConfig(configFetch, configUpload, logger);
  const adminList = useAdminList(squadConfig);

  const earlyCleanup = async (skipExit = false) => {
    console.info('Shutdown signal received. Cleaning up...');
    try {
      await rcon.disconnect();
    } catch (error) {
      console.error(error);
      throw error;
    }
    try {
      await logReader.unwatch();
    } catch (error) {
      console.error(error);
      throw error;
    }
    // Wait a bit for remaining logs to be displayed, especially useful for tests that are very fast.
    await new Promise<void>((resolve, reject) => {
      logger.flush(err => (err ? reject(err) : resolve()));
    });
    console.info('Early cleanup completed.');
    if (!skipExit) {
      process.exit(0);
    }
  };

  const earlyException = async (error: Error) => {
    logger.fatal('UncaughtException, see the error trace above.', { error });
    console.error(error);
    try {
      await earlyCleanup(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.info(`Failed to early cleanup: ${error?.message}`);
      console.error(error);
    }
    process.exit(1);
  };

  // Handle process signals for cleanup
  process.on('SIGINT', earlyCleanup); // e.g., Ctrl+C
  process.on('SIGTERM', earlyCleanup); // e.g., Process kill
  process.on('uncaughtException', earlyException);

  // Test log FTP connection and RCON, as it is best for user to fail early if credentials are wrong.
  await rconSquad.connect();
  await logReader.connect();

  // Fetch admin lists from server config and cache it.
  await adminList.update();

  // Get extra info from squad wiki github. Only if file ETag changed.
  // todo use for.... ? Wasn't there a plugin that needed that
  // map vote maybe ? -> just allow to end match is enough with game map vote.
  const githubInfo = await retrieveGithubInfo(
    path.join(dirname(fileURLToPath(import.meta.url)), '..', 'github-info-cache'),
    githubInfoLogger
  );

  // Update the admin list once at game start.
  // I believe admin role changes are taken in account by squad only when changing layer.
  logParser.events.newGame.subscribe(async () => {
    await adminList.update();
  });

  // Retrieve initial
  const serverInfo = await rconSquad.showServerInfo();
  // This is more correct, since it will fill players with squad object !
  const { squads, players } = await obtainRCONPlayersAndSquads(rconSquad);
  const addPlayer$ = obtainEnteringPlayer(logParser.events, config.logParser, logger);

  const cachedGameStatus = useCachedGameStatus({
    initialPlayers: players,
    initialSquads: squads,
    initialServerInfo: serverInfo,
    rconSquad,
    logParser,
    config: config.cacheGameStatus,
    manualRCONUpdateForTest: props?.mocks.manualRCONUpdateForTest,
    addPlayer$,
  });

  const refinedLogEvents = useRefinedLogEvents({
    logParser,
    cachedGameStatus,
  });

  const refinedChatEvents = useRefinedChatEvents({
    rconSquad,
    cachedGameStatus,
  });

  // Finally, build the server that will be exposed to plugins.
  const server = useSquadServer({
    logger: squadServerLogger,
    rconSquad,
    logParser,
    cachedGameStatus,
    refinedLogEvents,
    refinedChatEvents,
    adminList,
    githubInfo,
    squadConfig,
  });

  const discordConnector = config.connectors.discord.enabled
    ? await useDiscordConnector(config.connectors.discord.token, logger).catch(error => {
        logger.error(`Discord connector failed to start: ${error?.message}`);
        return undefined;
      })
    : undefined;
  const pluginLoader = usePluginLoader(
    server,
    { discord: discordConnector },
    pluginLoaderLogger,
    logger
  );

  await pluginLoader.load(props?.mocks.pluginOptionOverride);

  process.removeListener('SIGINT', earlyCleanup);
  process.removeListener('SIGTERM', earlyCleanup);
  process.removeListener('uncaughtException', earlyException);

  // Note: Cannot remove "Terminate batch job (Y/N)?" --> https://superuser.com/questions/35698/how-to-supress-terminate-batch-job-y-n-confirmation
  //       So user will have to double CTRL-C ...
  // Note: avoid console log, although their timing is more correct,
  //       it appears messy if mixed up with pino logger that is slightly behind.
  const cleanupFCT = async () => {
    try {
      // Cleanup shouldn't be that long, if it is, it is probably a problem.
      // If you came here from a test, make sure you disabled fake timers before calling cleanup!
      await promiseWithTimeout(
        pluginLoader.unloadAll(),
        3000,
        'Plugin unload timeout, took more than 3 seconds.'
      );
      await promiseWithTimeout(
        server.unwatch(),
        3000,
        'Server unwatch timeout, took more than 3 seconds.'
      );

      if (discordConnector) {
        logger.info('Removing discord connector.');
        await discordConnector.destroy();
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.info('Failed to unwatch server.');
      console.error(error);
      // process.exitCode = 1;
      process.exit(1);
    }

    // Quite useful if hanging! (3 handles is normal: stdout, stdin and pino)
    // if you forgot to clean discord, it will appear.
    // Debug what's keeping the process alive
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // console.log('Active handles:', process._getActiveHandles());
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // console.log('Active requests:', process._getActiveRequests());
  };

  // Handle process signals for cleanup
  process.once('SIGINT', async () => {
    logger.info('(SIGINT) Shutdown signal received. Cleaning up...');
    await cleanupFCT();
    process.exit(0);
  }); // e.g., Ctrl+C
  process.once('SIGTERM', async () => {
    logger.info('(SIGTERM) Shutdown signal received. Cleaning up...');
    await cleanupFCT();
    process.exit(0);
  }); // e.g., Process kill
  process.once('uncaughtException', async error => {
    logger.fatal('UncaughtException, see the error trace above.', { error });
    console.error(error);
    await cleanupFCT();
    process.exit(1);
  });

  // Only start sending events when all plugins are ready. Plugins are likely independent of each other.
  // But having logs all over the place is bad.
  await server.watch();

  logger.info('SquadTS fully started.');

  return {
    ...server,
    // Will also handle plugin's cleanup, that is most important for e2e tests!
    unwatch: cleanupFCT.bind(cleanupFCT),
  };
}
