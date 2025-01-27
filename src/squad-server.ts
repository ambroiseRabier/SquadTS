import { Logger } from "pino";
import { RconSquad } from './rcon-squad/use-rcon-squad';
import { Options } from './config/parse-config';
import { LogParser, logParserRules } from './log-parser/use-log-parser';
import { Subject } from 'rxjs';
import { Player } from './rcon-squad/use-squad-events';


type ExtractGroupNames<T extends string> =
  T extends `${string}(?<${infer GroupName}>${string})${infer Rest}`
    ? GroupName | ExtractGroupNames<Rest>
    : never;

type ObjectFromRegexStr<T extends string> = {
  [K in ExtractGroupNames<T>]: string;
};

// type CasesToEvents<TCases extends Record<string, string>> = {
//   [K in keyof TCases]: Subject<ObjectFromRegexStr<TCases[K]>>;
// };
//
// type CasesToEvents2<TCases extends [string, string][]> = {
//   [K in keyof TCases[number][0]]: Subject<ObjectFromRegexStr<TCases[number][1]>>;
// };

// type Helper<T extends typeof logRules[number][0]> = Extract<
//   typeof logRules[number],
//   [T, string]
// >;

export type SquadServer = ReturnType<typeof useSquadServer>;

//
// type CasesToEvents<TCases extends Record<string, string>, AdditionalData> = {
//   [K in keyof TCases]: Subject<{
//     date: Date;
//     chainID: string;
//     data: ObjectFromRegexStr<TCases[K]>
//   }>;
// };

type CasesToEvents2<TCases extends ReadonlyArray<readonly [string, string]>> = {
  [K in TCases[number] as K[0]]: Subject<ObjectFromRegexStr<K[1]>>;
};


// export type SquadLogEvents = CasesToEvents2<typeof logParserRules>;
export type SquadLogEvents = {
  [K in (typeof logParserRules)[number] as K[0]]: ObjectFromRegexStr<K[1]>;
};
// const j: SquadLogEvents;
// j.adminBroadcast.next(v =>{
//   v
// })
// j.roundEnded.next(v => {v.})

export type SquadServer = ReturnType<typeof useSquadServer>;

export function useSquadServer(logger: Logger, rcon: RconSquad, logParser: LogParser, options: Options) {
  // const events = Object.fromEntries(logRules.map(([eventName, pattern]) => [eventName, new Subject<ObjectFromRegexStr<Helper<typeof eventName>>>()]));

  // const events: CasesToEvents2<typeof logRules>;
  // const events = Object.fromEntries(
  //   // Can't tell why c is seen as any by typescript, the type of eventName is correctly found though.
  //   logParserRules.map((eventName: any) => [eventName, new Subject()])
  // ) as SquadLogEvents<{player: Player}>;

  return {
    // ...events,
    rcon,
    events: logParser.events,
    watch: async () => {
      logger.info(`Beginning to watch ${options.rcon.host}:${options.rcon.port}...`);
      await rcon.connect();

      // todo: useful for plugins where you don oh way, admin can't be kicked ...
      // based on permission: "canseeadminchat",
      // also used to warn admins in game that there is a discord request.
      // big questions is: what is adminList options based upon ? Does it includes moderator ?
      // is it supposed to be the admin/moderator/whitelist file from squad server perhaps ?
      //this.admins = await fetchAdminLists(this.options.adminLists);

      // soi recup layer depuis wiki comme lui, soi on peut depuis logs si je suppose server recemment lancé,
      // soi manuel avec git ?
      // await Layers.pull();

      // pingSquadJSAPI interessant, recup info sur qui utiliser quel plugin.

      // console.log(await this.rcon.getCurrentMap());
      console.log(await rcon.getListPlayers());
      // console.log(await this.rcon.getSquads());
      // console.log(await this.rcon.getNextMap());
      // console.log(await this.rcon.broadcast("coucou dit l'oiseau"));

      // await this.rcon.getCurrentMap()
      // await this.rcon.getListPlayers()
      // await this.rcon.getSquads()

      // await logParser.watch();

      logParser.events.subscribe((next) => {
        logger.debug(next);
      })

      await logParser.watch();
    },
    unwatch: rcon.disconnect
  } as const;
}
