import { SquadTSPlugin } from '../../src/plugin-loader/plugin.interface';
import { DaveWhitelisterSocketIoOptions } from './dave-whitelister-socket-io.config';
import { useSocketIO } from './use-socketio';

// Notes: if testing with docker-compose while SquadTS is on localhost,
// address to be given to whitelister will be host.docker.internal
const daveWhitelisterSocketIo: SquadTSPlugin<DaveWhitelisterSocketIoOptions> = async (
  server,
  connectors,
  logger,
  options
) => {
  const {close} = useSocketIO(server, options, logger);

  return async () => {
    await close();
  };
};

export default daveWhitelisterSocketIo;
