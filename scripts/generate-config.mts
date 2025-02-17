import { optionsSchema } from '../src/config/config.schema';
import { z } from 'zod';
import { generateJson5Commented } from './generate-config/generate-json5-commented';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import chalk from 'chalk';
import { dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tsImport } from 'tsx/esm/api';

// You may skip asking user for pre-commit or CI/CD stuff.
const FORCE_OVERRIDE =
  process.argv.includes('--force') || process.argv.includes('-f');
const configFolder = path.join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'config'
);

// Best to ask user confirmation, we don't want someone unfamiliar with NPM to override his config !
const askUser = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
};

async function saveFiles() {
  let asked = false;
  let shouldOverride = false;
  for (const key in optionsSchema.shape) {
    const field = (optionsSchema as z.ZodObject<any>).shape[key];

    // Note: compared to plugins, we are not using dynamic import here, so Zod instance is the same.
    if (
      field instanceof z.ZodObject ||
      field instanceof z.ZodDiscriminatedUnion
    ) {
      // Define the file path
      const filePath = path.join(configFolder, `${key}.json5`);

      // Check if file exists
      if (fs.existsSync(filePath) && !FORCE_OVERRIDE) {
        // Ask user for permission to override, only once
        if (!shouldOverride && !asked) {
          asked = true;
          const emphasizedMessage =
            `An existing config file (${chalk.blue.bold(`${key}.json5`)}) has been found in the folder,` +
            ` do you want to ${chalk.red.bold('OVERRIDE ALL CONFIG FILES')} in the folder? (won't override plugin config) Type ${chalk.red.bold('"yes"')} to confirm: `;

          shouldOverride = await askUser(emphasizedMessage);
        }

        if (!shouldOverride) {
          console.log(`Skipping files...`);
          break;
        }
      }

      const json5Commented = generateJson5Commented(field);

      // Write the content to the file
      fs.writeFileSync(filePath, json5Commented, 'utf8');
      console.log(`File saved: ${chalk.blue.bold(filePath)}`);
    } else {
      throw new Error(
        `[Config generator] Unsupported ZOD field type (${(field as any).constructor.name}): ${JSON.stringify(field)}`
      );
    }
  }
}

async function savePluginFiles() {
  console.info(`Generating plugin files...`);

  const pluginsDir = path.join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    'plugins'
  ); // Assume 'plugins' is the root directory for plugins

  // Ensure the 'config/plugins' folder exists
  const configPluginsFolder = path.join(configFolder, 'plugins');
  if (!fs.existsSync(configPluginsFolder)) {
    console.info(`'config/plugins' folder not found, creating...`);
    fs.mkdirSync(configPluginsFolder, { recursive: true });
  }

  // Check if the plugins directory exists
  if (!fs.existsSync(pluginsDir)) {
    throw new Error(`Plugins directory does not exist: ${pluginsDir}`);
  }

  // Get all folders in the plugins directory
  const pluginFolders = fs.readdirSync(pluginsDir).filter((item) => {
    const itemPath = path.join(pluginsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

  if (fs.readdirSync(configPluginsFolder).length > 0) {
    const emphasizedMessage = `Plugins config folder is not empty, proceed and ${chalk.red.bold('override all files')} with defaults ? Type ${chalk.red.bold('"yes"')} to confirm:`;
    const proceed = await askUser(emphasizedMessage);
    if (!proceed) {
      console.log(`Skipping plugin config files...`);
      return;
    }
  }

  for (const folderName of pluginFolders) {
    try {
      // Dynamically import the <folderName>/<folderName>.config.ts file
      const configFileName = folderName + '.config.ts';
      const pluginConfigPath = path.join(
        pluginsDir,
        folderName,
        configFileName
      );
      if (!fs.existsSync(pluginConfigPath)) {
        console.warn(`Config file not found: ${configFileName}`);
        continue;
      }

      // todo name it SchemaPath or config path (coherence with plugin-loader)
      const { default: zodSchema } = await tsImport(
        pathToFileURL(pluginConfigPath).href,
        fileURLToPath(import.meta.url)
      );

      // Note: for unknown reason, instanceof z.ZodType give false since esm, maybe the imported Zod in plugin is considered
      //       different rom the one used to generate config ?
      // Ensure it's a Zod schema
      if (
        !['ZodObject', 'ZodDiscriminatedUnion'].includes(
          zodSchema.constructor.name
        )
      ) {
        console.error(`Invalid Zod schema in ${pluginConfigPath}`);
        continue;
      }

      // Generate a json5 file using the generated schema
      const json5FilePath = path.join(
        configPluginsFolder,
        `${folderName}.json5`
      );
      const json5Commented = generateJson5Commented(zodSchema, {
        enabled: false,
      });

      // Write the generated config to the file
      fs.writeFileSync(json5FilePath, json5Commented, 'utf8');

      const parsedPath = path.parse(json5FilePath);
      const formattedPath =
        chalk.blue(`${parsedPath.dir}${path.sep}`) +
        chalk.blue.bold(parsedPath.name) +
        chalk.blue(parsedPath.ext);

      console.log(`Generated plugin config: ${formattedPath}`);
    } catch (err) {
      console.error(`Error processing ${folderName}:`, err);
    }
  }
}

console.info(`Generating config files in ${chalk.blue.bold(configFolder)}`);

// Ensure the 'config' folder exists
if (!fs.existsSync(configFolder)) {
  console.info(`Folder doesn't exist, creating config folder`);
  fs.mkdirSync(configFolder, { recursive: true });
}

// One after another to avoid log mixed up
saveFiles().then(savePluginFiles);
