import { describe, expect, it } from 'vitest';
import { AdminList } from '../squad-config/parse-admin-list';
import { AdminPermsValues } from './permissions';
import { toAdmin2Perms } from './to-admin2perms';

describe('toAdmin2Perms', () => {
  it('should combine admins and permissions correctly', () => {
    const adminLists: AdminList[] = [
      {
        groups: [
          { role: 'moderator', permissions: ['kick', 'ban'] },
          { role: 'admin', permissions: ['kick', 'ban', 'manageServer'] },
        ],
        admins: [
          { steamID: '123', role: 'moderator', comment: '' },
          { steamID: '456', role: 'admin', comment: '' },
        ],
      },
      {
        groups: [{ role: 'admin', permissions: ['restartServer'] }],
        admins: [
          { steamID: '789', role: 'admin', comment: '' },
          { steamID: '123', role: 'admin', comment: '' }, // Duplicate steamID with a new role
        ],
      },
    ];

    const result = toAdmin2Perms(adminLists);

    // Note: careful, test is sensitive to order of permissions :/
    expect(result).toEqual(
      new Map<string, AdminPermsValues[]>([
        ['123', ['restartServer', 'kick', 'ban']], // Role updated to admin with combined permissions
        ['456', ['kick', 'ban', 'manageServer']], // Admin permissions for role 'admin'
        ['789', ['restartServer']], // Admin permissions for role 'admin'
      ])
    );
  });
});
