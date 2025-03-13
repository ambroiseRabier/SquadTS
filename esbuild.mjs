import * as esbuild from 'esbuild';
import fs from 'node:fs';

const plugins = fs.readdirSync('./plugins').map(
  file => `./plugins/${file}/${file}.ts`
);
const pluginConfigs = fs.readdirSync('./plugins').map(
  file => `./plugins/${file}/${file}.config.ts`
);

await esbuild.build({
  entryPoints: ['./src/index.mts', ...plugins, ...pluginConfigs],
  splitting: true, // require format esm, avoid duplicating dependencies for plugins.
  bundle: true,
  outdir: 'build',
  platform: 'node',
  format: 'esm', // or define
  // define: {
  //   'import.meta.url': JSON.stringify(\'file://\' + __filename), // Simulates import.meta.url
  // }
  sourcemap: true,
  // minify: true
  // external ? plugins ? bundle tsx ? :// ?
  external: [
    'cpu-features', // Use .node files
    'ssh2', // Use .node files
    'pino', // dynamic call to node:os
    'tail', // dynamic call to events
    'basic-ftp', // dynamic call to fs
    'ssh2-sftp-client', // dynamic call to ssh2
    'discord.js', // dynamic cal to node:events
    'esbuild', // bundling itself 🤨
  ]
});

// doc: https://esbuild.github.io/api/

// npm run build
// export SQUAD_TS_CONFIG_PATH="SquadTS/dev-config" && node build/index.js
/*

export SQUAD_TS_CONFIG_PATH="../dev-config" && \
export PROJECT_ROOT="L:\PROJECTS_3\WEB\SquadTS\build" && node build/index.js

* */

// relative path is somewhat unexpected.

// no splitting plugins
// $ export SQUAD_TS_CONFIG_PATH="../dev-config" && export PROJECT_ROOT="L:\PROJECTS_3\WEB\SquadTS\build" && node build/index.js

// with splitting and plugins
// $ export SQUAD_TS_CONFIG_PATH="../dev-config" && export PROJECT_ROOT="L:\PROJECTS_3\WEB\SquadTS\build" && node build/srcindex.js
// with pino js file in src folder

// $ export SQUAD_TS_CONFIG_PATH="../dev-config" && export IS_ESBUILD=1 && node build/src/index.js
