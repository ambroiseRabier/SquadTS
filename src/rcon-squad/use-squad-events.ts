import { Base, events as events2, processBody, SquadEvents } from '../rcon/chat-processor';
import { filter, map, Subject, tap } from 'rxjs';
import { omit } from 'lodash';
import { useAdminCam } from './use-admin-cam'; // todo ugly

export interface Player {
  eosID: string;
  name: string;
}

export function useSquadEvents(chatPacketEvent: Subject<string>) {
  const events = Object.fromEntries(
    // Can't tell why c is seen as any by typescript, the type of eventName is correctly found though.
    events2.map((eventName: any) => [eventName, new Subject()])
  ) as SquadEvents<{player: Player}>; // force typing here
  const players: Player[] = []; // todo: how about making a behavior subject to cache value, with a regular update
  // todo: typing is ugly here :/ ... SquadEvents<{player: Player, command: string}>['CHAT_MESSAGE']
  // ... use with type assertion if (isMyType(evt)) { ... } isMyType<T>: T is MyType .....
  // I kind of like EventEmitter syntax here :/, can't make a map and autopopulate, since event aren't know in advance
  // by me.
  const chatCommandEvent = new Subject<{ message:string; data: any; }>();

  configEvents();

  // todo: ts les pipe faut les renvoyer sinon cela fait rien, c comme concat ds array...
  function configEvents() {
    // get player for each.
    for (let event of Object.values(events) as Subject<any>[]) { // Typing break here sadly
      event.pipe(
        map((data: Base) => {
          return {
            ...data,
            player: players.find(p => p.eosID === data.eosID)
          };
        })
      )
    }

    // todo: to be confirmed
    // No eosID in PLAYER_WARNED data, so we resolve with player name
    events.PLAYER_WARNED.pipe(
      map(data => {
        return {
          ...data,
          player: players.find(p => p.name === data.name)
        };
      })
    )

    events.CHAT_MESSAGE.pipe(
      map((data) => {
          const command = data.message.match(/!([^ ]+) ?(.*)/);
          if (command) {
            chatCommandEvent.next({
              ...data,
              command: command[1].toLowerCase(),
              message: command[2].trim()
            } as any ); // todo... maybe use some kind of type event emitter ?
          }
        }
      )
    );

    // todo : RCON_ERROR: what to do with is ? is it used ?

    events.SQUAD_CREATED.pipe(
      map(data => {
        return {
          // todo: not too sure why this is removed only here, I believe it is to avoid duplicating info with player key.
          ...omit(data, ['eosID', 'steamID', 'playerName']),
          player: {
            ...data,
            squadID: data.squadID,
          }
        };
      })
    );
  }


  return {
    ...useAdminCam(events.POSSESSED_ADMIN_CAMERA, events.UNPOSSESSED_ADMIN_CAMERA),
    chatEvent: chatPacketEvent.pipe(
      // todo: Maybe it is never empty,
      tap(body => {
        if (!body) {
          console.warn('Empty body (does it happen ?)');
          // Logger.warn : might be something wrong, or something new, or maybe it is by design to ignore non-match.
        }
      }),
      filter((body: string) => !!body),
      map((body:string) => processBody(body)),
    )
  };
}
