import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { useSquadEvents } from './use-squad-events';
import { firstValueFrom, ReplaySubject } from 'rxjs';

describe('rcon-squad-events', () => {
  // Use a variant of subject that resend event to any new subscriber,
  // This make testing easier. However, make sure to always call next() before subscribing or you will get
  // previous test case emission !
  let chatPacketEvent: ReplaySubject<string>;
  let events: ReturnType<typeof useSquadEvents>;

  beforeAll(() => {
    chatPacketEvent = new ReplaySubject<string>(1);
    events = useSquadEvents({ debug: vi.fn() } as any, chatPacketEvent);
  });

  beforeAll(() => {
    vi.useFakeTimers(); // Mock timers
    vi.setSystemTime(new Date('2023-01-01T00:00:00Z')); // Freeze time
  });

  afterAll(() => {
    vi.useRealTimers(); // Restore real timers
  });

  it('message', async () => {
    chatPacketEvent.next(
      '[ChatTeam] [Online IDs:EOS: 0002a10186d9414496bf20d22d3860ba steam: 76561198016942077] -TWS- Yuca : r3'
    );
    expect(await firstValueFrom(events.chatEvents.message)).toEqual({
      chat: 'ChatTeam',
      player: {
        eosID: '0002a10186d9414496bf20d22d3860ba',
        steamID: '76561198016942077',
      },
      message: 'r3',
      name: '-TWS- Yuca',
      date: expect.any(Date),
    });
  });

  it('possessedAdminCamera', async () => {
    chatPacketEvent.next(
      '[Online Ids:EOS: 0002a10186d9424436bf50d22d3860ba steam: 71531192016942077] Yuca has possessed admin camera.'
    );
    expect(await firstValueFrom(events.chatEvents.possessedAdminCamera)).toEqual({
      eosID: '0002a10186d9424436bf50d22d3860ba',
      steamID: '71531192016942077',
      nameWithoutClanTag: 'Yuca',
      date: expect.any(Date),
    });
  });

  it('unPossessedAdminCamera', async () => {
    chatPacketEvent.next(
      '[Online Ids:EOS: 0002a10186d9424436bf50d22d3860ba steam: 71531192016942077] Yuca has unpossessed admin camera.'
    );
    expect(await firstValueFrom(events.chatEvents.unPossessedAdminCamera)).toEqual({
      duration: 0,
      eosID: '0002a10186d9424436bf50d22d3860ba',
      steamID: '71531192016942077',
      nameWithoutClanTag: 'Yuca',
      date: expect.any(Date),
    });
  });

  it('playerWarned', async () => {
    chatPacketEvent.next(
      'Remote admin has warned player -TWS- Pikado !!!. Message was "Yuca est en cam admin!"'
    );
    expect(await firstValueFrom(events.chatEvents.playerWarned)).toEqual({
      nameWithClanTag: '-TWS- Pikado !!!',
      reason: 'Yuca est en cam admin!',
      date: expect.any(Date),
    });
  });

  it('squadCreated', async () => {
    chatPacketEvent.next(
      'lordmoi (Online IDs: EOS: 00027d9e31c04fda80ddac0443c3ce69 steam: 76561198006677354) has created Squad 1 (Squad Name: INF ) on Western Private Military Contractors'
    );
    expect(await firstValueFrom(events.chatEvents.squadCreated)).toEqual({
      creator: {
        eosID: '00027d9e31c04fda80ddac0443c3ce69',
        name: 'lordmii',
        squadName: 'INF ',
        steamID: '76561198006677354',
      },
      squadID: '1',
      squadName: 'INF ',
      teamName: 'Western Private Military Contractors',
      date: expect.any(Date),
    });
  });

  it('playerKicked', async () => {
    chatPacketEvent.next('');
    expect(await firstValueFrom(events.chatEvents.playerKicked)).toEqual({
      // todo need data
    });
  });

  it('playerBanned', async () => {
    chatPacketEvent.next('');
    expect(await firstValueFrom(events.chatEvents.squadCreated)).toEqual({
      // todo need data
    });
  });
});
