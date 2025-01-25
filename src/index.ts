import { SquadServer } from './squad-server';
import { pino } from 'pino';
import pretty from 'pino-pretty';
import { Rcon } from './rcon/rcon';
import { RconSquad } from './rcon-squad/rcon-squad';
import chalk from 'chalk';
import { loadConfigFiles } from './config/load-config';
import { resolveConfigsPath } from './config/resolve-configs-path';
import { parseConfig } from './config/parse-config';


// inversifyJS ?
async function main() {
  const isDev = process.env.NODE_ENV !== 'production';
  // Pino will show pretty logs only in dev as per their recommendation.
  const prettyStream = pretty({
    colorize: true,
    sync: process.env.NODE_ENV === 'test'
  });
  const logger = pino({
    level: isDev ? 'debug': 'info',
    ...(isDev ? {
      base: null,  // Remove processID and hostname
    } : {}),
    // formatters:,
  }, isDev ? prettyStream : undefined);


  const configFolder = resolveConfigsPath();
  logger.info(`Loading configurations from ${configFolder}`);
  const configs = await loadConfigFiles(configFolder);
  logger.info('Configurations loaded.');
  logger.trace(configs);

  const parsedConfig = await parseConfig(configs);

  // too no-op it: use config: level: 'silent'
  const rconLogger = logger.child({}, {
    msgPrefix: chalk.cyanBright('[RCON] '),
  });

  const rcon = new Rcon(parsedConfig.rcon, rconLogger);
  const squadRcon = new RconSquad(rcon, logger);

  const squadServerLogger = logger.child({}, {
    msgPrefix: chalk.yellowBright('[SquadServer] '),
  });

  logger.info('Creating SquadServer...');

  const server = new SquadServer(squadServerLogger, squadRcon);


  await server.watch();
}

main();
