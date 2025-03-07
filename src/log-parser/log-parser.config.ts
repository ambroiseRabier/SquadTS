import { z } from 'zod';
import fs from 'node:fs';
import { ipv4Schema } from '../config/common-validators';

const isValidLocalFilePath = (filePath: string) => {
  try {
    // Use path and fs modules to check if it's a valid path
    return fs.existsSync(filePath); // Ensure the file path exists
  } catch {
    return false;
  }
};

const isValidLocalDirectory = (dirPath: string) => {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
};

const fetchIntervalSchema = z
  .number()
  .int()
  .default(1000)
  .describe(
    'The interval in milliseconds to fetch new logs. If you come from SquadJS, \n' +
      'default is 0ms (that means your FTP server is called as fast as SquadJS/SquadTS can do), this seems unnecessary often.\n' +
      'Fetching logs will never overlap, meaning if you set 0ms, it will go as fast as possible.\n' +
      'This will give better reaction time to the plugins, but will also make the server more CPU intensive.\n' +
      'It is likely ok to set it to 5000ms or 10000ms.'
  );

// Note: Compare to SquadJS, maxTempFileSize was badly name, as actually, it only is used on first tail,
// after that, if you have for example, a 30min disconnect, even if the file to download is 80mb it will do it.
const initialTailSizeSchema = z
  .number()
  .int()
  .default(5 * 1000 * 1024)
  .describe('Initial tail size in bytes. Default is 5MB. This is only used when SquadTS start.');

const logFileSchema = z
  .string()
  .nonempty()
  .describe(
    'The file where your Squad logs are saved. e.g., "C:/servers/squad_server/SquadGame/Saved/Logs/SquadGame.log" or "/SquadGame/Saved/Logs/SquadGame.log"'
  );

// config dirin log parser :/ code smell
const configDirSchema = z
  .string()
  .nonempty()
  .describe(
    'Path to the squad server config folder. e.g., "C:/servers/squad_server/SquadGame/ServerConfig"'
  );

const ftpSchema = z
  .object({
    host: z.union([ipv4Schema, z.literal('localhost')]),
    port: z.number().int().default(21).describe('FTP server port usually is 21. SFTP is 22.'),
    username: z.string().nonempty(),
    password: z.string(),
    fetchInterval: fetchIntervalSchema,
    initialTailSize: initialTailSizeSchema,
  })
  .describe('FTP or SFTP configuration for reading logs remotely.');

// Discriminated Union for the `mode` field
export const logParserOptionsSchema = z.discriminatedUnion('mode', [
  // Place FTP as first item, because zod-empty will only take first element of discriminatedUnion,
  // Meaning that the documentation (`describe()`) should be placed on first element.
  z.object({
    mode: z.literal('ftp')
      .describe(`If you use a hosted server like awn.gg, you should use ftp or sftp, if the server run locally, use tail:
- "tail" will read from a local log file
- "ftp" will read from a remote log file using the FTP protocol 
- "sftp" will read from a remote log file using the SFTP protocol`),
    logFile: logFileSchema,
    configDir: configDirSchema,
    ftp: ftpSchema, // FTP required when mode is "ftp" or "sftp"
  }),
  z.object({
    mode: z.literal('sftp'),
    logFile: logFileSchema,
    configDir: configDirSchema,
    ftp: ftpSchema, // FTP required when mode is "ftp" or "sftp"
  }),
  z.object({
    mode: z.literal('tail'),
    configDir: configDirSchema.refine(
      isValidLocalDirectory,
      'Invalid local directory path. Directory should exist.'
    ),
    logFile: logFileSchema.refine(
      isValidLocalFilePath,
      'Invalid local file path. File should exist in "tail" mode.'
    ),
  }),
]);

export type LogParserConfig = z.infer<typeof logParserOptionsSchema>;
