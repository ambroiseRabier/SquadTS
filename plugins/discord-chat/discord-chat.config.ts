// noinspection JSUnusedGlobalSymbols

import { z } from 'zod';
import { pluginBaseOptionsSchema } from '../../src/plugin-loader/plugin-base.config';

const discordChatEnabledSchema = pluginBaseOptionsSchema.extend({
  enabled: z.literal(true),
  channelID: z.string().nonempty(),
  // Although unlikely, we use exclude pattern instead of include to be slightly more defensive in case
  // of Squad changing chat name or adding a new chat.
  excludeChat: z
    .array(z.string())
    .default([])
    .describe("Known chat: 'ChatAll', 'ChatTeam', 'ChatSquad', 'ChatAdmin'"),
  requireConnectors: z.tuple([z.literal('discord')]),
}).describe("Log real time squad chat to Discord.");

const discordChatSchema = z.discriminatedUnion("enabled", [
  discordChatEnabledSchema,
  pluginBaseOptionsSchema.extend({
    enabled: z.literal(false),
  }),
]);

export type DiscordChatEnabledOptions = z.infer<typeof discordChatEnabledSchema>;

// Use a different schema for validation and for typing of the plugin, as only enabled plugin will have their main
// function called.
export default discordChatSchema;

// If set, the plugin will only be loaded if the connectors are available.
// This means you won't have to deal with missing connectors errors.
export const requireConnectors = ['discord'];
