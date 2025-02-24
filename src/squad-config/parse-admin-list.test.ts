import { expect, it } from 'vitest';
import { ServerConfigFile } from './use-squad-config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { parseAdminList } from './parse-admin-list';

// Directory containing test data
const testDataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '_test-data');
const fetchTestFile = (file: string) =>
  fs.promises.readFile(path.join(testDataDir, `${file}.cfg`), 'utf8');

it('correctly parse', async () => {
  expect(parseAdminList(await fetchTestFile(ServerConfigFile.Admins))).toEqual({
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
        permissions: [
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
        permissions: [
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
