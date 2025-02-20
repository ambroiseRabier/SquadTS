<div align="center">

<img src="assets/squadts-logo-white.png#gh-dark-mode-only" alt="Logo" width="500"/>
<img src="assets/squadts-logo.png#gh-light-mode-only" alt="Logo" width="500"/>

#### SquadJS

[![GitHub release](https://img.shields.io/github/release/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/releases)
[![GitHub contributors](https://img.shields.io/github/contributors/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/graphs/contributors)
[![GitHub release](https://img.shields.io/github/license/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/blob/master/LICENSE)

<br>

[![GitHub issues](https://img.shields.io/github/issues/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr-raw/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/pulls)
[![GitHub issues](https://img.shields.io/github/stars/AmbroiseRabier/SquadTS.svg?style=flat-square)](https://github.com/AmbroiseRabier/SquadTS/stargazers)
[![Discord](https://img.shields.io/discord/266210223406972928.svg?style=flat-square&logo=discord)](https://discord.gg/9F2Ng5C)

<br><br>

</div>

## About

SquadTS automatize moderation for Squad servers, it handles RCON and log parsing.
For your convenience SquadJS comes shipped with multiple plugins.

SquadTS is a modern rewrite of [SquadJS](https://github.com/Team-Silver-Sphere/SquadJS).

## Install and Run

1. Download and install [NodeJS 22 LTS](https://nodejs.org/en/download) (will come with NPM)
2. Download [SquadTS](https://github.com/ambroiseRabier/SquadTS/releases/latest) and unzip the download.
3. Open the unzipped folder in your terminal (e.g., cmd.exe, git bash).
4. Install node dependencies with `npm install`.
5. Customize the config in `.json5` files inside `config` folder`.
6. Start SquadTS by running `npm run start`.

## Config folder

It is recommended to use your own config folder, this will make future updates of SquadTS easier.

Config folder will be `config` by default.
If you need a different location, you can set `SQUAD_TS_CONFIG_PATH` env variable to a path relative to the project.

```shell
# Windows (cmd or git bash)
set SQUAD_TS_CONFIG_PATH="myserver-config" && npm run start

# Powershell
$env:SQUAD_TS_CONFIG_PATH = "myserver-config" && npm run start

# Linux
export SQUAD_TS_CONFIG_PATH="myserver-config" && npm run start
```

You may also use an absolute path like: `"/l/PROJECTS_3/WEB/SquadTS/myserver-config"`.

## Server configuration

Everything is detailed in comments (comments starts the line with `//`) insides each `json5` config file.
To edit `json5` files, it is recommended to use code editors like **Webstorm** or **VSCode** instead of notepad.

## Discord

If you enable plugins that use discord, make sure you provide a valid login token to the server config.

## Plugin configuration

There are two properties that will be on every plugin:

- `enabled`: Enable/Disable the plugin by settings this to `true` or `false`
- `loggerVerbosity`: Choose how verbose the plugin logger will be.

Everything is detailed in comments insides each `json5` config file.

## Config generation

You can regenerate the config with `npm run generate-config`, this will overwrite everything inside config folder.

## Docker

...

## Dev

If you are a beginner coder, following "Install and Run" steps and using an IDE like **Webstorm** (recommended) or **VSCode**
is enough to get your started. Everything is written in TypeScript, which is a superset of JavaScript.

If you have some more knowledge, I recommend these steps:

1. Install Git.
2. NodeJS 22 LTS, recommended with NVM (node version manager).
3. Clone the project with git.
4. Use git bash and install node dependencies.

5. `npm i`
6. `npm run watch`

To test on a squad server, you may host yourself (but it will be a hassle):

- https://squad.fandom.com/wiki/Server_Installation
- https://hub.docker.com/r/cm2network/squad/

To avoid mistakenly commiting sensitive info like the password on git, you can put your config into dev-config folder
and add `SQUAD_TS_CONFIG_PATH="dev-config"` before running the server. `dev-config` is ignored by git.

Pre-commit hook will override everything inside config folder. Be warned.

Prettier is executed in pre-commit hook, modifying your files. So for example `const a = "value"` will become `const a = 'value'`.
You may check your changes in pull request again. In rare case where prettier give you a worse readability you may use
`// prettier-ignore` on a statement like in `check-unbalance-switchability.test.ts`.

We only run prettier, and not `eslint --fix`. Since there are too many occasions where there is disagreement with eslint --fix.
It also give devs the occasion to learn from their mistake, and re-evaluate code, like is that non-null-assertion really safe
and documented ?
However, any issue eslint has to be fixed before commiting, as it will fail pre-commit hook. If you ignore a specific
eslint rule, make sure to add a comment explaining why, at least once in the file, unless it is extremely obvious.

### (Utility) Get output of a single RCON command

Running this will cause Squad server to disconnect others RCON connection from the same IP,
effectively closing SquadTS server if opened.

```shell
# Output in the console
npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListCommands 1

# save to a file
npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListPlayers > tmp/list-players.txt
```

## SquadTS vs SquadJS

SquadTS offer several advantages for plugin developers:

- Type safety.
- Revisited API.
- RXJS.
- Tested code\*
- Support unit test and e2e tests for plugins.
- Rewritten code in functional composition. (no `this`, no `.bind()`)
- Abstracted complexity
- Modern JS (welcome to `Map` type and much more)
- No more searching for which events exist `'NEW_GAME'`, find them statically with code completion: `server.events.newGame.subscribe(() => {});`
- Better logging, instead of `this.verbose(1, "message")` (do you know what `1` means here ?) you have `logger.info("message"); logger.warn("message")`.
- More events, and adding new ones is easy.

\*this both help understanding how SquadTS work, help you write modular change, help you test code without going live with the server, and make it harder to break.

No more `if` to check if options have been provided since config is validated ahead. And typing actually tells you which fields will be present:

```js
async function onTeamkill(info) {
  if (info.attacker && this.options.attackerMessage) {
    this.server.rcon.warn(info.attacker.eosID, this.options.attackerMessage);
  }
  if (info.victim && this.options.victimMessage) {
    this.server.rcon.warn(info.victim.eosID, this.options.victimMessage);
  }
}
```

becomes

```ts
server.events.teamKill.subscribe(async info => {
  const attackerName = info.attacker.nameWithClanTag ?? info.attacker.name ?? 'Unknown';
  logger.info(`TK Warn: ${attackerName} (eosID: ${info.attacker.eosID})`);
  // Guaranteed info.attacker and options.attackerMessage
  await server.rcon.warn(info.attacker.eosID, options.attackerMessage);
  // Guaranteed info.victim and options.victimMessage
  await server.rcon.warn(
    info.victim.eosID,
    options.victimMessage.replace('%attacker%', attackerName)
  );
});
```

For everyone:

- SquadTS configs are separated in multiple files for increased readability.
- Plugins configs are separated in multiple files for increased readability.
- SquadTS configs are commented, no more jumping between README.md and your configs files, JSON5 is used instead of JSON.
- SquadTS and plugin config is validated before usage.
- Some performance improvements like not downloading 15mb JSON from github at each startup when the file has not changed.
- Some performance improvements like not downloading FTP file dozens of time a second (todo: re-confirm)
- Controls over how often RCON is pinged for player, squad list, serverinfo, and how often new logs are downloaded.
  Default values are set to have a low response time of plugins functionnalities, but in case of performance issues
  You may change theses values in config.
- Revisited plugins like switch command (does anyone still use !bug command ?)
- New plugins like heli-crash-broadcast, knife-broadcast, max-player-in-squad, auto-rejoin-team...
- Properly clean up RCON and FTP connection when process is killed (CTRL+C)

This makes it easier to develop and maintain plugins.

Cons:

- Less live tested because it is new.
- SquadJS plugins are incompatible and need to be rewritten. Many have been rewritten partially or totally in
  plugins folder.
- Likely some missing feature, if there is anything you use and might be useful for others too, feel free to make a feature request.
- No Websocket plugin yet (if this interest you, please open a feature request)

## Statement on accuracy

Some logs do not provide eosID but only the `name`/`nameWithClanTag` of the player, SquadTS will try to find the corresponding player,
but may fail for reasons explained bellow:

### RCON update interval

SquadTS retrieve the list of player with RCON, and also listen to logs that indicate a new player joined.
Only RCON `"ListPlayers"` provide the `nameWithClanTag`, and some logs only provide `nameWithClanTag`.
If the player has not been obtained through RCON, logs with only `nameWithClanTag` will fail to find the player.
However, RCON `"ListPlayers"` update interval (that you can modify in the config), is set by default to a low interval
of 5 seconds.
This should be low enough to avoid having any logs without player.

### Duplicate player names

If there are two players with the same name, we cannot uniquely identify the player.

### Logs without player

Logs without fully identified player are rare, annoying to type, and make plugin development more complex.
So the decision has been made to not emit them, when the player is absent from the log data.

If you happen to really need those rare logs, you will need direct access to `logParser`,
I invite you to share your reasons in a feature request.

## License

As this is derived work from SquadJS, the license is the same: (Read License)[./LICENSE]
