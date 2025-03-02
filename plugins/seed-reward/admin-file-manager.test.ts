import { describe, it, expect, vi } from 'vitest';
import { useAdminFileManager } from './admin-file-manager';

describe('admin-file-manager', () => {
  const baseAdminsContent = `
// Some comments
Group=Admin:changemap,pause,cheat,private,balance,chat,kick,ban,config
Group=Moderator:chat,kick

Admin=76561198016942077:Admin // Some admin
Admin=76561198448168811:Moderator // Some moderator
`.trim();

  it('should add a new whitelist with group', async () => {
    const mockFetch = vi.fn().mockResolvedValue(baseAdminsContent);
    const mockUpload = vi.fn();

    const adminManager = useAdminFileManager(mockFetch, mockUpload);

    await adminManager.updateOrAddWhitelist(
      '76561198123456789',
      '[ABC] Player',
      new Date('2024-03-20')
    );

    expect(mockUpload).toHaveBeenCalledOnce();
    // Better Webstorm support instead of toHaveBeenCalledOnceWith :/
    expect(mockUpload.mock.calls[0][0]).toEqual(
      `
// Some comments
Group=Admin:changemap,pause,cheat,private,balance,chat,kick,ban,config
Group=Moderator:chat,kick
Group=SeedRewardPlugin:reserve // Auto-generated group for seed rewards

Admin=76561198016942077:Admin // Some admin
Admin=76561198448168811:Moderator // Some moderator
Admin=76561198123456789:SeedRewardPlugin // Seed reward for [ABC] Player (expires 20 Mar 2024)
`.trim()
    );
  });

  it('should update existing whitelist expiry', async () => {
    const existingContent = `
${baseAdminsContent}
Group=SeedRewardPlugin:reserve // Auto-generated group for seed rewards
Admin=76561198123456789:SeedRewardPlugin // Seed reward for [ABC] Player (expires 20 Mar 2024)
`.trim();

    const mockFetch = vi.fn().mockResolvedValue(existingContent);
    const mockUpload = vi.fn();

    const adminManager = useAdminFileManager(mockFetch, mockUpload);

    await adminManager.updateOrAddWhitelist(
      '76561198123456789',
      '[ABC] Player',
      new Date('2024-04-20')
    );

    expect(mockUpload).toHaveBeenCalledTimes(1);
    const newContent = mockUpload.mock.calls[0][0];

    // Group should not be duplicated
    expect(newContent.match(/Group=SeedRewardPlugin/g)?.length).toBe(1);
    // Whitelist should be updated with new date
    expect(newContent).toContain(
      'Admin=76561198123456789:SeedRewardPlugin // Seed reward for [ABC] Player (expires 20 Apr 2024)'
    );
    // Original content should be preserved
    expect(newContent).toContain('Admin=76561198016942077:Admin // Some admin');
  });

  it('should remove multiple whitelists', async () => {
    const existingContent = `
${baseAdminsContent}
Group=SeedRewardPlugin:reserve // Auto-generated group for seed rewards
Admin=76561198123456789:SeedRewardPlugin // Seed reward for [ABC] Player (expires 20 Mar 2024)
Admin=76561198987654321:SeedRewardPlugin // Seed reward for [XYZ] Player (expires 21 Mar 2024)
`.trim();

    const mockFetch = vi.fn().mockResolvedValue(existingContent);
    const mockUpload = vi.fn();

    const adminManager = useAdminFileManager(mockFetch, mockUpload);

    await adminManager.removeWhitelists(['76561198123456789', '76561198987654321']);

    expect(mockUpload).toHaveBeenCalledTimes(1);
    const newContent = mockUpload.mock.calls[0][0];

    // Whitelists should be removed
    expect(newContent).not.toContain('76561198123456789');
    expect(newContent).not.toContain('76561198987654321');
    // Group definition should remain
    expect(newContent).toContain('Group=SeedRewardPlugin:reserve');
    // Original content should be preserved
    expect(newContent).toContain('Admin=76561198016942077:Admin // Some admin');
  });
});
