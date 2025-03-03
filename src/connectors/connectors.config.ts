import { z } from 'zod';

const discordTokenRegex = /^[a-zA-Z0-9_\-]{24,}\.[a-zA-Z0-9_\-]{6,}\.[a-zA-Z0-9_\-]{27,}$/;

export const connectorsOptionsSchema = z
  .object({
    discord: z.discriminatedUnion('enabled', [
      // First element should be the one with enabled false as we want this one as default.
      z.object({
        enabled: z.literal(false),
        // we could skip the field here, but we specify it for the default config generation.
        token: z
          .string()
          .optional()
          .refine(token => token && token.match(discordTokenRegex), 'It appears you are not using a Discord bot token.')
          .describe(
            'Discord bot token. Do not confuse with public key.\n' +
            'You can reset the token:\n' +
            '1. Go to https://discord.com/developers/applications\n' +
            '2. Select your bot.\n' +
            '3. Click on the bot menu and click on "Reset Token".\n' +
            '4. Copy the new token.'
          ),
      }),
      z.object({
        enabled: z.literal(true),
        token: z
          .string()
          .nonempty('Token is required. To disable discord connector, set enabled to false.'),
      }),
    ]),
  })
  .describe('Connectors configuration.\nSome plugins require some connector to be enabled.');
