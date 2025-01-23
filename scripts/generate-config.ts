import { optionsSchema } from '../src/parse-config';
import { z } from 'zod';
import { generateJson5Commented } from './generate-json5-commented';
import fs from 'node:fs';
import path from 'node:path';

const configFolder = path.join(__dirname, '..', 'config');

console.log(`Generating config files in ${configFolder}`);

// Ensure the 'config' folder exists
if (!fs.existsSync(configFolder)) {
  console.log(`Folder doesn't exist, creating config folder`);
  fs.mkdirSync(configFolder, { recursive: true });
}

for (const key in optionsSchema.shape) {
  const field= (optionsSchema as z.ZodObject<any>).shape[key];

  if (field instanceof z.ZodObject) {
    const json5Commented = generateJson5Commented(field);
    const filePath = path.join(configFolder, `${key}.json5`);
    fs.writeFileSync(filePath, json5Commented, 'utf8');
    console.log(`File saved: ${filePath}`);
  } else {
    throw new Error(`Unsupported field type (only use objects at base level): ${JSON.stringify(field)}`);
  }
}

