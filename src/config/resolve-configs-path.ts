import path from 'path';

/**
 * Use config folder by default, unless SQUAD_JS_CONFIG_PATH env var is specified.
 * Support both SQUAD_JS_CONFIG_PATH relative from root path and absolute path.
 * @return Configs folder path
 */
export function resolveConfigsPath(): string {
  if (process.env.SQUAD_JS_CONFIG_PATH) {
    if (path.isAbsolute(process.env.SQUAD_JS_CONFIG_PATH)) {
      return path.resolve(process.env.SQUAD_JS_CONFIG_PATH);
    } else {
      // To have path from project root, we add ".." before user relative path input.
      return path.resolve(__dirname, '..', process.env.SQUAD_JS_CONFIG_PATH);
    }
  } else {
    return path.resolve(__dirname, '../config');
  }
}
