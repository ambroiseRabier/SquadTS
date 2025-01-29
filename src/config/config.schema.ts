import { z } from 'zod';
import { rconOptionsSchema } from '../rcon/rcon.config';
import { loggerOptionsSchema } from '../logger/logger.config';
import { logParserSchema } from '../log-parser/log-parser.config';

export const optionsSchema = z.object({
  rcon: rconOptionsSchema,
  logger: loggerOptionsSchema,
  logParser: logParserSchema
});

export type Options = z.infer<typeof optionsSchema>;
