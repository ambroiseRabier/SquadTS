import { z } from 'zod';
import { ipv4Schema } from '../config/common-validators';

export const rconOptionsSchema = z.object({
  host: z.union([ipv4Schema, z.literal('localhost')]).describe('The IP of the server.'),
  port: z
    .number()
    .int()
    .positive('Port must be a positive integer')
    .default(21114)
    .describe('The RCON port of the server.'),
  password: z.string().describe('The RCON password of the server.'),
  debugCondenseLogs: z
    .boolean()
    .default(true)
    .describe(
      'If true, will not show ListPlayers / ListSquads / ShowServerInfo RCON response log (debug level) if theses have not changed.'
    ),
  debugCondenseLogsIgnoreSinceDisconnect: z
    .boolean()
    .default(true)
    .describe('If true, exclusive change in `Since Disconnect: 03m.14s` will not be displayed.'),
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;
