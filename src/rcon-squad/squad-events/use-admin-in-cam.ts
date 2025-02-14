import { map, tap } from 'rxjs';
import { useChatPacketEvent } from './use-chat-packet-event';


type Props = Pick<ReturnType<typeof useChatPacketEvent>, 'possessedAdminCamera' | 'unPossessedAdminCamera'>

export function useAdminInCam(p: Props) {
  const adminsInAdminCam = new Map<string, Date>();

  return {
    adminsInAdminCam,
    possessedAdminCamera: p.possessedAdminCamera.pipe(
      tap(data => adminsInAdminCam.set(data.eosID, data.date))
    ),
    unPossessedAdminCamera: p.unPossessedAdminCamera.pipe(
      map(data => ({
        ...data,
        duration: adminsInAdminCam.has(data.eosID) ? data.date.getTime() - adminsInAdminCam.get(data.eosID)!.getTime() : 0
      })),
      tap(data => adminsInAdminCam.delete(data.eosID))
    )
  }
}
