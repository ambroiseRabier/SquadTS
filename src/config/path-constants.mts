import path from 'node:path';
import { fileURLToPath } from 'node:url';


//todo rename file
// maybe rename constant: plugin ts folder, ...

/**
 * Use config folder by default, unless envConfigPath env var is specified.
 * Support both envConfigPath relative from root path and absolute path.
 * e.g:
 * - '' -> <project_root>/config
 * - 'customFolder' -> <project_root>/customFolder
 * - 'L://squadTS/config' -> 'L://squadTS/config'
 * @return Configs folder path
 */
export function resolveConfigsPath(envConfigPath: string|undefined): string {
  if (envConfigPath) {
    // remove double quote if provided
    const dir = envConfigPath.replace(/"/g, '');

    if (path.isAbsolute(dir)) {
      return path.resolve(dir);
    } else {
      return path.join(PROJECT_ROOT, dir);
    }
  } else {
    return DEFAULT_CONFIGS_ROOT;
  }
}


/**
 * <your-path>\SquadTS
 * Will be the same from anywhere, be it you run the server or run tests.
 */
export const PROJECT_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../..');

/**
 * <your-path>\SquadTS\plugins
 */
export const PLUGINS_ROOT = path.join(PROJECT_ROOT, 'plugins');

/**
 * Default if no env var SQUAD_TS_CONFIG_PATH provided.
 * <your-path>\SquadTS\config
 */
export const DEFAULT_CONFIGS_ROOT = path.join(PROJECT_ROOT, 'config');

/**
 * If env var SQUAD_TS_CONFIG_PATH is not provided, it will default to DEFAULT_CONFIGS_ROOT
 * May be:
 * - <your-path>\SquadTS\config
 * - <your-path>\SquadTS\dev-config
 * - ...
 */
export const CONFIGS_ROOT = resolveConfigsPath(process.env.SQUAD_TS_CONFIG_PATH);

/**
 * <your-path>\SquadTS\config\plugins
 */
export const PLUGINS_CONFIG_ROOT = path.join(CONFIGS_ROOT, 'plugins');
