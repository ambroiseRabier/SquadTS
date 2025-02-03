import { SquadServer } from '../squad-server';
import { PluginBaseOptions } from './plugin-base.config';
import { Logger } from 'pino';

export type SquadTSPlugin<PluginOptions extends PluginBaseOptions> = (server: SquadServer, logger: Logger, options: PluginOptions) => void;
