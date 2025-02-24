import { ObjectFromRegexStr } from '../log-parser/log-parser-helpers';
import { AdminPermsValues } from '../admin-list/permissions';

export type AdminList = ReturnType<typeof parseAdminList>;

export function parseAdminList(str: string) {
  const perLine = str
    .split('\n')
    .map(line => line.trim())
    .filter(line => !line.startsWith('//')); // ignore comments

  return {
    admins: perLine
      .map(line => {
        const adminLine =
          '^Admin=(?<steamID>\\d+)+:(?<role>.\\w+)(:?\\ *\\/\\/\\ *)?(?<comment>.*)$';
        const matchAdmin = line.match(adminLine);

        if (matchAdmin) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          return matchAdmin.groups! as ObjectFromRegexStr<typeof adminLine>;
        } else {
          return null;
        }
      })
      .filter((obj): obj is NonNullable<typeof obj> => !!obj),
    groups: perLine
      .map(line => {
        // Praying group role is properly formatted in server config .-.
        const groupLine = '^Group=(?<role>\\w+)+:(?<permissions>[\\w,]+)';
        const matchGroup = line.match(groupLine);

        if (matchGroup) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const obj = matchGroup.groups! as ObjectFromRegexStr<typeof groupLine>;
          return {
            ...obj,
            permissions: obj.permissions.split(',') as AdminPermsValues[],
          };
        }
      })
      .filter((obj): obj is NonNullable<typeof obj> => !!obj),
  };
}
