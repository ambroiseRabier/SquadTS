import { optionsSchema } from '../config/config.schema';
import { Logger } from 'pino';


export function pluginLoader(logger: Logger) {

  async function validate(options: any, pluginName: string)  {
    const parsed = await optionsSchema.safeParseAsync(options);

    if (parsed.success) {
      return {
        valid: true,
      }
    } else {
      const errorMessages = parsed.error.issues.map(
        (issue) => `- ${issue.path.join('.')}: ${issue.message}`
      ).join('\n');

      logger.error(`${pluginName} plugin is misconfigured:\n ${errorMessages}`);

      return {
        valid: false,
        message: errorMessages
      }
    }
  }

  return {

  };
}
