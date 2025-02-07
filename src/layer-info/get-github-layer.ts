import { GithubWiki } from './github-layer.type';

// todo 15mb, download only once ? ask IA how I would detect that it is outdated, without downloading it again
export async function getLayerGithub(): Promise<GithubWiki.Layer> {
  const res = await fetch('https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json')
  return await res.json();
}
