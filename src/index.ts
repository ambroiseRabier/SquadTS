import { useSquadServer } from './squad-server';
import { Rcon } from './rcon/rcon';
import { useLogger, useSubLogger } from './logger/use-logger';
import { useConfig } from './config/use-config';
import { useRconSquad } from './rcon-squad/use-rcon-squad';
import { useLogParser } from './log-parser/use-log-parser';

const isDev = process.env.NODE_ENV !== 'production';

// todo, may use some kind or DI, why not place logParser inside squadServer ?
// because: logParser is being sent to server, now, useSquadServer can easily be tested
// with logParser being mocked.
async function main() {
  const logger = useLogger();
  const config = await useConfig(logger);
  const { squadServerLogger, rconLogger, logParserLogger } = useSubLogger(logger, config.logger.verboseness);
  const rcon = new Rcon(config.rcon, rconLogger);
  const squadRcon = useRconSquad(rcon);
  // const logParser = useLogParser(logParserLogger, config.logParser, []);

  logger.info('Creating SquadServer...');
  // const server = useSquadServer(squadServerLogger, squadRcon, logParser, config);

  // todo:
  // - connectors
  // - plugins

  await server.watch();
}

main();
