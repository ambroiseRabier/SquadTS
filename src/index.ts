import { useSquadServer } from './squad-server';
import { Rcon } from './rcon/rcon';
import { useLogger, useSubLogger } from './logger/use-logger';
import { useConfig } from './config/use-config';
import { useRconSquad } from './rcon-squad/use-rcon-squad';
import { useLogParser } from './log-parser/use-log-parser';
import { useLogReader } from './log-parser/use-log-reader';
import { useCachedGameStatus } from './cached-game-status/use-cached-game-status';
import { usePluginLoader } from './plugin-loader/plugin-loader';
import { useDiscordConnector } from './connectors/use-discord.connector';
import { useAdminList } from './admin-list/use-admin-list';
import { retrieveGithubInfo } from './github-info/use-retrieve-github-info';
import path from 'node:path';


// todo, may use some kind or DI, why not place logParser inside squadServer ?
// because: logParser is being sent to server, now, useSquadServer can easily be tested
// with logParser being mocked.
async function main() {
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
  const rcon = new Rcon(config.rcon, rconLogger);
  const rconSquad = useRconSquad(rconSquadLogger, rcon, config.rconSquad);
  const logReader = useLogReader(config.logParser, logReaderLogger);
  const logParser = useLogParser(logParserLogger, logReader, config.logParser, config.logger.debugLogMatching);

  // I need to connect to RCON early to get serverInfo and avoid having to deal with empty or undefined data in BehaviorSubject
  // inside cachedGameStatus...
  await rconSquad.connect();

  const adminList = useAdminList(adminListLogger, config.adminList);
  const serverInfo = await rconSquad.showServerInfo();
  const githubInfo = await retrieveGithubInfo(
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

main();
