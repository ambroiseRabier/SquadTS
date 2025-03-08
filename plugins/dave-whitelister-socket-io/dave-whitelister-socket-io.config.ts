import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  securityToken: z.string().nonempty().describe('Your secret token/password for connecting.'),
  websocketPort: z.number().int().min(1).max(65535).default(3000).describe('The port to listen on.'),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z.discriminatedUnion('enabled', [
  enabledSchema,
  disabledSchema,
]).describe(
  'Socket.io server for https://github.com/fantinodavide/Squad_Whitelister\n' +
  'Get help on Discord: https://discord.gg/9F2Ng5C\n' +
  '\n' +
  'Squad_Whitelister installation:\n' +
  'You need to download the release from https://github.com/fantinodavide/Squad_Whitelister/releases\n' +
  'On first run, it creates a config file, in which you will have to fill the securityToken.\n' +
  'You may leave websocketPort to default value.\n' +
  'After updating the config file generated by the whitelister, restart it.\n' +
  '\n' +
  'Access the whitelister on his default port: http://localhost:9090/ (if run locally)\n' +
  '\n' +
  'Note: Make sure SquadTS plugin is started before starting the whitelister.'
);

export type DaveWhitelisterSocketIoOptions = z.infer<typeof enabledSchema>;

export default schema;
