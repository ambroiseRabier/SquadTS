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
ID: 12 | Online IDs: EOS: 0002d291d3f04069b0f5d3f11be15888 steam: 76561198012236668 | Name:  Diabolo | Team ID: 1 | Squad ID: 1 | Is Leader: False | Role: INS_Grenadier_01
ID: 16 | Online IDs: EOS: 000245c2ab79457c8f5c1d36e38e2f12 steam: 76561198002231710 | Name: (Γ£┐Γå╗-Γå╗) Jolt Fragger | Team ID: 2 | Squad ID: N/A | Is Leader: False | Role: WPMC_Raider_01
ID: 1 | Online IDs: EOS: 0002ece389164a229f1a11e2722df6be steam: 76561199394112353 | Name: -TWS- Amser | Team ID: 2 | Squad ID: 1 | Is Leader: True | Role: WPMC_SL_05
----- Recently Disconnected Players [Max of 15] -----
ID: 13 | Online IDs: EOS: 00025153363e436bbc1c97879b9138f3 steam: 76561199178518625 | Since Disconnect: 01m.32s | Name:  pennytide13951
ID: 11 | Online IDs: EOS: 00029q3b0ae04be1880bcf2f1897d4e6 steam: 76561198016277413 | Since Disconnect: 00m.31s | Name:  Othoma`;
    mockedRcon.execute.mockResolvedValue(value);

    expect(await squadRcon.getListPlayers()).toMatchSnapshot();
  });

  it('getSquads', async () => {
    const value = `----- Active Squads -----
Team ID: 1 (Irregular Battle Group)
ID: 1 | Name: Squad 1 | Size: 3 | Locked: False | Creator Name: stefjimanez76 | Creator Online IDs: EOS: 0002d1a8ee534edab8f366b826c1abf3 steam: 76561198214250793
ID: 2 | Name: TWS | Size: 3 | Locked: False | Creator Name: Pika !!! | Creator Online IDs: EOS: 00020817daeb4e2faf717bdeeb18a9da steam: 76561197996303481
Team ID: 2 (Manticore Security Task Force)
ID: 1 | Name: SPEC OPS TWS | Size: 9 | Locked: False | Creator Name: Amzer | Creator Online IDs: EOS: 0002eca389864a621f1a51e2722df6be steam: 76561199594212551
ID: 2 | Name: Squad 2 | Size: 8 | Locked: False | Creator Name: kilmol | Creator Online IDs: EOS: 00021617235142d796774a04ed3d82fd steam: 76561199579221103
`;
    mockedRcon.execute.mockResolvedValue(value);

    expect(await squadRcon.getSquads()).toMatchSnapshot();
  });

  it('getNextMap: mapvote', async () => {
    mockedRcon.execute.mockResolvedValue("Next map is not defined");

    expect(await squadRcon.getSquads()).toMatchSnapshot();
  });

  // todo: test next map when defined.
  // todo: check ban/kick/disolve squad when incorrect parameters
  //       or when player already left the server.
});
