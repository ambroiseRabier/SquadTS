
## Run

1. Install NodeJS
2. `npm i`
3. `npm run`

or run with watch file with `npm run watch`


## From release (pre-transpiled)

1. Install NodeJS
2. Unzip
3. Install prod dependencies `npm i --production`
4. `npm run run:prod`

## Config folder

Config folder will be `./config`.
If you need a different location, you can set `SQUAD_JS_CONFIG_PATH` env variable to an 
absolute path or relative to project root directory.

## Docker

...



## Dev

1. `npm i`
2. `npm run watch`


To test on a squad server, you may host yourself (but it will be a hassle):
- https://squad.fandom.com/wiki/Server_Installation
- https://hub.docker.com/r/cm2network/squad/

To avoid mistakenly commiting sensitive info like the password on git, you can put your config into dev-config folder 
and add `SQUAD_JS_CONFIG_PATH="dev-config"` before running the server. `dev-config` is ignored by git.


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

license, stay the same

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
