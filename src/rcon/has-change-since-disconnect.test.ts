import { describe, it, expect } from 'vitest';
import { hasChangesIgnoringSinceDisconnect } from './has-change-since-disconnect';


describe('hasChangeSinceDisconnect', () => {
  it('Ignore since disconnect', () => {
    const str1 = `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Since Disconnect: 03m.24s | Name:  Yuca`;

    const str2 = `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Since Disconnect: 02m.11s | Name:  Yuca`;

    expect(hasChangesIgnoringSinceDisconnect(str1, str2)).toEqual(false);
  });
  it('React to change', () => {
    const str1 = `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----`;

    const str2 = `----- Active Players -----
----- Recently Disconnected Players [Max of 15] -----
ID: 0 | Online IDs: EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077 | Since Disconnect: 02m.11s | Name:  Yuca`;

    expect(hasChangesIgnoringSinceDisconnect(str1, str2)).toEqual(true);
  });
})
