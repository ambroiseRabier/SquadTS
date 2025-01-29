import { z } from 'zod';


export const cachedGameStatusOptionsSchema = z.object({
  playersUpdateDelay: z.number().min(1).default(30)
    .describe('Interval in seconds between each players list update.'),
});

export type CachedGameStatusOptions = z.infer<typeof cachedGameStatusOptionsSchema>;
