import { describe, expect, it } from 'vitest';
import { AdminPerms } from './permissions';
import { getAdminsWithPermissions } from './get-admin-with-permissions';

describe('getAdminsWithPermissions', () => {
  it('should return admins who have all required permissions', () => {
    // Sample map of admins with permissions
    const admins = new Map<string, AdminPerms[]>([
      ['admin1', [AdminPerms.ChangeMap, AdminPerms.Ban, AdminPerms.Kick]],
      ['admin2', [AdminPerms.ChangeMap, AdminPerms.Kick]], // Missing 'Ban'
      ['admin3', [AdminPerms.Pause, AdminPerms.ManageServer]], // Different permissions
      ['admin4', [AdminPerms.ChangeMap, AdminPerms.Ban]],
    ]);

    // Only "admin1" and "admin4" satisfies all required permissions
    expect(getAdminsWithPermissions(admins, [AdminPerms.ChangeMap, AdminPerms.Ban])).toEqual([
      ['admin1', [AdminPerms.ChangeMap, AdminPerms.Ban, AdminPerms.Kick]],
      ['admin4', [AdminPerms.ChangeMap, AdminPerms.Ban]],
    ]);
  });
});
