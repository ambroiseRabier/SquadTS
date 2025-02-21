import { Logger } from 'pino';
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
  Mocked,
  Mock,
  MockedFunction,
} from 'vitest';
import { useAdminList } from './use-admin-list';
import { AdminPerms } from './permissions';

const validResponse = `
Group=Admin:balance,ban,chat
Group=Moderator:balance,kick
Admin=76561198814495511:Admin
Admin=76561198814495512:Admin
Admin=76561198814495521:Moderator // comment
Admin=76561198814495522:Moderator
`;

// Note: mostly IA generated, maybe that's too much tests
describe('useAdminList', () => {
  let logger: Mocked<Logger>;
  const originalFetch = global.fetch; // Save the original fetch

  beforeAll(() => {
    // Save the original fetch before mocking to restore it later
    global.fetch = vi.fn<typeof global.fetch>();
  });

  afterAll(() => {
    // Restore the original fetch after tests are complete
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // Mock the logger
    logger = {
      info: vi.fn().mockImplementation(message => console.log(message)),
      // We don't want to resort to debugging everytime something fail, if possible.
      error: vi.fn().mockImplementation(message => console.error(message)),
      warn: vi.fn().mockImplementation(message => console.warn(message)),
      debug: vi.fn().mockImplementation(message => console.log(message)),
      // Add other methods if necessary
    } as unknown as Mocked<Logger>;

    // Reset mocks
    (global.fetch as Mock).mockReset();
  });

  it('should return completed adminList', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch, admins } = useAdminList(logger, mockOptions);

    // Simulate fetch returning a valid response
    (global.fetch as MockedFunction<typeof global.fetch>).mockResolvedValueOnce({
      ok: true,
      text: vi.fn<() => Promise<string>>().mockResolvedValueOnce(validResponse),
    } as Partial<Response> as any);

    const r = await fetch();

    expect(Object.fromEntries(r)).toEqual({
      '76561198814495511': ['balance', 'ban', 'chat'],
      '76561198814495512': ['balance', 'ban', 'chat'],
      '76561198814495521': ['balance', 'kick'],
      '76561198814495522': ['balance', 'kick'],
    });
    expect(admins).toEqual(r);
  });

  it('should log info when fetching admin list starts', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Simulate fetch returning a valid response
    (global.fetch as MockedFunction<any>).mockResolvedValueOnce({
      ok: true,
      text: vi.fn<() => Promise<string>>().mockResolvedValueOnce(validResponse),
    });

    await fetch();

    expect(logger.info).toHaveBeenNthCalledWith(1, 'Fetching 1 admin list...');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'Fetching http://example.com/admin.cfg');
    expect(logger.info).toHaveBeenNthCalledWith(3, 'Admin list fetched. 4 admins found.');
  });

  it('should handle HTTP errors correctly', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Simulate fetch returning an HTTP error
    (global.fetch as MockedFunction<any>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await fetch();

    expect(logger.error).toHaveBeenCalledWith('HTTP error! Status: 404 Not Found');
  });

  it('should handle fetch failure errors', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Simulate fetch failing
    (global.fetch as MockedFunction<any>).mockRejectedValueOnce(new Error('Network Error'));

    await fetch();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch http://example.com/admin.cfg. Error: Network Error',
      expect.any(Error)
    );
  });

  it('should log an error if the response text is empty', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Simulate fetch returning an empty response
    (global.fetch as MockedFunction<any>).mockResolvedValueOnce({
      ok: true,
      text: vi.fn<() => Promise<string>>().mockResolvedValueOnce(''),
    });

    await fetch();

    expect(logger.error).toHaveBeenCalledWith('Received admin.cfg is empty!');
  });

  it('should log a warning if an admin is being overridden', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg', 'http://example2.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Somewhat hacky way to send two different requests
    let index = 0;
    const mockReq: any = () => {
      return {
        ok: true,
        text: vi.fn<() => Promise<string>>().mockResolvedValue(
          [
            `
Group=Admin:balance,ban,chat
Admin=76561198814495531:Admin
      `,
            `
Group=Moderator:balance,kick
Admin=76561198814495531:Moderator
      `,
          ][index++]
        ),
      };
    };

    // Mock the `parseAdminCFG` function to simulate admins being overridden
    (global.fetch as MockedFunction<any>).mockResolvedValue(mockReq());

    await fetch();

    expect(logger.warn).toHaveBeenCalledWith(
      '76561198814495531 is already in admin list. Overriding with new permissions.'
    );
  });

  it('should handle parsing errors properly', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch } = useAdminList(logger, mockOptions);

    // Simulate fetch returning invalid content
    (global.fetch as MockedFunction<any>).mockResolvedValueOnce({
      ok: true,
      text: vi.fn<() => Promise<string>>().mockResolvedValueOnce('Invalid admin config'),
    });

    await fetch();

    expect(logger.error).toHaveBeenCalledWith('Failed to parse admin.cfg! No groups found.');
  });

  it('getAdminsWithPermissions', async () => {
    const mockOptions = {
      remote: ['http://example.com/admin.cfg'],
    };

    const { fetch, getAdminsWithPermissions } = useAdminList(logger, mockOptions);

    // Simulate fetch returning a valid response
    (global.fetch as MockedFunction<typeof global.fetch>).mockResolvedValueOnce({
      ok: true,
      text: vi.fn<() => Promise<string>>().mockResolvedValueOnce(validResponse),
    } as Partial<Response> as any);

    // Update cached admin list.
    await fetch();

    expect(getAdminsWithPermissions([AdminPerms.Ban])).toEqual([
      ['76561198814495511', ['balance', 'ban', 'chat']],
      ['76561198814495512', ['balance', 'ban', 'chat']],
    ]);
    expect(getAdminsWithPermissions([AdminPerms.Balance])).toEqual([
      ['76561198814495511', ['balance', 'ban', 'chat']],
      ['76561198814495512', ['balance', 'ban', 'chat']],
      ['76561198814495521', ['balance', 'kick']],
      ['76561198814495522', ['balance', 'kick']],
    ]);
  });
});
