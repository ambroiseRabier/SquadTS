import { SquadServer } from './squad-server';
import {pino} from 'pino';
import pretty from 'pino-pretty';
import { Rcon } from './rcon/rcon';
import { RconSquad } from './rcon/rcon-squad';
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
    level: isDev ? 'trace': 'info',
    ...(isDev ? {
      base: null,  // Remove processID and hostname
    } : {}),
    // formatters:,
  }, isDev ? prettyStream : undefined);

  const configs = await loadConfigFiles(resolveConfigsPath());
  logger.debug(configs, 'Loaded Configurations');

  const parsedConfig = await parseConfig(configs);

  const rcon = new Rcon(parsedConfig.rcon, logger);
  const squadRcon = new RconSquad(rcon, logger);

  const squadServerLogger = logger.child({}, {
    msgPrefix: chalk.blue('[SquadServer] '),
  });

  logger.info('Creating SquadServer...');

  const server = new SquadServer(squadServerLogger, squadRcon);

  // console.log(await squadRcon.getCurrentMap());
  // console.log(await squadRcon.getListPlayers());
  // console.log(await squadRcon.getSquads());

  await server.watch();
}

main();
