import { useLogger, useSubLogger } from './logger/use-logger.mjs';
import { parseConfigs, useConfig } from './config/use-config';
import { Rcon } from './rcon/rcon';
import { useRconSquad } from './rcon-squad/use-rcon-squad';
import { LogReader, useLogReader } from './log-parser/use-log-reader';
import { useLogParser } from './log-parser/use-log-parser';
import { useAdminList } from './admin-list/use-admin-list';
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
    adminListLogger,
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
  const adminList = useAdminList(adminListLogger, config.adminList);

  // Handle process signals for cleanup
  process.on('SIGINT', async () => {
    console.log('SIGINT');
    logger.info('Shutdown signal received. Cleaning up...');
    await rcon.disconnect();
    await logReader.unwatch();
  }); // e.g., Ctrl+C
  process.on('SIGTERM', async () => {
    console.log('SIGTERM');
    logger.info('Shutdown signal received. Cleaning up...');
    await rcon.disconnect();
    await logReader.unwatch();
  }); // e.g., Process kill
  process.on('disconnect', () => {
    logger.info('Disconnect signal received. Cleaning up...');
    console.log('disconnect');
  });

  // Test log FTP connection and RCON, as it is best for user to fail early if credentials are wrong.
  await rconSquad.connect();
  await logReader.connect();

  // Get extra info from squad wiki github. Only if file ETag changed.
  // todo use for.... ? Wasn't there a plugin that needed that
  // map vote maybe ? -> just allow to end match is enough with game map vote.
  const githubInfo = await retrieveGithubInfo(
    path.join(dirname(fileURLToPath(import.meta.url)), '..', 'github-info-cache'),
    githubInfoLogger
  );

  // Update admin list once at startup.
  await adminList.fetch();

  // Update the admin list once at game start.
  // I believe admin role change is taken in account by squad only when changing layer.
  logParser.events.newGame.subscribe(async () => {
    await adminList.fetch();
  });

  // Retrieve initial
  const serverInfo = await rconSquad.showServerInfo();
  const players = await rconSquad.getListPlayers();
  const squads = await rconSquad.getSquads();
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

  // Finally build the server that will be exposed to plugins.
  const server = useSquadServer({
    logger: squadServerLogger,
    rconSquad,
    logParser,
    cachedGameStatus,
    refinedLogEvents,
    refinedChatEvents,
    adminList,
    githubInfo,
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

  // Override and add server.unwatch() (will also stop rcon update from cached game status.
  // Handle process signals for cleanup
  process.on('SIGINT', async () => {
    // Note that: if unwatch is really fast, logger won't have time to log.
    logger.info('Shutdown signal received. Cleaning up...');
    await server.unwatch();
  }); // e.g., Ctrl+C
  process.on('SIGTERM', async () => {
    logger.info('Shutdown signal received. Cleaning up...');
    await server.unwatch();
  }); // e.g., Process kill

  // Only start sending events when all plugins are ready. Plugins are likely independent of each other.
  // But having logs all over the place is bad.
  await server.watch();

  logger.info('SquadTS fully started.');

  return server;
}
