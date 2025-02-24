import { AdminPerms } from '../admin-list/permissions';

export type AdminList = ReturnType<typeof parseAdminList>;

export function parseAdminList(str: string) {
  const groups = parseGroupPermissions(str);
  return parseAdmins(str, groups);
}

function parseGroupPermissions(configText: string): Map<string, AdminPerms[]> {
  // Trim start and ignore comments.
  const groupRgx = /^ *(?<!\/\/)Group=(?<role>\w+):(?<permissions>[\w,]+).*$/gm;
  const groups = new Map<string, AdminPerms[]>();

  for (const match of configText.matchAll(groupRgx)) {
    const role = match.groups?.role;
    const permissions = match.groups?.permissions;
    if (role && permissions) {
      groups.set(role, permissions.split(',') as AdminPerms[]);
    }
  }

  return groups;
}

function parseAdmins(configText: string, groups: Map<string, AdminPerms[]>) {
  // I can extract comment, but is this of any use ?
  // We usually only care about online admin, and online admin name can be retrieved through their steamID.
  const adminRgx = /^ *(?<!\/\/)Admin=(?<steamID>\d+):(?<role>\w+)(:? *\/\/ *)?(?<comment>.*)$/gm;
  const admins = new Map<string, AdminPerms[]>();

  for (const match of configText.matchAll(adminRgx)) {
    const steamID = match.groups?.steamID;
    const role = match.groups?.role;
    // If properly formated Admin declaration
    if (steamID && role) {
      const permissions = groups.get(role);
      if (permissions) {
        admins.set(steamID, permissions);
      } // If the role is missing in the group, ignore that admin.
    }
  }

  return admins;
}
