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
  proxy: z.object({ // todo discriminatedunion ...
    enabled: z.boolean().default(false),
    port: z.number().int().positive().default(21115).describe('The port to use for SquadJS proxy. Can be anything you want.'),
    password: z.string().nonempty().min(12)
      .describe('The password to use for SquadJS proxy. It can be different from the RCON password used by SquadTS.'),
  }).describe(
    'Proxy to use for SquadJS, host will likely be localhost or 127.0.0.1. If using docker container, use the container name instead of localhost.\n' +
    'Ask yourself a simple question: "Where I am running Squad TS?"'
  ),
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;
