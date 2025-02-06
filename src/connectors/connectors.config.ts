import { z } from 'zod';


export const connectorsOptionsSchema = z.object({
  discord: z.discriminatedUnion("enabled", [
    // First element should be the one with enabled false as we want this one as default.
    z.object({
      enabled: z.literal(false),
      // we could skip the field here, but we specify it for the default config generation.
      token: z.string().optional()
    }),
    z.object({
      enabled: z.literal(true),
      token: z.string().nonempty("Token is required. To disable discord connector, set enabled to false.")
    }),
  ])
}).describe("Connectors configuration.\nSome plugins require some connector to be enabled.");
