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

interface Props {
  /**
   * You may replace log reader and rcon by your own for testing.
   */
  mocks: {
    logReader: LogReader;
    rcon: Rcon;
    config: Options; // todo: again mixing config and options, choose :/
    pluginOptionOverride?: Record<string, any>;
    manualRCONUpdateForTest?: Subject<void>;
  };
}

// todo, maybe use some kind or DI, why not place logParser inside squadServer ?

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
    cachedGameStatusLogger,
    pluginLoaderLogger,
    adminListLogger,
    logReaderLogger,
    githubInfoLogger,
  } = useSubLogger(logger, config.logger.verboseness);
  const rcon = props?.mocks.rcon ?? new Rcon(config.rcon, rconLogger);
  const rconSquad = useRconSquad(rconSquadLogger, rcon, config.rconSquad);
  const logReader = props?.mocks.logReader ?? useLogReader(config.logParser, logReaderLogger);
  const logParser = useLogParser(
    logParserLogger,
    logReader,
    config.logParser,
    config.logger.debugLogMatching
  );

  // I need to connect to RCON early to get serverInfo and avoid having to deal with empty or undefined data in BehaviorSubject
  // inside cachedGameStatus...
  await rconSquad.connect();

  const adminList = useAdminList(adminListLogger, config.adminList);
  const serverInfo = await rconSquad.showServerInfo();
  // todo use for.... ? Wasn't there a plugin that needed that
  // map vote maybe ? -> just allow to end match is enough with game map vote.
  const githubInfo = await retrieveGithubInfo(
    path.join(dirname(fileURLToPath(import.meta.url)), '..', 'github-info-cache'),
    githubInfoLogger
  );
  const cachedGameStatus = useCachedGameStatus({
    rconSquad,
    logParser,
    config: config.cacheGameStatus,
    logParserConfig: config.logParser,
    logger: cachedGameStatusLogger,
    initialServerInfo: serverInfo,
    manualRCONUpdateForTest: props?.mocks.manualRCONUpdateForTest,
  });
  const server = useSquadServer({
    logger: squadServerLogger,
    rconSquad,
    logParser,
    cachedGameStatus,
    adminList,
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

  // Do authentification on RCON and FTP/SFTP first before loading plugins
  await server.prepare();
  await pluginLoader.load(props?.mocks.pluginOptionOverride);
  // Only start sending events when all plugins are ready. Plugins are likely independent of each other.
  // But having logs all over the place is bad.
  await server.watch();

  logger.info('SquadTS fully started.');

  return server;
}
