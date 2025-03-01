import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  seedDuration: z
    .number()
    .int()
    .min(1)
    .default(7)
    .describe('Hours of seeding required to get a whitelist'),
  whiteListDuration: z.number().int().min(1).default(14).describe('Days the whitelist will last'),
  thanksMessageDelay: z
    .number()
    .int()
    .min(0)
    .default(15)
    .describe(
      'Delay in seconds before sending the welcome thanks message\n' +
        'Consider a small delay to avoid the message being missed by the player.'
    ),
  seedProgressionMessageInterval: z
    .number()
    .int()
    .min(5)
    .default(30)
    .describe('Interval in minutes between each progression message'),
  thanksMessage: z
    .string()
    .nonempty()
    .default(
      'Thank you for helping seed the server! After %whiteListDuration% days of seeding, you will get a %whiteListDuration% days whitelist. Current progress: %percent%%'
    )
    .describe(
      'Message sent to players when they join seed. Available variables: %whiteListDuration%, %percent%'
    ),
  seedProgressionMessage: z
    .string()
    .nonempty()
    .default('Current seeding progress: %percent%%')
    .describe('Message sent to players periodically. Available variables: %percent%'),
  seedRewardMessage: z
    .string()
    .nonempty()
    .default('You have been whitelisted for %whiteListDuration% days!')
    .describe(
      'Message sent to players when they get whitelisted. Available variables: %whiteListDuration%'
    ),
  seedRewardBroadcastMessage: z
    .string()
    .nonempty()
    .default(
      '%playerName% has been whitelisted for %whiteListDuration% days for helping seed the server!'
    )
    .describe(
      'Message broadcast when a player gets whitelisted. Available variables: %playerName%, %whiteListDuration%'
    ),
  sqliteDatabasePath: z
    .string()
    .nonempty()
    .refine(path => path.match(/.+\.db$/), 'Path must end with a filename that ends with .db')
    .default('./saved/seed-reward.db')
    .describe(
      'Path to the sqlite database file, absolute or relative to the server root.\n' +
        'If you use multiple instance of SquadTS for multiples servers, you can share\n' +
        'the same database to share seeding rewards.'
    ),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z
  .discriminatedUnion('enabled', [enabledSchema, disabledSchema])
  .describe(
    'Reward players with temporary whitelist for helping seed the server.\n' +
      '\n' +
      'Details on how it works:\n' +
      'The player accumulate "hours of seeding" as a currency, these are then spent automatically to obtain a whitelist.\n' +
      'Whitelist are not cumulative, example:\n' +
      'John get whitelisted the 2 feb 2025 for 7days. But John keep helping the server and obtain another reward the 4 feb 2025,\n' +
      'whitelist will end the 11 feb 2025. Not the 16 feb 2025.\n' +
      '\n' +
      'The point of that system, is to avoid a player staying 24/24 7/7 in the seed obtaining a one year whitelist that may not be fulfilled.'
  );

export type SeedRewardOptions = z.infer<typeof enabledSchema>;

export default schema;
