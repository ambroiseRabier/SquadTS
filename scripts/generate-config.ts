import { optionsSchema } from '../src/config/config.schema';
import { z } from 'zod';
import { generateJson5Commented } from './generate-config/generate-json5-commented';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import chalk from 'chalk';
import { dirname } from 'path';
import { fileURLToPath } from 'node:url';

// You may skip asking user for pre-commit or CI/CD stuff.
const FORCE_OVERRIDE = process.argv.includes('--force') || process.argv.includes('-f');
const configFolder = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'config');

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

    if (field instanceof z.ZodObject || field instanceof z.ZodDiscriminatedUnion) {
      // Define the file path
      const filePath = path.join(configFolder, `${key}.json5`);

      // Check if file exists
      if (fs.existsSync(filePath) && !FORCE_OVERRIDE) {
        // Ask user for permission to override, only once
        if (!shouldOverride && !asked) {
          asked = true;
          const emphasizedMessage = `An existing config file (${chalk.blue.bold(`${key}.json5`)}) has been found in the folder,` +
            ` do you want to ${chalk.red.bold("OVERRIDE ALL CONFIG FILES")} in the folder? (won't override plugin config) Type ${chalk.red.bold('"yes"')} to confirm: `;

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
      throw new Error(`[Config generator] Unsupported ZOD field type (${(field as any).constructor.name}): ${JSON.stringify(field)}`);
    }
  }
}

async function savePluginFiles() {
  console.info(`Generating plugin files...`);

  const pluginsDir = path.join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins'); // Assume 'plugins' is the root directory for plugins

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
      const pluginConfigPath = path.join(pluginsDir, folderName, `${folderName}.config.ts`);
      if (!fs.existsSync(pluginConfigPath)) {
        console.warn(`Config file not found for plugin: ${folderName}`);
        continue;
      }

      const { default: zodSchema } = require(pluginConfigPath);

      // Ensure it's a Zod schema
      if (!z.ZodType.isPrototypeOf(zodSchema.constructor)) {
        console.error(`Invalid Zod schema in ${pluginConfigPath}`);
        continue;
      }

      // Generate a json5 file using the generated schema
      const json5FilePath = path.join(configPluginsFolder, `${folderName}.json5`);
      const json5Commented = generateJson5Commented(zodSchema, {enabled: false});

      // Write the generated config to the file
      fs.writeFileSync(json5FilePath, json5Commented, 'utf8');
      console.log(`Generated plugin config: ${chalk.blue.bold(json5FilePath)}`);
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
