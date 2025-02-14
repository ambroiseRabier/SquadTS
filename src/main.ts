import { useLogger, useSubLogger } from './logger/use-logger';
import { useConfig } from './config/use-config';
import { Rcon } from './rcon/rcon';
import { RconSquad, useRconSquad } from './rcon-squad/use-rcon-squad';
import { LogReader, useLogReader } from './log-parser/use-log-reader';
import { useLogParser } from './log-parser/use-log-parser';
import { useAdminList } from './admin-list/use-admin-list';
import { retrieveGithubInfo } from './github-info/use-retrieve-github-info';
import path from 'node:path';
import { useCachedGameStatus } from './cached-game-status/use-cached-game-status';
import { useSquadServer } from './squad-server';
import { useDiscordConnector } from './connectors/use-discord.connector';
import { usePluginLoader } from './plugin-loader/plugin-loader';

interface Props {
  /**
   * You may replace log reader and rcon by your own for testing.
   */
  mocks: {
    logReader: LogReader;
    rconSquad: RconSquad;
  }
}

// todo, maybe use some kind or DI, why not place logParser inside squadServer ?

export async function main(props?: Props) {
  const logger = useLogger();
  logger.info('Starting SquadTS');
  const {valid, config} = await useConfig(logger);

  if (valid) {
    logger.info('Configuration validated.');
  } else {
    logger.fatal('Invalid configuration, check above for errors.');
    return;
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
    githubInfoLogger
  } = useSubLogger(logger, config.logger.verboseness);
  const rconSquad = props?.mocks.rconSquad ?? useRconSquad(rconSquadLogger, new Rcon(config.rcon, rconLogger), config.rconSquad);
  const logReader = props?.mocks.logReader ?? useLogReader(config.logParser, logReaderLogger);
  const logParser = useLogParser(logParserLogger, logReader, config.logParser, config.logger.debugLogMatching);

  // I need to connect to RCON early to get serverInfo and avoid having to deal with empty or undefined data in BehaviorSubject
  // inside cachedGameStatus...
  await rconSquad.connect();

  const adminList = useAdminList(adminListLogger, config.adminList);
  const serverInfo = await rconSquad.showServerInfo();
  const githubInfo = await retrieveGithubInfo( // todo use for....
    path.join(__dirname, '..', 'github-info-cache'),
    githubInfoLogger
  );
  const cachedGameStatus = useCachedGameStatus({
    rconSquad,
    logParser,
    config: config.cacheGameStatus,
    logParserConfig: config.logParser,
    logger: cachedGameStatusLogger,
    initialServerInfo: serverInfo,
  });
  const server = useSquadServer({
    logger: squadServerLogger,
    rconSquad,
    logParser,
    cachedGameStatus,
    adminList
  });
  const discordConnector = config.connectors.discord.enabled ?
    await useDiscordConnector(config.connectors.discord.token, logger).catch(error => {
      logger.error(`Discord connector failed to start: ${error?.message}`)
      return undefined;
    })
    : undefined;
  const pluginLoader = usePluginLoader(server, { discord: discordConnector }, pluginLoaderLogger, logger);

  // Do authentification on RCON and FTP/SFTP first before loading plugins
  await server.prepare();
  await pluginLoader.load();
  // Only start sending events when all plugins are ready. Plugins are likely independent of each other.
  // But having logs all over the place is bad.
  await server.watch();

  logger.info('SquadTS fully started.');
}
