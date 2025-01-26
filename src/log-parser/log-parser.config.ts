import { z } from 'zod';
import fs from 'node:fs';
import { ipv4Schema } from '../config/common-validators';

const isValidFilePath = (filePath: string) => {
  try {
    // Use path and fs modules to check if it's a valid path
    return fs.existsSync(filePath); // Ensure the file path exists
  } catch {
    return false;
  }
}

const fetchIntervalSchema = z
  .number()
  .int()
  .default(1000) // todo: voir readme, faut retravailler ftp-tail
  .describe("The interval in milliseconds to fetch new logs. If you come from SquadJS, default is 0ms (that means your FTP server is called as fast as SquadJS/SquadTS can do), this seems unnecessary often.")

const maxTempFileSizeSchema = z
  .number()
  .int()
  .default(5 * 1000 * 1000)
  .describe("The maximum temporary file size in bytes. (probably leave default ?)")

export const logParserSchema = z.object({
  logFile: z
    .string()
    .nonempty()
    .refine(isValidFilePath, "Invalid file path. File does not exist.")
    .describe(`The folder where your Squad logs are saved. e.g "C:/servers/squad_server/SquadGame/Saved/Logs"`),
  ftp: z.object({
    host: ipv4Schema,
    port: z
      .number()
      .int()
      .default(21),
    username: z
      .string()
      .nonempty(),
    password: z
      .string(),
    fetchInterval: fetchIntervalSchema,
    maxTempFileSize: maxTempFileSizeSchema,
  }).describe("FTP configuration for reading logs remotely."),
  sftp: z.object({
    host: ipv4Schema,
    port: z
      .number()
      .int()
      .default(22),
    username: z
      .string()
      .nonempty(),
    password: z
      .string(),
    fetchInterval: fetchIntervalSchema,
    maxTempFileSize: maxTempFileSizeSchema,
  }).describe("SFTP configuration for reading logs remotely."),
  mode: z
    .enum(['tail','sftp', 'ftp'])
    .default('ftp')
    .describe(`If you use a hosted server like awn.gg, you should use ftp or sftp, if the server run locally, use tail:
- "tail" will read from a local log file
- "ftp" will read from a remote log file using the FTP protocol 
- "sftp" will read from a remote log file using the SFTP protocol`),
});

export type LogParserConfig = z.infer<typeof logParserSchema>;
