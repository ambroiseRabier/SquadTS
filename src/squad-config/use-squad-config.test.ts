import { beforeAll, describe, expect, it } from 'vitest';
import { useSquadConfig } from './use-squad-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// Directory containing test data
const testDataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '_test-data');

describe('useSquadConfig', async () => {
  let squadConfig: ReturnType<typeof useSquadConfig>;

  beforeAll(() => {
    squadConfig = useSquadConfig(file =>
      fs.promises.readFile(path.join(testDataDir, `${file}.cfg`), 'utf8')
    );
  });

  it('admins', async () => {
    expect(await squadConfig.fetch.admins()).toEqual({
      admins: [
        {
          comment: '[TWS] alex    @alex#1323',
          role: 'HaveFun',
          steamID: '76561198448168811',
        },
        {
          comment: 'extra space ignored',
          role: 'HaveFun',
          steamID: '76561197996304422',
        },
        {
          comment: 'no space',
          role: 'SuperAdmin',
          steamID: '76561198016942033',
        },
        {
          comment: '',
          role: 'HaveFun',
          steamID: '76561198814950944',
        },
        {
          comment: '',
          role: 'HaveFun',
          steamID: '76561198814950955',
        },
        {
          comment: '',
          role: 'HaveFun',
          steamID: '76561198814950966',
        },
        {
          comment: 'gluedcomment',
          role: 'HaveFun',
          steamID: '76561198814950977',
        },
      ],
      groups: [
        {
          rights: [
            'teamchange',
            'startvote',
            'reserve',
            'private',
            'pause',
            'kick',
            'immune',
            'forceteamchange',
            'featuretest',
            'demos',
            'debug',
            'clientdemos',
            'cheat',
            'chat',
            'changemap',
            'canseeadminchat',
            'cameraman',
            'ban',
            'balance',
          ],
          role: 'HaveFun',
        },
        {
          rights: [
            'teamchange',
            'startvote',
            'reserve',
            'private',
            'pause',
            'manageserver',
            'kick',
            'forceteamchange',
            'featuretest',
            'demos',
            'debug',
            'config',
            'clientdemos',
            'cheat',
            'chat',
            'changemap',
            'canseeadminchat',
            'cameraman',
            'ban',
            'balance',
          ],
          role: 'SuperAdmin',
        },
      ],
    });
  });
});
