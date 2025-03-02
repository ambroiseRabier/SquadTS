import path from 'node:path';
import { PROJECT_ROOT } from './config/path-constants.mjs';
import { readFileSync } from 'node:fs';
import { Logger } from 'pino';

interface GitInfo {
  hash: string;
  message: string;
  date: string;
}

export function logGitVersion(logger: Logger): void {
  const gitInfoPath = path.join(PROJECT_ROOT, './git-info.json');

  try {
    const gitInfo: GitInfo = JSON.parse(readFileSync(gitInfoPath, 'utf-8'));
    logger.info(
      `Git version: ${gitInfo.hash} - ${gitInfo.message.substring(0, 75)}${gitInfo.message.length > 75 ? '...' : ''}`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.warn(
      `Could not load git version info (Running \`npm run postinstall\` should fix it): ${error?.message}`
    );
  }
}
