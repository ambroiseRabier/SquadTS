import { z } from 'zod';

export const autoTKWarnSchema = z.object({
  attackerMessage: z
    .string()
    .optional()
    .describe('The message to warn attacking players with.')
    .default('Please apologise for ALL TKs in ALL chat!'),

  victimMessage: z
    .string()
    .nullable()
    .optional()
    .describe('The message that will be sent to the victim. null value mean no message sent.')
    .default(null),
});

export type AutoTKWarnOptions = z.infer<typeof autoTKWarnSchema>;

// export AutoTKWarnConfig
