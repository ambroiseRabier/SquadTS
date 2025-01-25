import { map, tap } from 'rxjs';
import { SquadEvents } from '../rcon/chat-processor';
import { Player } from './use-squad-events';

export function useAdminCam(
  POSSESSED_ADMIN_CAMERA: SquadEvents<{player: Player}>['POSSESSED_ADMIN_CAMERA'],
  UNPOSSESSED_ADMIN_CAMERA: SquadEvents<{player: Player}>['UNPOSSESSED_ADMIN_CAMERA'],
                            ) {
  const adminsInAdminCam = new Map<string, Date>();

  POSSESSED_ADMIN_CAMERA.pipe(
    tap(data => {
      adminsInAdminCam.set(data.eosID, data.time);
    })
  );

  UNPOSSESSED_ADMIN_CAMERA.pipe(
    map(data => {
      const time = adminsInAdminCam.get(data.eosID);
      adminsInAdminCam.delete(data.eosID);

      return {
        ...data,
        duration: time ? data.time.getTime() - time.getTime() : 0
      }
    })
  );

  return {
    adminsInAdminCam
  }
}
