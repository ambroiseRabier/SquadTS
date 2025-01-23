import { SquadServer } from './squad-server';
import {pino} from 'pino';
import pretty from 'pino-pretty';
import { Rcon } from './rcon';
import { RconSquad } from './rcon-squad';
import chalk from 'chalk';
import { loadConfigFiles } from './load-config';
import { resolveConfigsPath } from './get-config-path';
import { parseConfig } from './parse-config';
import { z } from 'zod';


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

  logger.info('SquadServerFactory', 1, 'Creating SquadServer...');

  const server = new SquadServer(squadServerLogger, squadRcon);

  // console.log(await squadRcon.getCurrentMap());
  // console.log(await squadRcon.getListPlayers());
  // console.log(await squadRcon.getSquads());

  await server.watch();
}

main();
