
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

1. `npm i`
2. `npm run watch`

To test on a squad server, you may host yourself (but it will be a hassle):

- https://squad.fandom.com/wiki/Server_Installation
- https://hub.docker.com/r/cm2network/squad/

To avoid mistakenly commiting sensitive info like the password on git, you can put your config into dev-config folder
and add `SQUAD_TS_CONFIG_PATH="dev-config"` before running the server. `dev-config` is ignored by git.

### (Utility) Get output of a single RCON command

```shell
# Output in the console
npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListCommands 1

# save to a file
npx tsx scripts/rcon-execute.ts ./dev-config/rcon.json5 ListPlayers > tmp/list-commands.txt
```

## SquadTS vs SquadJS

SquadTS offer several advantages for plugin developers:
- Type safety.
- Revisited API.
- RXJS.
- Tested code*
- Support unit test and e2e tests for plugins.
- Rewritten code in functional composition. (no `this`, no `.bind()`)
- Abstracted complexity
- Modern JS (welcome to `Map` type and much more)
- No more searching for which events exist `'NEW_GAME'`, find them statically with code completion: `server.events.newGame.subscribe(() => {});`
- Better logging, instead of `this.verbose(1, "message")` (do you know what `1` means here ?) you have `logger.info("message"); logger.warn("message")`.

*this both help understanding how SquadTS work, help you write modular change, help you test code without going live with the server, and make it harder to break.

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
  await server.rcon.warn(info.victim.eosID, options.victimMessage.replace('%attacker%', attackerName));
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






## Cela je vais pas faire, mais pas sur que je vais mettre ds readme final

some plugin like
https://github.com/Ignis-Bots/SquadJS-My-Squad-Stats
and
tools like https://github.com/fantinodavide/Squad_Whitelister
cannot or will not be rewritten by me, too hard, I need to reproduce the exact same data output that SquadJS does,
with all its quirks, to keep backward compatibility, no thanks. Much easier to rewrite for most plugins.
And since SquadJS is not typed, I first need to find the exact type of data that is send by SquadJS....


## IDea

bot kill count plugin (devra utiliser probablement logParser et non
cached-game-status ! car victim nullptr), pr aider à l'attente..



## Aussi intéressant:

creer un script pour load les maps une fois
https://github.com/iamalone98/SquadJS/blob/master/src/core/maps/vanilla.json

cache les layers, ya ds le logs de squad qd tu demarre aussi

https://github.com/Team-Silver-Sphere/SquadJS/pull/372/files#diff-57920470afdfc49129bd5057db6e0b532838db173a9dc17bf2aa78ea633f1248

acces au log depuis exterieur, ex datadog, logstash

---

generate config like in squadJS, or make it manual but test it ? look worse.

zod describe -> json schema if needed.

---

pre-commit hook pr generate la config ?

---

log parsing lib or some better way to handle logs ?

---

find a way to automatically detect unparsed logs or variation of logs (when Squad update)

---

for ci, ts-node generateconfig.ts -f

---

le double package.json se discute, mais possible ss type module ?

---

IMPORTANT:
Il faut que je change ftp-tail pour non pas pour avoir un sleep, mais pour calculer
le sleep en function du temps que le readFile et downloadfile on prit.

---

any duplicate in reading log regarding rcon execute ?

---

breaking change note: yen a plein, j'ai arreter de compter... bref, bon j'enleve les "raw" des logs, c pas une bonne pratique.
si le format de squad server change, c l'intermediare squadTS/JS qui doit s'en occuper pas les plugins.

---

bug fix (Todo): on devrait plus avoir de undefined.tmp sur le serveur avec ftp-tail
ftp-tail le typing etait chiant a ajouter en d.ts, je suis pas sur la tsconfig qui va bien.
faut changer le sleep dedans pour prendre en compte le temps de downlaod et read.
faut changer la methode watch pr enelver son param comme dit plus haut

---

plugin: roulette russe ? (kick) hehe
PLYUGIN: auto balance, sur vote, et place les gens de meme team ensemble en options

## Log parser max file size

your probably want to reduce to 1MB instead o 10MB when developping.

---

prio:

```
[
    "AltChecker",
    "CBLInfo",
    "DiscordAdminBroadcast",
    "DiscordAdminCamLogs",
    "DiscordAdminRequest",
    "DiscordChat",
    "DiscordFOBHABExplosionDamage",
    "DiscordKillFeed",
    "DiscordRcon",
    "DiscordRoundWinner",
    "DiscordRoundEnded",
    "DiscordServerStatus",
    "DiscordSquadCreated",
    "DiscordTeamkill",
    "PersistentEOSIDtoSteamID",
    "SquadNameValidator",
    "FileLogger",
    "SocketIOAPI",
    "Switch",
    "MaxPlayerInSquad"
]
```

