import { SquadServer } from './squad-server';
import { Rcon } from './rcon/rcon';
import { useLogger, useSubLogger } from './logger/use-logger';
import { useConfig } from './config/use-config';
import { useRconSquad } from './rcon-squad/use-rcon-squad';

const isDev = process.env.NODE_ENV !== 'production';

async function main() {
  const logger = useLogger();
  const config = await useConfig(logger);
  const { squadServerLogger, rconLogger } = useSubLogger(logger, config.logger.verboseness);
  const rcon = new Rcon(config.rcon, rconLogger);
  const squadRcon = useRconSquad(rcon);

  logger.info('Creating SquadServer...');
  const server = new SquadServer(squadServerLogger, squadRcon);

  // todo:
  // - connectors
  // - plugins
  // - log parsing

  await server.watch();
}

main();
