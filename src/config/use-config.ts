import { Logger } from 'pino';
import { loadConfigFiles } from './load-config';
import { optionsSchema } from './config.schema';
import { CONFIGS_ROOT } from './path-constants.mjs';

export async function useConfig(logger: Logger) {
  // Files loading
  logger.info(`Loading configurations from ${CONFIGS_ROOT}...`);
  const configs = await loadConfigFiles(CONFIGS_ROOT);
  logger.info('Configurations loaded.');
  logger.trace(configs);

  // Validation
  logger.info('Validating Configuration...');

  return await parseConfigs(configs, logger);
}

export async function parseConfigs(configs: unknown, logger: Logger) {
  const parsed = await optionsSchema.safeParseAsync(configs);

  // This ridiculous code duplication (look we return the same thing in both condition bodies)
  // actually make TS aware that when parsed.success
  // is true, the config object is not undefined.
  if (parsed.success) {
    return {
      valid: parsed.success,
      config: parsed.data,
    };
  } else {
    const errorMessages = parsed.error.issues
      .map(issue => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    logger.error(errorMessages);

    return {
      valid: parsed.success,
      config: parsed.data,
    };
  }
}
