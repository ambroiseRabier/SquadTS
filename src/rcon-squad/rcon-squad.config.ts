import { z } from 'zod';

export const rconSquadOptionsSchema = z.object({
  dryRun: z
    .boolean()
    .default(false)
    .describe("If true, no RCON command THAT IMPACT THE GAME (like warn or kick) will be sent to the server. \n" +
      "Any data gathering like getting server info or player list will work.\n" +
      "You may use that to test out your RCON plugin without actually impacting the game."),
})

export type RconSquadConfig = z.infer<typeof rconSquadOptionsSchema>;


