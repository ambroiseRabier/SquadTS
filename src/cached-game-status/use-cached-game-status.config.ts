import { z } from 'zod';

export const cachedGameStatusOptionsSchema = z.object({
  updateInterval: z
    .object({
      playersAndSquads: z.number().min(1).default(5).describe('--> about players and squads.'),
      layerInfo: z.number().min(1).default(60).describe('--> about layer info.'), // todo à confirmer, mais je pense que serveInfo done layers. (enlever donc?)
      serverInfo: z.number().min(1).default(30).describe('--> about server info.'),
    })
    .describe(
      'Interval in seconds between each update of RCON provided data.\n' +
        'May impact how fast some plugins react to changes.\n' +
        'May also impact performances (not measured yet, might be negligible).'
    ),
});

export type CachedGameStatusOptions = z.infer<typeof cachedGameStatusOptionsSchema>;
