// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';
import { RCONCommand } from '../../src/rcon-squad/rcon-commands';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  channelID: z.string().nonempty(),
  prependAdminNameInBroadcast: z
    .boolean()
    .default(false)
    .describe('Prepend admin names when making announcements.'),
  roleToCommands: z
    .record(
      z.string().nonempty(),
      z.array(z.enum(Object.values(RCONCommand) as [string, ...string[]])).nonempty()
    )
    .transform(obj => new Map(Object.entries(obj)))
    .describe(
      'Do not confuse with Admins.cfg permissions, this do not used Admins.cfg permissions. \n' +
        'Dictionary of role to list of the commands they are allowed to use.\n' +
        'If dictionary is empty (`{}`) all commands are allowed !\n' +
        'Example `{ \n' +
        "  '123456789123456789': ['AdminBroadcast', 'AdminForceTeamChange', 'AdminDemoteCommander'], \n" +
        "  '111111111111111111': ['AdminBroadcast'], \n" +
        '}` \n' +
        `Available commands: ${Object.values(RCONCommand).join(', ')}`
    ),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z
  .discriminatedUnion('enabled', [enabledSchema, disabledSchema])
  .describe('Execute a RCON command from your discord chat.');

export type DiscordSquadRconOptions = z.infer<typeof enabledSchema>;

export default schema;
