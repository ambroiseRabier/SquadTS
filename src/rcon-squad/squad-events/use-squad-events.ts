import { Subject } from 'rxjs';
import { Logger } from 'pino';
import { useAdminInCam } from './use-admin-in-cam';
import { useChatPacketEvent } from './use-chat-packet-event';

export function useSquadEvents(logger: Logger, chatPacketEvent: Subject<string>) {
  const chatEvents = useChatPacketEvent(logger, chatPacketEvent);
  const { adminsInAdminCam, unPossessedAdminCamera, possessedAdminCamera } =
    useAdminInCam(chatEvents);

  return {
    adminsInAdminCam,
    chatEvents: {
      ...chatEvents,
      possessedAdminCamera,
      unPossessedAdminCamera,
    },
  };
}
