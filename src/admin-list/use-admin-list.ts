import { AdminPerms } from './permissions';
import { SquadConfig } from '../squad-config/use-squad-config';
import { getAdminsWithPermissions } from './get-admin-with-permissions';
import { mergeAdminLists } from './merge-admin-lists';

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
      admins = mergeAdminLists([base, ...remoteAdminLists]);
    },
  };
}
