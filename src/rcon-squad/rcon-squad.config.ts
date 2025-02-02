import { z } from 'zod';

export const rconSquadConfigSchema = z.object({
  updateInterval: z.number().min(1).default(5).describe('Interval in seconds between each update of RCON provided data.'),
})

export type RconSquadConfig = z.infer<typeof rconSquadConfigSchema>;


