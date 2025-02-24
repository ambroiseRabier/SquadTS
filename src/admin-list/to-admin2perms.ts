import { AdminPerms, AdminPermsValues } from './permissions';
import { AdminList } from '../squad-config/parse-admin-list';

// Note hopefully, duplicated groups have no impact, and only compiled permissions of
// admins are kept before admin lists are combined by squad server...
//
// From https://squad.fandom.com/wiki/Server_Configuration#RemoteAdminListHosts.cfg
// "If a player is listed in multiple files, their permissions will be combined."
export function toAdmin2Perms(adminLists: AdminList[]) {
  const combinedAdmins = new Map<string, AdminPermsValues[]>();

  const groups = new Map<string, AdminPermsValues[]>();
  for (const list of adminLists) {
    groups.clear();
    for (const group of list.groups) {
      groups.set(group.role, group.permissions);
    }
    for (const admin of list.admins) {
      if (groups.has(admin.role)) {
        combinedAdmins.set(admin.steamID, [
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ...groups.get(admin.role)!,
          // Merge with existing permissions.
          ...(combinedAdmins.get(admin.steamID) ?? []),
        ]);
      } // else role is missing, ignore that admin
    }
  }

  return combinedAdmins as Map<string, AdminPerms[]>;
}
