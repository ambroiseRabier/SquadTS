import path, { basename, resolve } from 'node:path';
import { optionsSchema } from '../config/config.schema';
import { Logger } from 'pino';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { SquadServer } from '../squad-server';
import chalk from 'chalk';
import { PluginBaseOptions } from './plugin-base.config';
import { SquadTSPlugin } from './plugin.interface';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { ZodObject } from 'zod';
import { generateJson5Commented } from '../../scripts/generate-config/generate-json5-commented';
import { pathToFileURL } from 'node:url';
import { register } from 'node:module';


export function usePluginLoader(server: SquadServer, logger: Logger) {

  return {
    load: async () => {
      logger.info('Loading plugins...');
      const pluginsPair = await loadPlugins(logger);

      // Inform there is no plugins loaded if user put them in wrong folder
      logger.info(`${pluginsPair.length} plugins discovered and imported.`);

      // ---------- Check missing json5 file ----------
      const missingConfigPairs = pluginsPair.filter(pair => !existsSync(pair.configJSON5FilePath));
      const validConfigPairs = pluginsPair.filter(pair => existsSync(pair.configJSON5FilePath));
      for (let pair of missingConfigPairs) {
        logger.warn(`Missing json5 config file for ${pair.name}. It will be created from the schema.`);
        try {
          const json5Commented = generateJson5Commented(pair.configSchema.default);
          writeFileSync(pair.configJSON5FilePath, json5Commented, 'utf8');
          logger.info(`Creating config file: ${pair.configJSON5FilePath}`);
        } catch (e: any) {
          logger.error(`Failed to create config file: ${pair.configJSON5FilePath}. Please create it yourself. Error: ${e.message}`, e);
        }
        // todo: create config from schema...
      }

      if (missingConfigPairs.length > 0) {
        logger.error(
          `Missing config files have been created, PLEASE CHECK THEM BEFORE restarting SquadTS to enabled theses plugins without any errors.`
        );
      }

      // ---------- Loading JSON5 and validating ----------
      for (let pair of validConfigPairs) {
        logger.info(`Loading config for ${pair.name} (${pair.configJSON5FilePath}).`);

        let json5;
        try {
          json5 = await loadJSON5(pair.configJSON5FilePath);
        } catch (e: any) {
          logger.error(`Invalid JSON5 file, unabled to parse. ${e.message}`, e);
          logger.warn(`Skipping ${pair.name} plugin. Please make sure you have a valid JSON5 file (consider using IDE like VSCode or Webstorm to edit these files)`);
          continue;
        }

        logger.info(`Validating config for ${pair.name}...`);
        const parsed = await pair.configSchema.default.safeParseAsync(json5);

        if (!parsed.success) {
          const errorMessages = parsed.error.issues.map(
            (issue) => `- ${issue.path.join('.')}: ${issue.message}`
          ).join('\n');

          logger.error(errorMessages);
          logger.warn(`Skipping ${pair.name} plugin. The config is invalid. Please check above error messages.`)
          continue;
        }

        const parseConfig = parsed.data as PluginBaseOptions;

        logger.info(`Starting plugin ${pair.name}.`);

        pair.plugin.default(
          server,
          logger.child({}, {
            msgPrefix: chalk.magentaBright(`[${pair.name}] `),
            level: parseConfig.loggerVerbosity
          }),
          parseConfig
        );
      }
    }
  };
}

async function loadJSON5(filePath: string) {
  try {
    // Read the raw content of the file
    const rawContent = await fs.readFile(filePath, 'utf8');

    // Parse the JSON5 content
    return JSON5.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to load or parse file: ${filePath}. Error: ${(err as Error).message}`);
  }
}

async function loadPlugins(logger: Logger) {
  // Note that plugins dir has been added to tsconfig, if the directory ever become dynamic, we are gonna need
  // ts-node at runtime.
  const pluginsDirectory = path.join(__dirname, '..', '..', 'plugins');
  const pluginFiles = readdirSync(pluginsDirectory).filter(file => file.endsWith('.ts'));

  const pluginPairs: {
    name: string;
    plugin: { default: SquadTSPlugin<PluginBaseOptions> };
    configSchema: { default: ZodObject<any> };
    configJSON5FileName: string;
    configJSON5FilePath: string;
  }[] = [];

  for (const file of pluginFiles) {
    // Skip config files initially
    if (file.endsWith('.config.ts')) {
      continue
    }

    const configSchemaFileName = file.replace('.ts', '.config.ts');
    const configJSON5FileName = file.replace('.ts', '.json5');
    const pluginPath = path.join(pluginsDirectory, file);
    const configSchemaPath = path.join(pluginsDirectory, configSchemaFileName);

    // Inform which plugin have been seen and will be loaded.
    logger.info(`Plugin discovered: ${file} (${pluginPath})`);

    if (!pluginFiles.includes(configSchemaFileName)) {
      logger.error(`configSchema file for "${file}" not found. Skipping this plugin.`);
      continue;
    }

    logger.info(`Importing plugin files: ${file} and ${configSchemaFileName}`);

    // todo: ok on linux ? and mac ?
    let plugin, configSchema;

    try {
      register("ts-node/esm", pathToFileURL(pluginPath))
      // plugin = await import(pathToFileURL(pluginPath).href); // .replace(/\\/g, '/')
      plugin = require(pluginPath); // .replace(/\\/g, '/')
    } catch (e: any) {
      logger.error(`Failed to import plugin files: ${file}. Error: ${e.message}`, e);
      continue;
    }

    try {
      register("ts-node/esm", pathToFileURL(configSchemaPath))
      // configSchema = await import(pathToFileURL(configSchemaPath).href);
      configSchema = require(configSchemaPath);
    } catch (e: any) {
      logger.error(`Failed to import plugin files: ${configSchemaFileName}. Error: ${e.message}`, e);
      continue;
    }

    if (typeof plugin.default !== 'function') {
      logger.error(`Plugin ${file} should have a function as default export. Got ${typeof plugin.default}. (${pluginPath}).`);
      continue;
    }

    // We could probably also support zod discriminate union, maybe a search for Zod in constructor would be enough ?
    if (typeof configSchema.default !== 'object' || configSchema.default.constructor.name !== 'ZodObject') {
      logger.error(`Config schema ${configSchemaFileName} should have a ZodObject (\`z.object({})\`) as default export. Got ${typeof plugin.default} and ${plugin.default.constructor.name}. (${pluginPath}).`);
      continue;
    }

    pluginPairs.push({
      name: basename(file, '.ts'),
      plugin,
      configSchema,
      configJSON5FileName,
      configJSON5FilePath: path.join(pluginsDirectory, configJSON5FileName),
    });
  }

  return pluginPairs;
}
