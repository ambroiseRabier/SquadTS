import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const enabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  nextCommand: z
    .array(z.string().startsWith('!').toLowerCase().nonempty())
    .nonempty()
    .default([
      '!next',
      '!nextmap',
      '!end',
      '!forfeit',
      '!endmatch',
      '!surrender',
      '!giveup',
      '!skip',
      '!skipmap',
    ])
    .describe('The commands to trigger the end of the match, first one will be used in broadcast.'),
  continueCommand: z
    .string()
    .nonempty()
    .default('!continue')
    .describe('The command to continue the match.'),
  broadcastMessages: z.object({
    voteStarted: z
      .string()
      .nonempty()
      .default(
        'A vote has been started. Type "%nextCommand%" to end the match immediately or %continueCommand% to continue the match.'
      )
      .describe(
        'The message to broadcast when the vote starts. Available variables: %nextCommand%, %continueCommand%'
      ),
    voteUpdated: z
      .string()
      .nonempty()
      .default('Votes: %votes%/%total% (%percentage% %) - Remaining time: %remainingTime%')
      .describe(
        'Message to broadcast at fixed intervals while the vote is running. Available variables: %votes%, %total%, %percentage%, %remainingTime%.'
      ),
    nextWin: z
      .string()
      .nonempty()
      .default(
        'Ending match ! Most players voted to end the match. Votes: %votes%/%total% (%percentage% %)'
      )
      .describe(
        'Message to broadcast when players voted to change map. Match will end in 10sec after this is broadcast. Available variables: %votes%, %total%, %percentage%.'
      ),
    continueWin: z
      .string()
      .nonempty()
      .default('Most players voted to continue the match. Vote: %votes%/%total% (%percentage% %)')
      .describe(
        'Message to broadcast at fixed intervals while the vote is running. Available variables: %votes%, %total%, %percentage%, %remainingTime%.'
      ),
  }),
  nextVoteWait: z
    .number()
    .int()
    .min(0)
    .default(15)
    .describe(
      'How many minutes to wait before starting another vote. The wait will start after last vote ended. And will be reset after a map change.'
    ),
  nextVoteWaitWarn: z
    .string()
    .nonempty()
    .default('You cannot start another vote until %remainingNextVoteWait%')
    .describe(
      'Message to send to a player trying to start a vote when another vote cannot yet be started.'
    ),
  voteUpdateInterval: z
    .number()
    .int()
    .min(1)
    .default(60)
    .describe(
      'The interval in seconds between each vote update. In case the voteUpdateInterval end up at the same time as voteDuration, it will be skipped.'
    ),
  voteDuration: z.number().int().min(1).default(5).describe('The duration of the vote in minutes.'),
  voteThresholdPercentage: z
    .number()
    .min(1)
    .max(100)
    .default(65)
    .describe('The minimum number of votes % of total players to end the match.'),
});

const disabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(false),
});

const schema = z
  .discriminatedUnion('enabled', [enabledSchema, disabledSchema])
  .describe('End the match earlier when nobody like the map or when a team want to surrender.');

export type EndMatchVoteOptions = z.infer<typeof enabledSchema>;

export default schema;
