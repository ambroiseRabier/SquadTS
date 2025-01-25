import { Logger } from 'pino';
import { resolveConfigsPath } from './resolve-configs-path';
import { loadConfigFiles } from './load-config';
import { parseConfig } from './parse-config';

export async function useConfig(logger: Logger, ) {
  const configFolder = resolveConfigsPath();

  // Files loading
  logger.info(`Loading configurations from ${configFolder}...`);
  const configs = await loadConfigFiles(configFolder);
  logger.info('Configurations loaded.');
  logger.trace(configs);

  // Validation
  logger.info('Validating Configuration...');
  const parsedConfig = await parseConfig(configs);
  logger.info('Configuration validated.');

  return parsedConfig;
}
