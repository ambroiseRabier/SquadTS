import { Rcon } from '../src/rcon/rcon';
import { RconOptions, rconOptionsSchema } from '../src/rcon/rcon.config';
import { useLogger } from '../src/logger/use-logger';
import fs from 'fs';
import JSON5 from 'json5';

/**
 * Example: npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListCommands 1
 */

// Execute on custom server with all rights, there is also ListCommands 1, but this may list command that only devs
// have access to.
// ListPermittedCommands will error "You need a connected player to know its permitted commands."

const logger = useLogger();
logger.level = 'info';

async function rconExecute(options: RconOptions, command: string) {
  logger.info(`Executing command: ${command}`);
  const rcon = new Rcon(options, logger);
  await rcon.connect();
  try {
    // At worse, server will handle wrong command gracefully.
    return await rcon.execute(command as any);
  } catch (error) {
    throw error;
  } finally {
    // Make sure we disconnect in case of error.
    await rcon.disconnect();
  }
}

async function getRconOptions() {
  logger.info(`Loading rcon options`);
  const inputJsonPath = process.argv[2];

  if (!inputJsonPath) {
    throw new Error('No rcon.json file provided');
  }

  const jsonPath = await fs.promises.realpath(inputJsonPath);
  const exist = fs.existsSync(jsonPath);

  if (!exist) {
    throw new Error(`File doesn't exist: ${jsonPath}`);
  }

  const fileTxt = await fs.promises.readFile(jsonPath, 'utf8');

  return rconOptionsSchema.parse(JSON5.parse(fileTxt));
}




getRconOptions()
  .then((options) => {
    const command = process.argv.slice(3).join(' ');

    if (!command) {
      throw new Error('No command provided');
    }

    return rconExecute(options, command);
  }).then((response) => {
    logger.info(response);
  })
  .then(() => {
    process.exit(0);
  });

