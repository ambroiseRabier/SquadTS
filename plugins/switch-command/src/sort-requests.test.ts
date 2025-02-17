import { AdminPerms } from '../../../src/admin-list/permissions';
import { SwitchRequest } from './switch-helpers';
import { beforeEach, describe, it, vi, expect } from 'vitest';
import { sortRequests } from './sort-requests';
import { SquadServer } from '../../../src/squad-server';

describe('sortRequests', () => {
  const mockPlayerHasPermissions = vi.fn<SquadServer['helpers']['playerHasPermissions']>();

  beforeEach(() => {
    vi.clearAllMocks(); // Reset mock between tests
  });

  it('prioritizes players with Reserve permission, then by date', () => {
    const requests: SwitchRequest[] = [
      { eosID: 'player3', date: new Date('2023-01-03') },
      { eosID: 'player2', date: new Date('2023-01-02') },
      { eosID: 'player1', date: new Date('2023-01-01') },
    ];

    // Mock permissions: `player2` has Reserve permissions
    mockPlayerHasPermissions.mockImplementation((eosID, perms) => {
      if (perms.includes(AdminPerms.Reserve)) {
        return eosID === 'player2';
      }
      return false;
    });

    const sortedRequests = sortRequests(requests, mockPlayerHasPermissions);

    expect(sortedRequests).toEqual([
      { eosID: 'player2', date: new Date('2023-01-02') }, // Player with Reserve comes first
      { eosID: 'player1', date: new Date('2023-01-01') },
      { eosID: 'player3', date: new Date('2023-01-03') },
    ]);
  });

});
