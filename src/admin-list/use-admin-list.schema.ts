import { z } from 'zod';

export const adminListOptionsSchema = z
  .object({
    remote: z
      .array(z.string().url())
      .describe(
        'List of URLs that will return a properly formatted text on GET request.\n' +
          'e.g http://www.example-my-squad-server.fr/whitelist'
      ),
  })
  .describe(
    'Where to get the list of admins. Format should follow Admins.cfg file:\n' +
      'https://squad.fandom.com/wiki/Server_Configuration#Admins.cfg'
  );

export type AdminListConfig = z.infer<typeof adminListOptionsSchema>;
