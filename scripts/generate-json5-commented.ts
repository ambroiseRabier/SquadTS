import { init } from 'zod-empty';
import JSON5 from 'json5';
import { addCommentJson5Zod } from './add-comment-json5-zod';
import { z } from 'zod';

export function generateJson5Commented(schema: z.ZodObject<any>) {
  /**
   * See https://github.com/colinhacks/zod/discussions/1953
   *
   * Some notes about getting default values:
   * - `schema.parse({})` could work, but we need to set defaults on every property in the schema otherwise it errors.
   * - To avoid having to set defaults like am empty string at many properties, we use zod-empty as basis.
   * - Any `.default` value will override zod-empty.
   * - Be also aware that you can set "placeholder" with `.default` like `host: "xxx.xxx.xxx.xxx"`, those defaults
   *   can be invalid, and will force user to change them.
   */
  const defaults = init(schema);
  const json5 = JSON5.stringify(defaults, {
    space: 2,
  });

  return addCommentJson5Zod(schema, json5);
}
