import path, { dirname } from 'path';
import { fileURLToPath } from 'node:url';

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
      // To have path from project root, we add ".." twice before user relative path input.
      // How much ".." depends on placement of this file in directories...
      return path.resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', dir);
    }
  } else {
    return path.resolve(dirname(fileURLToPath(import.meta.url)), '../config');
  }
}
