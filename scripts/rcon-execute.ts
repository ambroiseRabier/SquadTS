import { useRcon } from '../src/rcon/use-rcon';
import { RconOptions, rconOptionsSchema } from '../src/rcon/rcon.config';
import fs from 'fs';
import JSON5 from 'json5';
import pretty from 'pino-pretty';
import { pino } from 'pino';

/**
 * Example: npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListCommands 1
 */

// Execute on custom server with all rights, there is also ListCommands 1, but this may list command that only devs
// have access to.
// ListPermittedCommands will error "You need a connected player to know its permitted commands."

const prettyStream = pretty({
  colorize: true,
});

const logger = pino(
  {
    base: null, // Remove processID and hostname
  },
  prettyStream
);

logger.level = 'info';

async function rconExecute(options: RconOptions, command: string) {
  logger.info(`Executing command: ${command}`);
  const rcon = useRcon(options, logger);
  await rcon.connect();
  try {
    // At worse, server will handle the wrong command gracefully. Everything is still strings.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await rcon.execute(command as any);
  } finally {
    // Make sure we disconnect in case of error.
    await rcon.disconnect();
  }
}

async function getRconOptions() {
  logger.info('Loading RCON options');
  logger.warn(
    'Note that if you use that while SquadTS server is on, Squad server will disconnect you based on IP.'
  );
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
  .then(options => {
    const command = process.argv.slice(3).join(' ');

    if (!command) {
      throw new Error('No command provided');
    }

    return rconExecute(options, command);
  })
  .then(response => {
    logger.info(response);
  })
  .then(() => {
    process.exit(0);
  });
