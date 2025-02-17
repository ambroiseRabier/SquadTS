// Generate a description map
import { z } from 'zod';

/*function getDescriptionsFromSchema(schema: z.ZodObject<any>, prefix = ""): Record<string, string> {
  const shape2: z.ZodDiscriminatedUnion<any, any>;
  const shape = schema.shape;
  const descriptions: Record<string, string> = {};

  for (const key in shape) {
    const field = shape[key];

    if (field?._def?.description) {
      descriptions[prefix + key] = field._def.description; // Add field description
    }

    // Handle nested Zod objects
    if (field instanceof z.ZodObject) {
      const nestedDescriptions = getDescriptionsFromSchema(field, `${prefix}${key}.`);
      Object.assign(descriptions, nestedDescriptions);
    }
  }

  return descriptions;
}*/

function getDescriptionsFromSchema(
  schema: z.ZodObject<any> | z.ZodDiscriminatedUnion<any, any>,
  prefix = ''
): Record<string, string> {
  const descriptions: Record<string, string> = {};

  // instanceof does not work here, see generate-config.mts comment (dynamic imports...). It does remove type assertion :(
  if (schema.constructor.name === 'ZodDiscriminatedUnion') {
    // Handle discriminated unions by iterating through all its options
    for (const option of (schema as z.ZodDiscriminatedUnion<any, any>)
      .options) {
      const nestedDescriptions = getDescriptionsFromSchema(option, prefix); // Recursively collect descriptions for each option
      Object.assign(descriptions, nestedDescriptions);
    }
  } else if (schema.constructor.name === 'ZodObject') {
    // Handle Zod objects
    const shape = (schema as z.ZodObject<any>).shape;

    for (const key in shape) {
      const field = shape[key];

      if (field?._def?.description) {
        descriptions[prefix + key] = field._def.description; // Add field description
      }

      // If the field is a nested Zod object or a discriminated union, handle it
      if (
        ['ZodObject', 'ZodDiscriminatedUnion'].includes(field.constructor.name)
      ) {
        const nestedDescriptions = getDescriptionsFromSchema(
          field,
          `${prefix}${key}.`
        );
        Object.assign(descriptions, nestedDescriptions);
      }
    }
  }

  return descriptions;
}

// Helper to get indentation of a line
function getIndent(line: string): string {
  const match = line.match(/^(\s*)/);
  return match ? match[1] : '';
}

/**
 * Add comment from `.describe()` of a Zod shema to a JSON5 object corresponding to that Zod shema.
 * Only work on pretty JSON.
 */
export function addCommentJson5Zod(
  schema: z.ZodObject<any> | z.ZodDiscriminatedUnion<any, any>,
  json5String: string
): string {
  const topLevelDescription = schema._def.description;
  const topLevelComment = !!topLevelDescription
    ? `\/**\n * ${topLevelDescription.replaceAll('\n', '\n * ')}\n *\/\n`
    : '';

  // Generate description map from the schema
  const descriptions = getDescriptionsFromSchema(schema);

  // Process the JSON5 string line by line
  const lines = json5String.split('\n');
  const commentedLines: string[] = [];
  const scopedKeys: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if it's a key-value line (e.g., "key: value,")
    const keyMatch = trimmedLine.match(/^"?(?<key>\w+)"?:/);
    if (keyMatch) {
      const { key } = keyMatch.groups!;
      const description =
        descriptions[
          `${scopedKeys.join('.')}${scopedKeys.length > 0 ? '.' : ''}${key}`
        ];

      // If a description is available, add it as a comment
      if (description) {
        const indent = getIndent(line); // Match the current line's indentation
        const multiLineDescription = description
          .split('\n')
          .map((line) => `${indent}// ${line}`)
          .join('\n');
        commentedLines.push(multiLineDescription); // Add comment(s)
      }
    }

    const objectMatch = trimmedLine.match(/^"?(?<key>\w+)"?: {/);
    if (objectMatch) {
      scopedKeys.push(objectMatch.groups!.key);
    }

    const objectEndMatch = trimmedLine.match(/^}/);
    if (objectEndMatch) {
      // Note, Last "}" marking JSON end will also match but pop on empty array does nothing.
      scopedKeys.pop();
    }

    // Append the original line
    commentedLines.push(line);
  }

  return topLevelComment + commentedLines.join('\n');
}
