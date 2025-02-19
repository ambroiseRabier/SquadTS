// I don't see the problem with using any here, additionally, both never and unknown give TS errors.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { init } from 'zod-empty';
import JSON5 from 'json5';
import { addCommentJson5Zod } from './add-comment-json5-zod';
import { z } from 'zod';
import { merge } from 'lodash-es';

export function generateJson5Commented(
  schema: z.ZodObject<any> | z.ZodDiscriminatedUnion<any, any>,
  overrideDefaults?: any
) {
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
  let defaults = init(schema);

  // Useful to force enabled: false on plugins while still providing default for enabled.
  if (overrideDefaults) {
    defaults = merge(defaults, overrideDefaults);
  }

  const json5 = JSON5.stringify(defaults, {
    space: 2,
  });

  return addCommentJson5Zod(schema, json5);
}
