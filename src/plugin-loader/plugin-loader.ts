import path, { basename } from 'node:path';
import { Logger } from 'pino';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { SquadServer } from '../squad-server';
import chalk from 'chalk';
import { PluginBaseOptions } from './plugin-base.config';
import { SquadTSPlugin } from './plugin.interface';
import fs from 'fs/promises';
import JSON5 from 'json5';
import { ZodObject } from 'zod';
import { generateJson5Commented } from '../../scripts/generate-config/generate-json5-commented';
import { DiscordConnector } from '../connectors/use-discord.connector';


export function usePluginLoader(server: SquadServer, connectors: {discord?: DiscordConnector}, logger: Logger) {

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
        logger.info(`Loading config for ${pair.name}.`);

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

        if (parseConfig.requireConnectors.includes('discord') && !connectors.discord) {
          logger.error(`Skipping ${pair.name} plugin. Discord connector has not been enabled in connectors config, or check above for errors related to Discord (like an invalid token).`)
          continue;
        }

        // Note, we don't want to run them in parallel, it would be hard to debug from the console
        // if logs are mixed between plugins.
        await pair.plugin.default(
          server,
          // this typing is correct, as long as the plugin correctly fill requireConnectors field...
          connectors as Required<typeof connectors>,
          logger.child({}, {
            msgPrefix: chalk.magentaBright(`[${pair.name}] `),
            level: parseConfig.loggerVerbosity
          }),
          parseConfig
        ).catch(error => {
          // A failing plugin should not stop SquadTS completely.
          logger.error(`Failed to start plugin ${pair.name}. Error: ${error.message}\n${error.stack}`, error);
        });
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

/**
 * Finds files with a specific extension inside subfolders of a given directory.
 * @param directory Path to the base directory.
 * @param extension File extension to filter for (e.g., ".ts").
 * @returns Array of file paths matching the extension.
 */
function findFilesInSubfolders(directory: string, extension: string): string[] {
  const subfolders = readdirSync(directory).filter(subfolder => {
    const subfolderPath = path.join(directory, subfolder);
    return statSync(subfolderPath).isDirectory(); // Only include directories
  });

  const files: string[] = [];
  subfolders.forEach(subfolder => {
    const subfolderPath = path.join(directory, subfolder);
    const filteredFiles = readdirSync(subfolderPath)
      .filter(file => file.endsWith(extension)) // Only include files with the desired extension
      .map(file => path.join(subfolder, file)); // Maintain relative paths
    files.push(...filteredFiles);
  });

  return files;
}

/**
 * Finds files whose names (without extensions) match their parent directory name.
 * e.g "C:/.../auto-tk-warn/auto-tk-warn.ts" match "auto-tk-warn.ts"
 * @param fileList List of file paths to process.
 * @returns Array of matching file paths.
 */
function findFilesMatchingParentDirectory(fileList: string[]): string[] {
  return fileList.filter(filePath => {
    const fileName = path.basename(filePath, path.extname(filePath)); // File name without extension
    const parentDir = path.basename(path.dirname(filePath)); // Name of the parent directory
    return fileName === parentDir; // Check if file name matches parent directory name
  });
}

async function loadPlugins(logger: Logger) {
  // Note that plugins dir has been added to tsconfig, if the directory ever become dynamic, we are gonna need
  // ts-node at runtime.
  const pluginsDirectory = path.join(__dirname, '..', '..', 'plugins');
  // Instead of putting every file inside plugins, better having a folder for each plugin since we require 3 files per plugin !
  // const pluginFiles = readdirSync(pluginsDirectory).filter(file => file.endsWith('.ts'));
  const allTSFiles = findFilesInSubfolders(pluginsDirectory, '.ts');
  const pluginMainFiles = findFilesMatchingParentDirectory(allTSFiles);

  const pluginPairs: {
    name: string;
    plugin: { default: SquadTSPlugin<PluginBaseOptions> };
    configSchema: { default: ZodObject<any> };
    configJSON5FileName: string;
    configJSON5FilePath: string;
  }[] = [];

  for (const file of pluginMainFiles) {
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

    if (!allTSFiles.includes(configSchemaFileName)) {
      logger.error(`configSchema file for "${file}" not found. Skipping this plugin.`);
      continue;
    }

    let plugin, configSchema;

    try {
      logger.info(`Importing TS file: ${file}`);
      // register("ts-node/esm", pathToFileURL(pluginPath))
      // plugin = await import(pathToFileURL(pluginPath).href); // .replace(/\\/g, '/')
      plugin = require(pluginPath); // .replace(/\\/g, '/')
    } catch (e: any) {
      logger.error(`Failed to import plugin files: ${file}. Error: ${e.message}`, e);
      continue;
    }

    try {
      logger.info(`Importing TS file: ${configSchemaFileName}`);
      // register("ts-node/esm", pathToFileURL(configSchemaPath))
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

    if (typeof configSchema.default !== 'object' || !['ZodObject', 'ZodDiscriminatedUnion'].includes(configSchema.default.constructor.name)) {
      logger.error(`Config schema ${configSchemaFileName} should have a ZodObject (\`z.object({})\`) as default export. Got ${typeof configSchema.default} and ${configSchema.default.constructor.name}.`);
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
