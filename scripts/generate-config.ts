import { optionsSchema } from '../src/config/parse-config';
import { z } from 'zod';
import { generateJson5Commented } from './generate-config/generate-json5-commented';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

// You may skip asking user for pre-commit or CI/CD stuff.
const FORCE_OVERRIDE = process.argv.includes('--force') || process.argv.includes('-f');
const configFolder = path.join(__dirname, '..', 'config');

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

    if (field instanceof z.ZodObject) {
      const json5Commented = generateJson5Commented(field);

      // Define the file path
      const filePath = path.join(configFolder, `${key}.json5`);

      // Check if file exists
      if (fs.existsSync(filePath) && !FORCE_OVERRIDE) {
        console.log(`File already exists: ${filePath}`);

        // Ask user for permission to override, only once
        if (!shouldOverride && !asked) {
          asked = true;
          shouldOverride = await askUser(`An existing config file ("${key}.json5") has been found in the folder,` +
            ` do you want to override ALL CONFIG FILES in the folder ? Type "yes" to confirm: `);
        }

        if (!shouldOverride) {
          console.log(`Skipping file: ${filePath}`);
          continue;
        }
      }

      // Write the content to the file
      fs.writeFileSync(filePath, json5Commented, 'utf8');
      console.log(`File saved: ${filePath}`);
    } else {
      throw new Error(`Unsupported field type (only use objects at base level of Zod options schema): ${JSON.stringify(field)}`);
    }
  }
}

console.info(`Generating config files in ${configFolder}`);

// Ensure the 'config' folder exists
if (!fs.existsSync(configFolder)) {
  console.info(`Folder doesn't exist, creating config folder`);
  fs.mkdirSync(configFolder, { recursive: true });
}

saveFiles();
