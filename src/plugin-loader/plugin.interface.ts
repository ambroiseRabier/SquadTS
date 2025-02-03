import { SquadServer } from '../squad-server';
import { PluginBaseOptions } from './plugin-base.config';

export type Plugin<PluginOptions extends PluginBaseOptions> = (server: SquadServer, options: PluginOptions) => void;
