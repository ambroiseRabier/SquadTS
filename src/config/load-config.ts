import fs from 'fs/promises';
import path from 'path';
import JSON5 from 'json5';
import chalk from 'chalk';

type Configs = Record<string, any>;

/**
 * Asynchronously loads and parses all JSON5 files in a given directory.
 * @param dir - Absolute path to the directory containing the config files.
 * @returns An object with file names (without extensions) as keys and their parsed content as values.
 */
export async function loadConfigFiles(dir: string): Promise<Configs> {
  let files: string[];
  try {
    // Read all files in the directory,
    files = await fs.readdir(dir);
  } catch (err) {
    throw new Error(chalk.red(`Failed to read directory: ${dir}. Error: ${(err as Error).message}`));
  }

  const configs: Configs = {};

  for (const file of files) {
    // Process only `.json5` and .json files
    if (path.extname(file) === '.json5' || path.extname(file) === '.json') {
      const filePath = path.join(dir, file);

      try {
        // Read the raw content of the file
        const rawContent = await fs.readFile(filePath, 'utf8');

        // Parse the JSON5 content
        const parsedContent = JSON5.parse(rawContent);

        // Use the file name (without extension) as the key
        const fileNameWithoutExt = path.basename(file, path.extname(file));
        configs[fileNameWithoutExt] = parsedContent;
      } catch (err) {
        throw new Error(`Failed to load or parse file: ${filePath}. Error: ${(err as Error).message}`);
      }
    }
  }

  return configs;
}
