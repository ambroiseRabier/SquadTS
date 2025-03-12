/**
 * Generate plugins file based on a template for a quick start.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import testfileTemplate from './generate-plugin/testfile.template';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

async function generatePlugin(pluginName: string) {
  const kebabName = toKebabCase(pluginName);
  const pascalName = toPascalCase(pluginName);
  const camelName = toCamelCase(pluginName);

  const pluginDir = path.join(__dirname, '..', 'plugins', kebabName);
  const configDir = path.join(__dirname, '..', 'config', 'plugins');

  // Create directory
  await fs.mkdir(pluginDir, { recursive: true });

  // Generate main plugin file
  const mainPlugin = `import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { ${pascalName}Options } from './${kebabName}.config';
import { filter } from 'rxjs';

const ${camelName}: SquadTSPlugin<${pascalName}Options> = async (
  server,
  connectors,
  logger,
  options
) => {

  // 📝 React to game events
  server.events.playerWounded.subscribe(async data => {
    logger.info(\`Player \${data.victim.name} was wounded\`);
  });
  
  // 📝 React to chat events
  server.chatEvents.command.pipe(
    filter(data => data.command === options.command)
  ).subscribe(async data => {
    await server.rcon.warn(data.player.eosID, 'Hello world!');
  });
  
  // 💡 Explore the server object, everything is typed and documented.

  return async () => {
    // 📝 Cleanup code here
    // 👀 You don't have to worry about unsubscribing, it will be done automatically when SquadTS stops.
    // 👀 You should, however, clean up any external resources you created. (?:database connection, websockets, etc)
  };
};

export default ${camelName};
`;

  // Generate config file
  const configFile = `import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

// 👀 A default json5 config file will be generated at "/config/plugins/${kebabName}.json5"
// 👀 Call \`npm run generate-config\` to regenerate it when you modify the schema below.
const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  // 👀 Add your plugin-specific config options here, 📝 for example:
  command: z.string().default('!hello').describe('Call to test chat events and rcon')
});

// ⛔ Leave this intact.
const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

// ⛔ Using a discriminated union allows us to ignore options validation when plugin is disabled.
const schema = z.discriminatedUnion('enabled', [
  enabledSchema,
  disabledSchema,
]).describe(
  // 👀 Plugin description goes here.
  'Plugin description here'
);

// ⛔ Export type of enabled schema, not the union.
export type ${pascalName}Options = z.infer<typeof enabledSchema>;

// ⛔ Default export is used for validation
export default schema;
`;

  // Generate test file
  const testFile = testfileTemplate(pascalName, kebabName);

  // Generate config example file
  const configExample = `/**
 * Plugin description here
 */
{
  enabled: false,
  // Available levels: trace, debug, info, warn, error, fatal.
  // To disable a logger, set it to silent.
  loggerVerbosity: 'info',
  // Call to test chat events and rcon
  command: '!hello'
}
`;

  // Write files
  await fs.writeFile(path.join(pluginDir, `${kebabName}.ts`), mainPlugin);
  await fs.writeFile(path.join(pluginDir, `${kebabName}.config.ts`), configFile);
  await fs.writeFile(path.join(pluginDir, `${kebabName}.test.ts`), testFile);
  await fs.writeFile(path.join(configDir, `${kebabName}.json5`), configExample);

  console.log(`Generated plugin ${kebabName} in ${pluginDir}`);
}

// Allow running from command line
if (process.argv[2]) {
  generatePlugin(process.argv[2]).catch(console.error);
} else {
  console.error('Please provide a plugin name');
  process.exit(1);
}
