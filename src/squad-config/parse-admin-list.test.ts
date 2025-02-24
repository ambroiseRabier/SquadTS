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
  expect(parseAdminList(await fetchTestFile(ServerConfigFile.Admins))).toEqual(
    new Map([
      ['76561198448168811', ['cheat', 'canseeadminchat']],
      ['76561197996304422', ['cheat', 'canseeadminchat']],
      ['76561198016942033', ['teamchange', 'startvote', 'reserve']],
      ['76561198814950944', ['cheat', 'canseeadminchat']],
      ['76561198814950955', ['cheat', 'canseeadminchat']],
      ['76561198814950966', ['cheat', 'canseeadminchat']],
      ['76561198814950977', ['cheat', 'canseeadminchat']],
    ])
  );
});
