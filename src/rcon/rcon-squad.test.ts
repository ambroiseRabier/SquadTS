import { expect, beforeEach, describe, it, jest } from '@jest/globals';
import { RconSquad } from './rcon-squad';
import { Rcon } from './rcon';
import pino from 'pino';


jest.mock('./rcon');

// // Create a mock for pino logger
// // const mockLogger = {
// //   info: jest.fn(),
// //   warn: jest.fn(),
// //   error: jest.fn(),
// //   debug: jest.fn(),
// //   fatal: jest.fn(),
// //   trace: jest.fn(),
// //   child: jest.fn(() => mockLogger), // Pino child method returns a new logger, which we mock here as well
// // };
// //
// // jest.mock('pino', () => jest.fn(() => mockLogger));
jest.mock('pino');

describe('rcon-squad', () => {
  let squadRcon: RconSquad;
  let mockedRcon: jest.MockedObject<Rcon>;

  beforeEach(() => {
    // Clear previous mock calls and implementations
    jest.clearAllMocks();

    const defaultOptions = {
      host: '127.0.0.1',
      port: 21114,
      password: 'defaultPassword',
      autoReconnectDelay: 5000,
    };

    const logger = pino();
    const mockRconInstance = new Rcon(defaultOptions, logger);
    // May also be accessed like so:
    // (Rcon as unknown as jest.Mocked<typeof Rcon>).mock.instances[0]
    mockedRcon = mockRconInstance as unknown as jest.MockedObject<Rcon>;
    mockedRcon.connect.mockResolvedValue();
    mockedRcon.disconnect.mockResolvedValue();
    squadRcon = new RconSquad(mockRconInstance, logger);
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
});
