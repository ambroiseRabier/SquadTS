import path, {resolve} from 'node:path';
import { optionsSchema } from '../config/config.schema';
import { Logger } from 'pino';
import { readdirSync } from 'node:fs';
import { SquadServer } from '../squad-server';
import chalk from 'chalk';



export function usePluginLoader(server: SquadServer, logger: Logger) {
  // Any reason to support custom paths ?
  const pluginsPath = path.join(__dirname, '..', 'plugins');

  async function validate(options: any, pluginName: string)  {
    const parsed = await optionsSchema.safeParseAsync(options);

    if (parsed.success) {
      return {
        valid: true,
      }
    } else {
      const errorMessages = parsed.error.issues.map(
        (issue) => `- ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');

      logger.error(`${pluginName} plugin is misconfigured:\n ${errorMessages}`);

      return {
        valid: false,
        message: errorMessages
      }
    }
  }

  return {
    load: async () => {
      logger.info('Loading plugins...');
      const plugins = await loadPlugins('../plugins', logger);

      // Inform there is no plugins loaded if user put them in wrong folder
      logger.info(`${plugins.length} plugins discovered.`);

      for (let plugin of plugins) {
        plugin.default(server, logger.child({}, {
          msgPrefix: chalk.yellowBright('[SquadServer] '),
          level: verboseness.SquadServer // plugin choice
        }));
      }
    }
  };
}

async function loadPlugins(folderPath: string, logger: Logger) {
  const pluginsDirectory = resolve(__dirname, folderPath);
  const pluginFiles = readdirSync(pluginsDirectory).filter(file => file.endsWith('.ts'));

  const plugins = [];
  for (const file of pluginFiles) {
    const pluginPath = resolve(pluginsDirectory, file);
    const plugin = await import(pluginPath); // Dynamically import each plugin

    // Inform which plugin have been seen and will be loaded.
    logger.info(`Plugin discovered: ${file} (${pluginPath})`);

    if (typeof plugin.default === 'function') {
      plugins.push(plugin);
    } else {
      logger.error(`Plugin ${file} should have a function as default export. Got ${typeof plugin.default}. (${pluginPath}).`);
    }
  }

  return plugins;
}
