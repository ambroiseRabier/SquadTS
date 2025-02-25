import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  enabledInSeed: z
    .boolean()
    .default(false)
    .describe('Enable this plugin in seed (not recommended).'),
  playerThreshold: z
    .number()
    .min(1)
    .default(94)
    .describe(
      'How many players are required for kicks to be enabled. Going bellow threshold will stop any timeout.'
    ),
  unassignedTimeout: z
    .number()
    .min(30)
    .default(5 * 60 + 10)
    .describe('How many seconds to wait before kicking the player'),
  warnMessageInterval: z
    .number()
    .min(5)
    .default(60)
    .describe('How many seconds to wait before sending the warning message to the player.'),
  warnMessage: z
    .string()
    .nonempty()
    .default('Please join a squad or you will be kicked in %remainingTime%.')
    .describe(
      'Message to send to the player when warned.\n' +
        'Variable: %remainingTime% (e.g., "30 seconds")'
    ),
  kickMessage: z
    .string()
    .nonempty()
    .default('You have been kicked for not being assigned to a squad since %unassignedTimeout%.')
    .describe(
      'Message to send to the player when kicked.\n' +
        'Variable: %unassignedTimeout% (e.g., "5 minutes")'
    ),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z
  .discriminatedUnion('enabled', [enabledSchema, disabledSchema])
  .describe(
    'Auto kick players unassigned to a squad after a chosen duration. This allows you to remove afk players and motivate new players to join a squad.'
  );

export type AutoKickUnassignedOptions = z.infer<typeof enabledSchema>;

export default schema;
