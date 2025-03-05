import fs from 'node:fs';
import path from 'node:path';
import { Logger } from 'pino';
import { GithubWiki } from './github-layer.type';
import { GithubWikiWeapon } from './github-weapons.type';
import { decode, encode } from '@msgpack/msgpack';
import { GITHUB_INFO_CACHE } from '../config/path-constants.mjs';
import Layer = GithubWiki.Layer;
import WeaponInfo = GithubWikiWeapon.WeaponInfo;

/*
 * About msgpack vs JSON.stringify:
 * msgpack has no impact on loading time of the file,
 * But reduces the overall size from 17.7mo to 13mo,
 * And mspack is a few dozens of ko large in prod (however: 700ko in node_modules)
 * Conclusion: useful but not a big deal.
 */

/*
 * About type validation of received JSON files.
 * Validation for both big JSON files, is extremely long and takes around 4 seconds.
 * We cache the result of the validation, and only retry when either the file has changed on remote
 * or when the validation has failed once in another run of SquadTS.
 * So that validation will be retried until SquadTS fix the issue. (file may not change on remote,
 * but SquadTS may changes locally on git pull)
 */

const LAYER_FINISHED_JSON = {
  url: 'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json',
  savedFilename: 'finished.msgpack',
} as const;

const WEAPON_INFO_JSON = {
  url: 'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-weapon-and-vehicle-data/refs/heads/main/data/_currentVersion/weaponInfo.json',
  savedFilename: 'weaponInfo.msgpack',
} as const;

export async function retrieveGithubInfo(savingFolder: string, logger: Logger) {
  async function loadStoredEtag(fileName: string) {
    const filePath = path.join(savingFolder, fileName + '.etag');
    try {
      return await fs.promises.readFile(filePath, 'utf-8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return '';
      } else {
        throw e;
      }
    }
  }

  async function loadURL({ url, savedFilename }: { url: string; savedFilename: string }) {
    // Create if it doesn't exist
    await fs.promises.mkdir(savingFolder, { recursive: true }).catch(e => {
      if (e.code !== 'EEXIST') {
        throw e;
      }
    });

    // Load saved ETag if exist
    const storedEtag = await loadStoredEtag(savedFilename);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'If-None-Match': storedEtag,
      },
    });

    if (res.status === 304) {
      logger.info(`File ${savedFilename} has not changed. Using cached version.`);
      return await fs.promises.readFile(path.join(savingFolder, savedFilename)).then(file => ({
        fromCache: true,
        data: decode(file),
      }));
    }

    if (res.status === 200) {
      const etag = res.headers.get('etag') || '';
      if (etag.length === 0) {
        logger.error(`No etag was returned for ${url}, file won't be cached.`);
      }
      await fs.promises.writeFile(path.join(savingFolder, savedFilename + '.etag'), etag);

      const json = await res.json();
      await fs.promises.writeFile(path.join(savingFolder, savedFilename), encode(json));
      return { fromCache: false, data: json };
    }

    throw new Error(`Unexpected status code ${res.status} when loading ${url}`);
  }

  async function loadLayers() {
    const { data: layerInfo, fromCache } = (await loadURL(LAYER_FINISHED_JSON)) as {
      fromCache: boolean;
      data: Layer;
    };

    // Cached change or first time, or last time we checked it was invalid
    if (!fromCache || validationStatus.layerInfo !== 'valid') {
      let hasError = false;
      try {
        GithubWiki.Convert.validate(layerInfo);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        hasError = true;
        logger.error(
          `JSON ${LAYER_FINISHED_JSON.url} is valid JSON but expected type is different, this may have no impact or break some plugins. ` +
            'Likely a SQUAD update ! An update on SquadTS will soon be available to fix this. '
        );
        logger.error(e?.message || e);
        // Even if it fails, we continue with the data we have, as it may not impact plugins at all.
        validationStatus.layerInfo = e?.message ?? 'invalid';
      }
      if (!hasError) {
        validationStatus.layerInfo = 'valid';
      }
    }

    return layerInfo;
  }

  async function loadWeapons() {
    const { data: weaponInfo, fromCache } = (await loadURL(WEAPON_INFO_JSON)) as {
      fromCache: boolean;
      data: Record<string, WeaponInfo>;
    };

    // Cached change or first time, or last time we checked it was invalid
    if (!fromCache || validationStatus.weapons !== 'valid') {
      let hasError = false;
      try {
        GithubWikiWeapon.Convert.validate(weaponInfo);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        hasError = true;
        logger.error(
          `JSON ${WEAPON_INFO_JSON.url} is valid JSON but expected type is different, this may have no impact or break some plugins. ` +
            'Likely a SQUAD update ! An update on SquadTS will soon be available to fix this. '
        );
        logger.error(e?.message ?? e);
        // Even if it fails, we continue with the data we have, as it may not impact plugins at all.
        validationStatus.weapons = e?.message ?? 'invalid';
      }
      if (!hasError) {
        validationStatus.weapons = 'valid';
      }
    }

    return weaponInfo;
  }

  // We have to save the valid check somewhere between runs, or the error message will appear once
  // and 99% will ignore and not report until something else breaks. (me included let's be honest)
  // If the error appears each time, it should trigger questions.
  const validationStatusPath = path.join(GITHUB_INFO_CACHE, 'validation-status.json');
  let validationStatus: {
    layerInfo: string | undefined;
    weapons: string | undefined;
  } = {
    layerInfo: undefined,
    weapons: undefined,
  };

  async function load() {
    if (fs.existsSync(validationStatusPath)) {
      validationStatus = JSON.parse(fs.readFileSync(validationStatusPath, 'utf-8'));
    }

    const obj = {
      layerInfo: await loadLayers(),
      weaponInfo: await loadWeapons(),
    };

    fs.writeFileSync(validationStatusPath, JSON.stringify(validationStatus, null, 2), 'utf-8');

    return obj;
  }

  return await load();
}
