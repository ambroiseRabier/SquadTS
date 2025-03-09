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

- Seed reward auto whitelist
- !whitelist <player> <reason> <duration> (ex: les FUR)
- !canGiveWhitelist <player> <reason> <duration> (ex: les FUR)
- un méga-plugin pour équilibré les parties sur un elo rating ?
- discord RCON (peut etre utile)
- altchecker
- roulette russe (kick du serv ?) (avec deathroll?) ("I agree that losing a deathroll will get me kicked from the server")
- autobalance, sur vote, place les gens de la meme team ensemble en option
- Bot kill count in seed (pour mieux patienter...) (voir score) (pendant 5min faire max de kill avec tell arme)
  Note: les bot logs sont actualement ignoré car nullptr
  J'ai que ce log :(, c pas assez, je peux pas limiter l'arme ni même être certain que il est mort (ou alors je prends sur 1sec ?) (peut pas limiter l'arme, trop dommage)
  : `No match on line: [2025.02.22-16.20.18:430][512]LogSquad: Warning: ASQWeapon::DealDamage was called but there was no valid actor or component.`
- Squad claim (indique qui a la prio, si ce n'est option de kick le joueur ds un truc qui n'a pas la prio... ?)
- plugin qui force certaines map tres populaire genre fallujah apres une certaine heure et un certain nombre de joueur, genre apres 23h france sur serv
  anglais, j'ai vu le mapvote enlever pr fallujah direct. peut etre un set next layer ?

## Plugin pas à refaire

Map vote existe dans le jeu, commander vote aussi.
https://github.com/fantinodavide/squad-js-map-vote
https://github.com/ar1ocker/SquadJS-Commander-Vote

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
- compliqué si le serveur auquel j'ai accès, personne ne joue...
  pouvoir rejouer des logs et rcon c pas mal, mais remplace pas l'ensemble avec rcon et ftp...

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

## Player suicide event.

## RCON client refactor based on

https://github.com/Matttor/SimplestSquadRcon/blob/master/rconforSquadJS.js
? lequel est meilleurs ? le passthrough est assez utile comme tool, mais pas besoin de refaire ici non ?

## Outils en cmd pour installer

avec prompt et tout... prendre la main pour l'installation en gros.

## ⚠ Error handling de main.mts rcon

mauvaise adresse ou port
ETIMEDOUT 134.119.187.19:19445

mauvais mdp !!

```
[12:05:08.045] DEBUG: [RCON] Clearing Pending Callbacks
[12:05:08.046] ERROR: [RCON] decodePacket is an ERROR, unknown how to handle
```

et il continue...
je vais changer rcon.ts de toute façon

## Prévenir si champs manquant en config (due a une update)

## Build en JS et tout pour réduire la taille total

genre msgpack 700 => 40ko :/
plutôt un bundler. (tree shaking) (une vraie release du coup, mais...)
du coup un plugin en TS peut pas fonctionner, pas en drop-in ?

## Autres plugins idea:

INF
MBT, IFV

un des tags definie, disband

va bien avec max players une squad,
sinon trop facile a contourner.

creer squad 1
warn + disband.

au debut de chaque partie: broadcast avec tag et explicatif.

si trop de fois disband pr cette raison: tu te fais kick du server.

squad baiting: trop d'escoude créer en peu de temps (3 fois en 10min) tu te fais kick. (tu fais chier les autres, et tu sais pas ce que tu fais)

si nouveau joueur, moins de 50h de jeu, 3 création de squad avant kick, sinon 6.

## ASCII art en warn

    // Size that is max before it goes out of the black background
    // 1234567890A1234567890B1234567890C12345
    // For Same padding left and right, approximately
    // 1234567890A1234567890B1234567890
    // There is no limit is line length, but on 1440p screen the max is
    // 1234567890A1234567890B1234567890C1234567890D1234567890E1234567890F1234567890G1234567890H1234567890A1234567890B1234567890C1234567890D1234567890E1234567890F1234567890G1234567
    //
    // There is a limit in lines (vertical), it will stay in the black box, the limit is
    // 1234567890A1234567890B12
    //
    // 242 chars max until it breaks.
    // likely because packet is 14, that make 260,
    // but likely size field 4 bytes are not included
    // meaning the well known 256.

limite de 256 chars, 24 lignes en vertical, pas de limite en horizontal, mais 172 grand max pour 1440p.
38 en horizontal pour rester dans la boite noire.
32 en horizontal pour avoir padding équilibré
à confirmer, mais je crois aussi que par défaut il line break les mots. (peut être contourner en mettant un char au début de chaque ligne?)
