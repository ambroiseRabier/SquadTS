import { AdminPerms } from '../../../src/admin-list/permissions';
import { SwitchRequest } from './switch-helpers';
import { SquadServer } from '../../../src/squad-server';

// Sorting function prioritizing Reserve, followed by date asc (oldest first)
export const sortRequests = (
  requests: SwitchRequest[],
  playerHasPermissions: SquadServer['helpers']['playerHasPermissions']
) => {
  const hasReservePermission = (eosID: string) => playerHasPermissions(eosID, [AdminPerms.Reserve]);

  return requests.sort(
    (a, b) =>
      Number(hasReservePermission(b.eosID)) - Number(hasReservePermission(a.eosID)) ||
      a.date.getTime() - b.date.getTime()
  );
};
