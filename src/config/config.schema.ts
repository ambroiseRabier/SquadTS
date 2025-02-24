import { z } from 'zod';
import { rconOptionsSchema } from '../rcon/rcon.config';
import { loggerOptionsSchema } from '../logger/logger.config';
import { logParserOptionsSchema } from '../log-parser/log-parser.config';
import { cachedGameStatusOptionsSchema } from '../cached-game-status/use-cached-game-status.config';
import { rconSquadOptionsSchema } from '../rcon-squad/rcon-squad.config';
import { connectorsOptionsSchema } from '../connectors/connectors.config';

export const optionsSchema = z.object({
  rcon: rconOptionsSchema,
  logger: loggerOptionsSchema,
  logParser: logParserOptionsSchema,
  cacheGameStatus: cachedGameStatusOptionsSchema,
  rconSquad: rconSquadOptionsSchema, // todo: choisir entre options et config ...
  connectors: connectorsOptionsSchema,
});

export type Options = z.infer<typeof optionsSchema>;
