import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  mustContain: z
    .array(z.string())
    .nonempty()
    .describe(
      'Squad name must contain at least one these words, case-insensitive. e.g. ["INF", "MBT", "TANK", "SPEC OPS"]\n' +
        'Note that if you do not add "Squad 1, Squad 2, ..." to this list, it will not be considered a valid name.\n' +
        'But if you want names like "Squad 1" to be valid, you shouldn\'t be using this plugin in the first place.'
    ),
  enableDisband: z
    .boolean()
    .default(true)
    .describe(
      "You may wait to disable disband, if you haven't finished configuring proper rules yet.\n" +
        'Also note that if you enable this plugin mid-game, it will instantly disband all squad with invalid names.\n' +
        'You should have this plugin enabled this the beginning of the game.'
    ),
  warnMessage: z
    .string()
    .default(
      'Squad name is invalid. Please read the rules!\n\n It must contains one of these tags: %mustContain%'
    )
    .describe('Message to send to the squad creator.'),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z
  .discriminatedUnion('enabled', [enabledSchema, disabledSchema])
  .describe(
    'Given certains rules, will warn SL and disband squad which have an invalid name.\n' +
      'If you have more complex rules, I recommend you use either battlemetric or a custom plugin based on this one.'
  );

export type SquadNameValidatorOptions = z.infer<typeof enabledSchema>;

export default schema;
