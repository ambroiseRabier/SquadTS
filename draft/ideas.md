## SquadJS --> SquadTS

### https://github.com/fantinodavide/Squad_Whitelister

Gérer les whitelist depuis le web, automatiquement reward les gens qui seed.
Gérer whitelist depuis le web, c'est un peu plus embetant comme projet,
mais on pourrait avoir une command en jeu !whitelist <player> <reason> <duration>
Peut être géré par plugin je pense. Au moins partiellement. (pas la partie monitoring)

### Grafana database avec SQL

À voir si vraiment utile...

### AdminList (automatisé)

fetch admin list depuis FTP
fetch aminlist depuis local
euh, prq on prend depuis une url déjà ?
RemoteAdminListHosts.cfg ds \SquadGame\ServerConfig
les contient, + Admins.cfg

### DiscordBaseMessageUpdater

Me semble que je l'ai zappé, pour `!status`

## Plugin idea

- AdminVote (surtout pour endmatch (skipmap), ou demote commander), voter la carte plus besoin,
  possible inspi: https://github.com/fantinodavide/squad-js-map-vote
  https://github.com/ar1ocker/SquadJS-Commander-Vote
- Seed reward auto whitelist
- !whitelist <player> <reason> <duration> (ex: les FUR)
- !canGiveWhitelist <player> <reason> <duration> (ex: les FUR)
- auto seed low player.
- un méga-plugin pour équilibré les parties sur un elo rating ?
- kick unassigned: avec player threshold et enabled in seed= false.
- discord RCON (peut etre utile)
- altchecker
- roulette russe (kick du serv ?) (avec deathroll?) ("I agree that losing a deathroll will get me kicked from the server")
- autobalance, sur vote, place les gens de la meme team ensemble en option
- Bot kill count in seed (pour mieux patienter...) (voir score) (pendant 5min faire max de kill avec tell arme)
  Note: les bot logs sont actualement ignoré car nullptr
  J'ai que ce log :(, c pas assez, je peux pas limiter l'arme ni même être certain que il est mort (ou alors je prends sur 1sec ?) (peut pas limiter l'arme, trop dommage)
  : `No match on line: [2025.02.22-16.20.18:430][512]LogSquad: Warning: ASQWeapon::DealDamage was called but there was no valid actor or component.`

## Refine plus d'events et chatEvents

\-

## Doc

- faire liste d'events dispo sur README.md. Donner envie.
- Commenter la fc de chaque fichier...

## QOL

❌ automatiquement choper la config RCON depuis ftp ? Non, car peut être faux si proxy.

- zod parse en refusant props de trop (facilité la maj de la config..)
- option vs schema vs config ds le code.
- auto-update SquadTS depuis github ? -> pas super utile car le moinder breaking change...
- Faire de la validation des commandes RCON, pr détecté soucis tôt (genre kick player pas sur le serv). (pas certain que utile et fiable)
- Parse le retour de certain command comme kick, pr savoir si cela a fonctionné. (prq pas).
- CI (bien que l'on a le pre-commit hook)

## QOL tests

pouvoir rejouer des logs,rcon,chatEvents, avec vrai timing ou acceleré
demande probablement de logs tout cela ds un fichier à part ?
ou alors de pouvoir filter les logs d'un fichier existant
note: log tt seul fonctionnera pas, faut rcon aussi. (au moins une fois
au début).

## Plugin API sécu defensive programming

ils peuvent modif des choses par référence ?
type readonly et .share si ce n'est plus ?

## Plugin bugs

Mettre un unmount, peut être une simple fc de cleanup renvoyé?
⚠❤❤❤sinon si il se connecte genre à BDD, bah ils peuvent pas disconnect.

- vi.waitFor refactor plutôt que wait (plutot fake timer en fait)

## Utils

Download file from FTP, ou juste la config entière du serveur. (jsuis pas un client ftp ?)
Par contre, peut être utile pour download les logs de squad pour aider a debut ou dev.

## Perf

- mesurer.
- .share à tt les events ? side effects ? mesuré ?
- repartir sur le temps de l'interval les events pour réduire les pics de CPU ?
- mesure la perf. demande cpu, ram
- ⚠ Do not import plugin that are enabled false to speed up startup

## Extra events

- suicide: devrait gerer tt type de suicide, meme Respawn

```
[22:15:22.865] WARN: [LogParser] No match on line: [2025.02.12-21.13.34:523][360]LogSquad: Warning: Suicide -TWS- Yuca
```

## Vais pas faire

https://github.com/Ignis-Bots/SquadJS-My-Squad-Stats
https://github.com/fantinodavide/SquadJS/blob/de8219d2630fbfd07b355771e1b22853723edd8c/squad-server/plugins/socket-io-api.js#L36
https://github.com/fantinodavide/Squad_Whitelister/blob/main/server.js (3700 lignes...)

Out of scope, et trop gros pour Squad_Whitelister.
My-Squad-Stats, ss typage de SquadJS ni la donnée sur My-Squad-Stats,
c'est compliqué d'envoyé une reproduction du résultat de SquadJS, et si
je me plante, je foue en l'ai sa BDD si il a pas bien protégé.

# HS: extra info sur les changement fait

- enlever les raw ds les events. Pas une bonne pratique, l'intermediatre SquadTS/JS doit s'occuper du raw, sinon, sur
  une update le plugin qui utilise le raw ne profite de rien. Et en plus utiliser le raw ne peut que etre une erreur si
  squadTS/JS fait bien le boulot de parse.
- plus de undefined.tmp sur serveur avec ftp-tail (a confirm)
- le sleep de ftp-tail prend en compte le temps de download et read.
  cela change rien comparé à SquadJS, car de toute façon il spammait le serveur FTP.
- squadID -> SquadIndex,
- ID genre steam/eos/autre passé de number à string.

## HS: autre projets refactor

https://github.com/iamalone98/SquadJS (60% TS, bien correct ?)
et Pull request sur SquadJS

## Revoir les connectors, discord, voir awn et autres...

## Cleanup des plugins à faire.
