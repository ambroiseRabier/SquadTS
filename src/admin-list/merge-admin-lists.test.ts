import { describe, expect, it } from 'vitest';
import { AdminPerms } from './permissions';
import { mergeAdminLists } from './merge-admin-lists';

describe('mergeAdminLists', () => {
  it('should combine permissions from multiple admin lists', () => {
    // Base admin list (e.g., from Admins.cfg)
    const baseList = new Map([
      ['76561198123456789', [AdminPerms.Kick, AdminPerms.Ban]],
      ['76561198987654321', [AdminPerms.CanSeeAdminChat]],
    ]);

    // Remote admin list 1 (e.g., from a community list)
    const remoteList1 = new Map([
      ['76561198123456789', [AdminPerms.Reserve, AdminPerms.Ban]],
      ['76561198111111111', [AdminPerms.CanSeeAdminChat]],
    ]);

    // Remote admin list 2 (e.g., from another community list)
    const remoteList2 = new Map([
      ['76561198123456789', [AdminPerms.Cameraman]],
      ['76561198222222222', [AdminPerms.Debug]],
    ]);

    const result = mergeAdminLists([baseList, remoteList1, remoteList2]);

    expect(result).toEqual(
      new Map([
        [
          '76561198123456789',
          [AdminPerms.Kick, AdminPerms.Ban, AdminPerms.Reserve, AdminPerms.Cameraman],
        ],
        ['76561198987654321', [AdminPerms.CanSeeAdminChat]],
        ['76561198111111111', [AdminPerms.CanSeeAdminChat]],
        ['76561198222222222', [AdminPerms.Debug]],
      ])
    );
  });

  it('should handle empty lists', () => {
    expect(mergeAdminLists([])).toEqual(new Map());
  });

  it('should handle single list', () => {
    const singleList = new Map([['76561198123456789', [AdminPerms.Kick]]]);

    expect(mergeAdminLists([singleList])).toEqual(singleList);
  });

  it('should deduplicate permissions', () => {
    const list1 = new Map([['76561198123456789', [AdminPerms.Kick, AdminPerms.Ban]]]);

    const list2 = new Map([['76561198123456789', [AdminPerms.Ban, AdminPerms.CanSeeAdminChat]]]);

    expect(mergeAdminLists([list1, list2])).toEqual(
      new Map([
        ['76561198123456789', [AdminPerms.Kick, AdminPerms.Ban, AdminPerms.CanSeeAdminChat]],
      ])
    );
  });
});
