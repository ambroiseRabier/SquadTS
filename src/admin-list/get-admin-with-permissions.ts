import { AdminPerms } from './permissions';

export function getAdminsWithPermissions(
  admins: Map<string, AdminPerms[]>,
  permissions: AdminPerms[]
) {
  const result: [steamId64: string, AdminPerms[]][] = [];

  for (const [adminID, adminPerms] of admins.entries()) {
    const hasAllPermissions = permissions.every(permission => adminPerms.includes(permission));

    if (hasAllPermissions) {
      result.push([adminID, adminPerms]);
    }
  }

  return result;
}
