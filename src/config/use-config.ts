import { Logger } from 'pino';
import { resolveConfigsPath } from './resolve-configs-path';
import { loadConfigFiles } from './load-config';
import { optionsSchema } from './config.schema';


export async function useConfig(logger: Logger) {
  const configFolder = resolveConfigsPath(process.env.SQUAD_TS_CONFIG_PATH);

  // Files loading
  logger.info(`Loading configurations from ${configFolder}...`);
  const configs = await loadConfigFiles(configFolder);
  logger.info('Configurations loaded.');
  logger.trace(configs);

  // Validation
  logger.info('Validating Configuration...');

  return await parseConfigs(configs, logger);
}


export async function parseConfigs(configs: any, logger: Logger) {
  const parsed = await optionsSchema.safeParseAsync(configs);


  // This ridiculous code duplication (look we return the same thing in both condition bodies)
  // actually make TS aware that when parsed.success
  // is true, the config object is not undefined.
  if (parsed.success) {
    return {
      valid: parsed.success,
      config: parsed.data
    }
  } else {
    const errorMessages = parsed.error.issues.map(
      (issue) => `- ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    logger.error(errorMessages);

    return {
      valid: parsed.success,
      config: parsed.data
    }
  }
}
