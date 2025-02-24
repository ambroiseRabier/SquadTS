<div align="center">

<img src="assets/squadts-logo-white.png#gh-dark-mode-only" alt="Logo" width="500"/>
<img src="assets/squadts-logo.png#gh-light-mode-only" alt="Logo" width="500"/>

#### SquadTS

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

## Docker ( has yet to be confirmed ok :) )

Running SquadTS in docker is for advanced user.

If you are using docker, there is a `.dockerfile` you can use without downloading anything else.

```shell
# Say the directory you want logs/config/plugins is C:\SquadTS or /c/SquadTS
# Make sure to use forward slashes `/` and not `\`
# Assume you are running this command from the same folder as where you downloaded .dockerfile,
# if not update the path.
# Tag container SquadTS
docker run -f .dockerfile -t SquadTS \
  # Choose between release candidate main branch (latest change, but less stable) or release:
  # - release candidate: 'https://github.com/AmbroiseRabier/SquadTS/archive/refs/heads/main.zip'
  # - release: 'https://github.com/AmbroiseRabier/SquadTS/archive/refs/tags/v1.0.0.zip'
  # If you use release, make sure to update version number `v1.0.0` to the latest version.
  -e ZIP_URL="https://github.com/AmbroiseRabier/SquadTS/archive/refs/heads/main.zip"
  -e SQUAD_TS_CONFIG_PATH="./my-config" # relative path
  -v "C:/SquadTS/logs:/app/SquadTS/logs"
  -v "C:/SquadTS/my-config:/app/SquadTS/my-config"
  -v "C:/SquadTS/plugins:/app/SquadTS/plugins" # If you add any plugin, make sure it is compatible with SquadTS version
```

```shell
# If you add or update an external plugin not shipped by default with SquadTS
# It is recommended to at least check if it pass type check.
docker run SquadTS npm run typecheck
```

## Dev

### Setup

If you are a beginner coder, following "Install and Run" steps and using an IDE like **Webstorm** (recommended) or **VSCode**
is enough to get your started. Everything is written in TypeScript, which is a superset of JavaScript.

If you have some more knowledge, I recommend these steps:

1. Install Git.
2. NodeJS 22 LTS, recommended with NVM (node version manager).
3. Clone the project with git.
4. Use git bash and install node dependencies.
5. Use an IDE like Webstorm (free) or VSCode (free)
6. Finish reading \*_dev_ section.

### Generate a plugin base

Get started fast and avoid boilerplate code with:
`npm run generate-plugin auto-kick-unassigned` will generate `auto-kick-unassigned` base files inside `"plugins"` folder.

The generated files will include documentation and examples.

### Tests

The project uses Vitest, Vitest does not typecheck which greatly enhance speed of running test.
When developing, you should make use of your IDE, and may also confirm typing with `npm run typecheck`.
Since Vitest does not typecheck, you may run into strange issues if your typing is wrong and you run tests.
Vitest has almost the same API as the more popular Jest, keep that in mind if you need to learn vitest.

You have two type of tests available, unit test, and e2e (end-to-end) test.
For example `switch-command` plugin showcase the plugin tested with unit test, mocking every dependencies
of the plugin. While `heli-crash-broadcast` showcase e2e test, creating a real SquadTS server but with log reader (ftp)
and rcon mocked.

It is likely easier to use e2e tests for your plugins, in any case, if your plugin is complicated, you may split it
in multiples files and make unit test on smaller parts to help with developement.

#### Get test data

Best is to get real data from a live server, just run SquadTS with the appropriate logger configuration.

You also have examples logs and RCON responses in tests files.

But be careful when modifying logs. Small stuff like an extra space may break your expected plugin output,
and be hard to detect, for example:

```
// This one is incorrect !
'[2025.01.27-22.23.56:380][439]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player: -TWS- Yuca KillingDamage=199.097168 from BP_PlayerController_C_2130401015 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860b2 steam: 76561198016942072 | Controller ID: BP_PlayerController_C_2130401015) caused by BP_Soldier_RU_Pilot_C_2130397914'

// This one is correct !
'[2025.01.27-22.23.56:380][439]LogSquadTrace: [DedicatedServer]ASQSoldier::Wound(): Player:-TWS- Yuca KillingDamage=199.097168 from BP_PlayerController_C_2130401015 (Online IDs: EOS: 0002a10186d9414496bf20d22d3860b2 steam: 76561198016942072 | Controller ID: BP_PlayerController_C_2130401015) caused by BP_Soldier_RU_Pilot_C_2130397914'
```

Have you seen the difference? In the real log, there is no space between `"Player:"` and the player name with clan tag `"-TWS Yuca"`. Others logs may have a space.
This will not fail, as `" -TWS Yuca"` is a valid player name with clan tag.

#### Test on live server

Most likely, if you are here, you already have access to a squad server, you may host yourself (but it will be a hassle):

- https://squad.fandom.com/wiki/Server_Installation
- https://hub.docker.com/r/cm2network/squad/

## Configuration

To avoid mistakenly commiting sensitive info like the password on git, you can put your config into dev-config folder
and add `SQUAD_TS_CONFIG_PATH="dev-config"` before running the server. `dev-config` is ignored by git.

Pre-commit hook will override everything inside config folder. Be warned.

## Pre-commit hook explained

Will test:

- Typescript typing (tsx used to run the server, by default does not check it)
- Prettier and eslint, eslint will abort commit if there is any issue, it is up to you to properly fix it.
- Generate up-to-date config, if there is any difference, commit is aborted and you should review change before re-commiting.
- Run all the tests.

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

SquadTS offer several advantages for server owner and plugins developpers:

For everyone:

- SquadTS configs are separated in multiple files for increased readability.
- Plugins configs are separated in multiple files for increased readability.
- (WIP) AdminList is fetched from RemoteAdminListHosts.cfg and Admins.cfg automatically.
- (WIP) API to fetch server config. Typed.
- SquadTS configs are commented, no more jumping between README.md and your configs files, JSON5 is used instead of JSON.
- SquadTS and plugin config is validated before usage, if your config is wrong you will know right away.
- Some performance improvements:
  - It does not download 15mb JSON from github at each startup when the file has not changed.
  - It does not call FTP dozens of time a second for the log file, by default it calls one time a second.
- Revisited plugins.
- New plugins supported by default:
  - heli-crash-broadcast
  - knife-broadcast
  - max-player-in-squad
  - auto-rejoin-team
  - ...
- Properly clean up RCON and FTP connection when process is killed (CTRL+C)

This makes it easier to develop and maintain plugins.

For plugin developers:

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
