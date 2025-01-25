import { z } from 'zod';

const ipRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

export const rconOptionsSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .regex(ipRegex, "Invalid IPv4")
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
});

export type RconOptions = z.infer<typeof rconOptionsSchema>;
