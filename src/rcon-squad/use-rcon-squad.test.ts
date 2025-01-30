import { expect, beforeEach, describe, it, jest } from '@jest/globals';
import { useRconSquad } from './use-rcon-squad';
import { Packet, Rcon } from '../rcon/rcon';
import { Subject } from 'rxjs';

jest.mock('../rcon/rcon');

describe('rcon-squad', () => {
  let squadRcon: ReturnType<typeof useRconSquad>;
  let mockedRcon: jest.Mocked<Rcon>;

  beforeEach(() => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    mockedRcon = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      execute: jest.fn(),
      chatPacketEvent: new Subject<Packet>(),
    } as unknown as jest.Mocked<Rcon>;
    mockedRcon.connect.mockResolvedValue();
    mockedRcon.disconnect.mockResolvedValue();
    squadRcon = useRconSquad(mockedRcon);
  });


  it('getCurrentMap', async () => {
    // const rconInstance = (Rcon as unknown as jest.Mocked<typeof Rcon>).mock.instances[0];
    mockedRcon.execute.mockResolvedValue("Current level is Sumari Bala, layer is Sumari_Seed_v1, factions INS WPMC");
    expect(await squadRcon.getCurrentMap()).toEqual({
      "layer": "Sumari_Seed_v1",
      "level": "Sumari Bala"
    });
  });

  it('getListPlayers', async () => {
    const value = `----- Active Players -----
ID: 3 | Online IDs: EOS: 0002fac23f7e47a682750a2b969b3701 steam: 76561198080109192 | Name:  ComboAz | Team ID: 1 | Squad ID: N/A | Is Leader: False | Role: INS_Sapper_01
ID: 12 | Online IDs: EOS: 0002d291d3f04069b0f5d3f11be15888 steam: 76561198012236668 | Name:  JO Diabolo | Team ID: 1 | Squad ID: 1 | Is Leader: True | Role: INS_Grenadier_01
----- Recently Disconnected Players [Max of 15] -----
ID: 13 | Online IDs: EOS: 00025153363e436bbc1c97879b9138f3 steam: 76561199178518625 | Since Disconnect: 01m.32s | Name:  pennytide13951
ID: 11 | Online IDs: EOS: 00029q3b0ae04be1880bcf2f1897d4e6 steam: 76561198016277413 | Since Disconnect: 00m.31s | Name:  Othoma`;
    mockedRcon.execute.mockResolvedValue(value);

    expect(await squadRcon.getListPlayers()).toStrictEqual([
      {
        eosID: "0002fac23f7e47a682750a2b969b3701",
        name: "ComboAz",
        role: "INS_Sapper_01",
        isLeader: false,
        playerID: 3,
        squadID: null,
        steamID: "76561198080109192",
        teamID: 1,
      },
      {
        eosID: "0002d291d3f04069b0f5d3f11be15888",
        name: "JO Diabolo",
        role: "INS_Grenadier_01",
        isLeader: true,
        playerID: 12,
        squadID: 1,
        steamID: "76561198012236668",
        teamID: 1,
      },
    ]);
  });

  it('getSquads', async () => {
    const value = `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 3 | Locked: False | Creator Name: stefjimanez76 | Creator Online IDs: EOS: 0002d1a8ee534edab8f366b826c1abf3 steam: 76561198214250793
ID: 2 | Name: TWS | Size: 3 | Locked: False | Creator Name: Pika !!! | Creator Online IDs: EOS: 00020817daeb4e2faf717bdeeb18a9da steam: 76561197996303481
Team ID: 2 (Manticore Security Task Force)
ID: 1 | Name: SPEC OPS TWS | Size: 9 | Locked: True | Creator Name: Amzer | Creator Online IDs: EOS: 0002eca389864a621f1a51e2722df6be steam: 76561199594212551
ID: 2 | Name: Squad 2 | Size: 8 | Locked: False | Creator Name: kilmol | Creator Online IDs: EOS: 00021617235142d796774a04ed3d82fd steam: 76561199579221103
`;
    mockedRcon.execute.mockResolvedValue(value);

    expect(await squadRcon.getSquads()).toStrictEqual([
      {
        creator: {
          eosID: "0002d1a8ee534edab8f366b826c1abf3",
          name: "stefjimanez76",
          steamID: "76561198214250793"
        },
        locked: false,
        size: 3,
        squadID: "1",
        squadName: "Squad 1",
        teamID: "1",
        teamName: "Irregular Battle Group"
      },
      {
        creator: {
          eosID: "00020817daeb4e2faf717bdeeb18a9da",
          name: "Pika !!!",
          steamID: "76561197996303481"
        },
        locked: false,
        size: 3,
        squadID: "2",
        squadName: "TWS",
        teamID: "1",
        teamName: "Irregular Battle Group"
      },
      {
        creator: {
          eosID: "0002eca389864a621f1a51e2722df6be",
          name: "Amzer",
          steamID: "76561199594212551"
        },
        locked: true,
        size: 9,
        squadID: "1",
        squadName: "SPEC OPS TWS",
        teamID: "2",
        teamName: "Manticore Security Task Force"
      },
      {
        creator: {
          eosID: "00021617235142d796774a04ed3d82fd",
          name: "kilmol",
          steamID: "76561199579221103"
        },
        locked: false,
        size: 8,
        squadID: "2",
        squadName: "Squad 2",
        teamID: "2",
        teamName: "Manticore Security Task Force"
      }
    ]);
  });

  it('getNextMap: mapvote', async () => {
    mockedRcon.execute.mockResolvedValue("Next map is not defined");

    expect(await squadRcon.getSquads()).toMatchSnapshot();
  });

  // todo: test next map when defined.
  // todo: check ban/kick/disolve squad when incorrect parameters
  //       or when player already left the server.
});
