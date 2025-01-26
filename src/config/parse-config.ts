import { z } from 'zod';
import { loggerOptionsSchema } from '../logger/logger.config';
import { rconOptionsSchema } from '../rcon/rcon.config';
import { logParserSchema } from '../log-parser/log-parser.config';

export const optionsSchema = z.object({
  rcon: rconOptionsSchema,
  logger: loggerOptionsSchema,
  logParser: logParserSchema
});

export type Options = z.infer<typeof optionsSchema>;

export async function parseConfig(configData: any): Promise<Options> {
  const parsedOpt = await optionsSchema.safeParseAsync(configData);

  if (!parsedOpt.success) {
    const errorMessages = parsedOpt.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    // todo: not sure, use or not ?
    // logger.error(`Invalid RCON options:\n${errorMessages}`);

    throw new Error(`Invalid RCON options:\n${errorMessages}`); // todo: propagate options error and watch file ?
  } else {
    return parsedOpt.data;
  }
}
