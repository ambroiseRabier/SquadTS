/**
 * Write information about which version of the project is being used to a file.
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { dirname } from 'path';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface GitInfo {
  hash: string;
  message: string;
  date: string;
}

// Path to store git info
const gitInfoPath = path.join(dirname(fileURLToPath(import.meta.url)), '../git-info.json');

/**
 * Check if Git is available on the system
 */
function isGitAvailable(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: unknown) {
    return false;
  }
}

/**
 * Write Git info or fallback to a default "unknown" state
 */
function writeGitInfo(): void {
  let gitInfo: GitInfo;

  if (isGitAvailable()) {
    try {
      const hash = execSync('git rev-parse HEAD').toString().trim();
      const message = execSync('git log -1 --pretty=%s').toString().trim();
      const date = execSync('git log -1 --pretty=%ci').toString().trim();
      gitInfo = { hash, message, date };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(`Error retrieving git info: ${error?.message}`);
      console.error(error);
      gitInfo = {
        hash: 'unknown hash',
        message: 'Error retrieving git info',
        date: 'unknown date',
      };
    }
  } else {
    console.warn('Git not found. Skipping git info generation...');
    gitInfo = { hash: 'unknown hash', message: 'Git not available', date: 'unknown date' };
  }

  try {
    writeFileSync(gitInfoPath, JSON.stringify(gitInfo, null, 2));
    console.log('Git info written to git-info.json');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`Error writing git info to file: ${error?.message}`);
    console.error(error);
  }
}

writeGitInfo();