knife truc aussi

---

unmount inutile, ou.. file watch et enlever plugin ?

---

plugin, supporter ancien plugins ou pas ?
entre les deux, faire un adapter pour supporter les anciens plugins, en supportant un format plus neuf aussi.

bon, le shema zod, on va le req pour les nouveaux plugins.
permet d'envoyer le shema ds la fc composition direct

---

no mount or dismount on plugins, unmount never used, restart server after change

---

id are not number but string now.

---

interessant: https://github.com/Squad-Wiki/squad-wiki-pipeline-map-data

---

note about tests: name and ids have been scrambled, and may not be coherent from appear test to test (same player name with different eosID).

todo, ya moyen de s'assurer que les plugins modifie pas ce qui leur aient donné par référence ?

---

todo: si je fais rien des logs initial (potentiellement de la veille...) (on veut pas agir 2 fois sur les meme logs si on
restart squadJS plusieurs fois de suite aussi !!), aussi bien enlever non ?
( en plus niveau logs, cela fait une pause pas forcément bien comprise )

---

when doing a plugins, you may want to add playerTreshold (kick unassigned) and enabledInSeed (squad name validator...)

---

idea: envoyer l user vers un dossier de config different pour plugins et squadTS, pour pouvoir facilement update le projet
ss avoir a merge avec git les config ? puis en dev, je veux une config plugins differentes.

---

lequel ?
server.helper.getByEOSID() ?
server.getByEOSID() ?

pr explorer l'api, c un peu chiant d'avoir plei nde getter partout

server.events
server.rcon.chatEvents
huumm pas naturel ?

---

la CI ou pre-commit hook, devrait regenerer la config (on peut tjrs enlever le hook pr des commit WIP).
si rien a changé tt est bon,si quelque chose a chngé le dev doit faire un commit.

---

(gen plugin config ?)
prq je genere la config si le json5 manque ? cela est pa coherent avec la gen de config de la base squadTS

---

requireConnectors, c du plugin a SquadTS, le user s'en fou et devrait pas y toucher ?
Laisser au plugin le soin d'ajouter en description les requirement ?
et mettre un champs en export pour indiquer ce qui est requis ?

---

plugin enabled par defaut, un peu chiant. par contre c chiant d'avoir litteral(true), et de vouloir
mettre default false... peut etre mettre ts ignore ? c bof mais bon... :////
ou je force enabled false ailleurs ?

---

strucutre pas adapté a plusieurs connecteur, en particulier le required<> typing est pas bon si plusieurs connector

---

todo: DiscordBaseMessageUpdater pr server status

---

refléxion: Ce serait pas mieux d'avoir useSquadServer ds les tests des plugins ?

- Faudrait mock logParser pour sûr
- Faudrait bien envoyer les bons event dans l'ordre avec tout les infos correctes dedans... (genre date, id, teamid, etc)
- Faudrait réussir à mock playerlist rcon Updates, sinon faudrait attendre trop.
- On risque d'avoir besoin d'un helper pour créer les events qui vont bien, en particulier ceux de connection.
- Risque d'envoyer des logs incohérents, innatendu, genre pas de event playerInitialized

---

en passant, si les logs on du retard, tu agis sur des logs quand RCON a déjà update, risque pas d'avoir des choses bizarres ?
en fait, ce qui m'inquiete, c'est que cela se trouve, faut connaitre le fonctionnement interne de SquadServer pour faire les tests.
ce qui est un no-no

---

AUTO-update depuis github ? seulement si pas besoin de input manuel du user... peu probable :/

---

remplacer interval de rxjs par un setTimeout avec observation du retard comme pr ftp tail?
bof ?

---

eslint fix, et prettier,

---

enrefaisant ftp tail, je m'assure que client.disconnect est bien appelé, même en cas de ctrl+c
car sur ma machine il finissait par prendre 3 plombs pour se connecter on dirait (malheureusement pas pu isoler le pb entierement)
et je pense que j'avais trop de connection rester ouverte sur le serveur. 1/3 il plantait et refusais la connection...
plus simple de refaire cette partie que de modifier.

---

mesure la perf. demande cpu, ram
repartir sur le temps de l'interval les events pour réduire les pics de CPU ?

---

idée plugin rating ? pour equilibrage (demande de la BDD pr stockage long terme..)

