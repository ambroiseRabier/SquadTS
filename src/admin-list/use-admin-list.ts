import { AdminPerms } from './permissions';
import { SquadConfig } from '../squad-config/use-squad-config';
import { toAdmin2Perms } from './to-admin2perms';
import { getAdminsWithPermissions } from './get-admin-with-permissions';

export type AdminList = ReturnType<typeof useAdminList>;

export function useAdminList(squadConfig: SquadConfig) {
  let admins = new Map<string, AdminPerms[]>();

  // Note: Using a getter will avoid losing the reference
  return {
    get admins() {
      return admins;
    },
    getAdminsWithPermissions: (permissions: AdminPerms[]) => {
      return getAdminsWithPermissions(admins, permissions);
    },
    update: async () => {
      const base = await squadConfig.fetch.admins();
      const remoteAdminLists = await squadConfig.fetch.remoteAdminListHosts();

      // Do not directly set admins (let) or we lose reference
      // Update: well, using a getter is the better solutino
      admins = toAdmin2Perms([base, ...remoteAdminLists]);
    },
  };
}
