import fs from 'node:fs';
import path from 'node:path';
import { Logger } from 'pino';
import { GithubWiki } from './github-layer.type';
import Layer = GithubWiki.Layer;
import { GithubWikiWeapon } from './github-weapons.type';
import WeaponInfo = GithubWikiWeapon.WeaponInfo;


const LAYER_FINISHED_JSON = {
  url: 'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json',
  savedFilename: 'finished.json'
} as const;

const WEAPON_INFO_JSON = {
  url: 'https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-weapon-and-vehicle-data/refs/heads/main/data/_currentVersion/weaponInfo.json',
  savedFilename: 'weaponInfo.json'
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

  async function loadURL({url, savedFilename}: {url: string; savedFilename: string}) {
    // Create if it doesn't exist
    await fs.promises.mkdir(savingFolder, { recursive: true })
      .catch(e => {
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
      return await fs.promises
        .readFile(path.join(savingFolder, savedFilename), 'utf-8')
        .then(file => JSON.parse(file));
    }

    if (res.status === 200) {
      const etag = res.headers.get('etag') || '';
      if (etag.length === 0) {
        logger.error(`No etag returned for ${url}, file won't be cached.`);
      }
      await fs.promises.writeFile(path.join(savingFolder, savedFilename + '.etag'), etag);
      const text = await res.text();
      await fs.promises.writeFile(path.join(savingFolder, savedFilename), text);
      return JSON.parse(text);
    }

    throw new Error(`Unexpected status code ${res.status} when loading ${url}`);
  }

  async function loadLayers() {
    const layerInfo = await loadURL(LAYER_FINISHED_JSON) as Layer;
    try {
      GithubWiki.Convert.validate(layerInfo);
    } catch (e) {
      const err = e as any;
      logger.error(
        `JSON ${LAYER_FINISHED_JSON.url} is valid JSON but expected type is different, this may have no impact or break some plugins.` +
        `Likely a SQUAD update ! An update on SquadTS will soon be available to fix this.`
      );
      logger.error(err?.message || err);
      // Even if it fails, we continue with the data we have, as it may not impact plugins at all.
    }

    return layerInfo;
  }

  async function loadWeapons() {
    const weaponInfo = await loadURL(WEAPON_INFO_JSON) as { [key: string]: WeaponInfo };
    try {
      GithubWikiWeapon.Convert.validate(weaponInfo);
    } catch (e) {
      const err = e as any;
      logger.error(
        `JSON ${WEAPON_INFO_JSON.url} is valid JSON but expected type is different, this may have no impact or break some plugins.` +
        `Likely a SQUAD update ! An update on SquadTS will soon be available to fix this.`
      );
      logger.error(err?.message || err);
      // Even if it fails, we continue with the data we have, as it may not impact plugins at all.
    }

    return weaponInfo;
  }

  async function load() {
    return {
      layerInfo: await loadLayers(),
      weaponInfo: await loadWeapons(),
    }
  }

  return await load();
}
