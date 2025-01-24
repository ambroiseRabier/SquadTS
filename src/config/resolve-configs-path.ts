import path from 'path';

/**
 * Use config folder by default, unless SQUAD_JS_CONFIG_PATH env var is specified.
 * Support both SQUAD_JS_CONFIG_PATH relative from root path and absolute path.
 * @return Configs folder path
 */
export function resolveConfigsPath(): string {
  if (process.env.SQUAD_JS_CONFIG_PATH) {
    // remove double quote if provided
    const dir = process.env.SQUAD_JS_CONFIG_PATH.replace(/"/g, '');

    if (path.isAbsolute(dir)) {
      return path.resolve(dir);
    } else {
      // To have path from project root, we add ".." twice before user relative path input.
      // How much ".." depends on placement of this file in directories...
      return path.resolve(__dirname, '..', '..', dir);
    }
  } else {
    return path.resolve(__dirname, '../config');
  }
}
