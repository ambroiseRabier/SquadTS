import { z } from 'zod';
import { ipv4Schema } from '../config/common-validators';

export const rconOptionsSchema = z.object({
  host: ipv4Schema
    .describe("The IP of the server."),
  port: z
    .number()
    .int()
    .positive("Port must be a positive integer")
    .default(21114)
    .describe("The RCON port of the server."),
  password: z
    .string()
    .describe("The RCON password of the server."),
  autoReconnectDelay: z
    .number()
    .nonnegative("AutoReconnectDelay must be a non-negative number")
    .min(1000, "AutoReconnectDelay minimum is 1000ms") // don't DOS yourself
    .default(5000),
  debugCondenseLogs: z
    .boolean()
    .default(true)
    .describe("If true, will not show ListPlayers / ListSquads / ShowServerInfo RCON response log (debug level) if theses have not changed.")
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;