---

https://github.com/fantinodavide/Squad_Whitelister/blob/main/server.js meh 3700 lines
https://github.com/fantinodavide/SquadJS/blob/de8219d2630fbfd07b355771e1b22853723edd8c/squad-server/plugins/socket-io-api.js#L36
gerer liste d'admin/whitelist. automatique while list temporaire pour seeder.
tt est utile il semble. dapres pika

https://github.com/Ignis-Bots/SquadJS-My-Squad-Stats

IMO, for both, just let SquadJS handle them

## https://github.com/ar1ocker/SquadJS-Commander-Vote

save log ds file pr aider a debug

---

auto back to seed if no player ? i dont remember if squad alraedy does that or battlemetric

mes logs sont encore triplé...

---

heli crash suicide pas appelé, et pb de logs dupliqué...

---

[22:15:22.865] WARN: [LogParser] No match on line: [2025.02.12-21.13.34:523][360]LogSquad: Warning: Suicide -TWS- Yuca

should also handle suicide by "Respawn" I suppose, better than watching playerWounded !

---

https://github.com/fantinodavide/squad-js-map-vote
map vote lui meme pas necessaire, par contre, le end match peut etre bien.

---

script pr dll log du serveur (a des fins de tests ou observation...)
ce serait sympa de ensuite pouvoir le feed au server pour répéter un bug ? (faudrait les responses rcon pour pouvoir faire cela propre idéalement).

---

pr meilleurs tests...
mettre de quoi lire les logs séparement du reste du server ? lire et tranformer en objet voir event des logs...
en gros, changer logReader et rcon et rcon-updates garder le reste ?
l'idée c'est d'envoyer des morceaux de logs et rcon list players et squad list pour obtenir un teste plus fiable.

---

opti:
.share at tt les events?

---

ListPermittedCommands 1 -> extraire donnée
les mettres en "rcon.extra" ? (bof sur la longue)
ListCommands 1

---

log ds file, et aussi chatEvents separement?

---

faut un moyen de recup les logs du server facilement, si bug, donc en continue, et sur demande

---

t obligé de géré les options, sinon, c'est trop random le résultat, et en gerant les options tu geres aussi quel plugins du enable?

---

gestion des date en test... rcon events...

---

load que certain plugins ?

---

zod parse mais en refusant les props en trop ? (c possible me semble, idée c de
indiquer si des trucs on changé et doivent être enlever si obsolète)
( de même, ce serait bien si les defaults... était pas défault dans la validation :/ )

---

eslint config in webstorm, it may not automatically be correctly set because using eslint.config.mjs instead of eslintrc.
![img.png](img.png)

---

recommend unchecking from file
because it is too easy to confuse with TS errors (that actually needs immediate fixing)

![img_1.png](img_1.png)

---

utils to download FTP logs from before ?

---

todo release, permet d'avoir changelog et master dispo pour merge les trucs en dev.

---

$ npm outdated
Package            Current   Wanted   Latest  Location                        Depended by
@eslint/js          9.18.0   9.20.0   9.20.0  node_modules/@eslint/js         SquadTS
@types/json5         2.2.0    2.2.0   0.0.30  node_modules/@types/json5       SquadTS
@types/lodash      4.17.14  4.17.15  4.17.15  node_modules/@types/lodash      SquadTS
chalk                4.1.2    4.1.2    5.4.1  node_modules/chalk              SquadTS
eslint              9.18.0   9.20.1   9.20.1  node_modules/eslint             SquadTS
typescript-eslint   8.20.0   8.24.1   8.24.1  node_modules/typescript-eslint  SquadTS
vitest               3.0.5    3.0.6    3.0.6  node_modules/vitest             SquadTS
zod                 3.24.1   3.24.2   3.24.2  node_modules/zod                SquadTS

chalk je crois pvoir update car c esm.

---

https://github.com/fantinodavide/Squad_Whitelister

google doc, en ligne, et on peut le query régulièrement avec ftp pr update le fichier. Force
SquadTS à rendre accessible son FTP au plugin (pas contre file system je vais)...
embetant niveau secu si un plugin malveillant dont on lit pas le code...

---

soucis: depuis refactor use-game-status (ou avant ?) j'ai plus le SIGINT qui fonctionne correctement.

---

je suis certain que list player est set avant ?

      playerKicked: rconSquad.chatEvents.playerKicked.pipe(
        map(data => ({
          ...getPlayerByEOSID(data.eosID)!,
          ...data,
        }))
      ),

avec le refactor use game status oui
