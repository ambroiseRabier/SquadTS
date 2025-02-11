
// Namespace to correctly isolate stuff from Wiki with the rest of SquadTS.
export namespace GithubWiki {


  // From https://raw.githubusercontent.com/Squad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json
  // How to generate: npx quicktype -l ts -s json tmp/finished.json > tmp/type.ts
  // Comments are generated using IA and a very small subject of the json.
  //
  // Comment from quicktype lib =>
  //
  // To parse this data:
  //
  //   import { Convert, Finished } from "./file";
  //
  //   const finished = Convert.toFinished(json);
  //
  // These functions will throw an error if the JSON doesn't
  // match the expected interface, even if the JSON is valid.
  //
  // Note: also check https://github.com/Squad-Wiki/squad-wiki-pipeline-map-data/blob/master/doc/json.md for doc (seems only to partially match finished.json)
  //       doc seems slightly out of date, as some field it refers too do not appear in the json.


  // Instead of leaving it inside the JSON, and inside Layer as string[], we may as well use it as a constant.
  export const mapAvailables = ["Anvil_AAS_v1","Anvil_AAS_v2","Anvil_Invasion_v1","Anvil_Invasion_v2","Anvil_RAAS_v1","Anvil_RAAS_v2","Anvil_RAAS_v3","Anvil_RAAS_v4","Anvil_RAAS_v5","Anvil_Skirmish_v1","Anvil_TC_v1","AlBasrah_AAS_v1","AlBasrah_AAS_v2","AlBasrah_AAS_v3","AlBasrah_Insurgency_v1","AlBasrah_Invasion_v1","AlBasrah_Invasion_v2","AlBasrah_Invasion_v3","AlBasrah_Invasion_v4","AlBasrah_Invasion_v5","AlBasrah_Invasion_v6","AlBasrah_Invasion_v7","AlBasrah_Invasion_v8","AlBasrah_Invasion_v9","AlBasrah_RAAS_v1","AlBasrah_Seed_v1","AlBasrah_Skirmish_v1","AlBasrah_Skirmish_v2","AlBasrah_TA_v1","AlBasrah_TC_v1","AlBasrah_TC_v2","Belaya_AAS_v1","Belaya_AAS_v2","Belaya_AAS_v3","Belaya_Invasion_v1","Belaya_Invasion_v2","Belaya_Invasion_v3","Belaya_RAAS_v1","Belaya_RAAS_v2","Belaya_RAAS_v3","Belaya_RAAS_v4","Belaya_RAAS_v5","Belaya_Skirmish_v1","Belaya_TC_v1","Chora_AAS_v1","Chora_AAS_v2","Chora_AAS_v3","Chora_AAS_v4","Chora_AAS_v5","Chora_AAS_v6","Chora_AAS_v7","Chora_Insurgency_v1","Chora_Invasion_v1","Chora_Invasion_v2","Chora_RAAS_v1","Chora_RAAS_v2","Chora_RAAS_v3","Chora_RAAS_v4","Chora_RAAS_v5","Chora_Skirmish_v1","Chora_TC_v1","Fallujah_AAS_v1","Fallujah_AAS_v2","Fallujah_Insurgency_v1","Fallujah_Invasion_v1","Fallujah_Invasion_v2","Fallujah_Invasion_v3","Fallujah_Invasion_v4","Fallujah_Invasion_v5","Fallujah_Invasion_v6","Fallujah_Invasion_v7","Fallujah_RAAS_v1","Fallujah_RAAS_v2","Fallujah_RAAS_v3","Fallujah_RAAS_v4","Fallujah_RAAS_v5","Fallujah_RAAS_v6","Fallujah_RAAS_v7","Fallujah_RAAS_v8","Fallujah_Seed_v1","Fallujah_Seed_v2","Fallujah_Skirmish_v1","Fallujah_Skirmish_v2","Fallujah_TC_v1","Fallujah_TC_v2","FoolsRoad_AAS_v1","FoolsRoad_AAS_v2","FoolsRoad_Destruction_v1","FoolsRoad_Invasion_v1","FoolsRoad_RAAS_v1","FoolsRoad_RAAS_v2","FoolsRoad_RAAS_v3","FoolsRoad_RAAS_v4","FoolsRoad_RAAS_v5","FoolsRoad_Skirmish_v1","FoolsRoad_Skirmish_v2","FoolsRoad_TC_v1","GooseBay_AAS_v1","GooseBay_AAS_v2","GooseBay_Invasion_v1","GooseBay_Invasion_v2","GooseBay_Invasion_v3","GooseBay_Invasion_v4","GooseBay_Invasion_v5","GooseBay_RAAS_v1","GooseBay_RAAS_v2","GooseBay_RAAS_v3","GooseBay_RAAS_v4","GooseBay_Seed_v1","GooseBay_Skirmish_v1","Gorodok_AAS_v1","Gorodok_AAS_v2","Gorodok_AAS_v3","Gorodok_AAS_v4","Gorodok_Destruction_v1","Gorodok_Insurgency_v1","Gorodok_Invasion_v1","Gorodok_Invasion_v2","Gorodok_Invasion_v3","Gorodok_Invasion_v4","Gorodok_RAAS_v01","Gorodok_RAAS_v02","Gorodok_RAAS_v03","Gorodok_RAAS_v04","Gorodok_RAAS_v05","Gorodok_RAAS_v06","Gorodok_RAAS_v07","Gorodok_RAAS_v08","Gorodok_RAAS_v09","Gorodok_RAAS_v10","Gorodok_RAAS_v11","Gorodok_RAAS_v12","Gorodok_RAAS_v13","Gorodok_Skirmish_v1","Gorodok_TC_v1","Gorodok_TC_v2","JensensRange_ADF-PLA","JensensRange_BAF-IMF","JensensRange_CAF-INS","JensensRange_PLANMC-VDV","JensensRange_USA-RGF","JensensRange_USA-TLF","JensensRange_USMC-MEA","Kamdesh_AAS_v1","Kamdesh_Insurgency_v1","Kamdesh_Insurgency_v2","Kamdesh_Invasion_v1","Kamdesh_Invasion_v2","Kamdesh_Invasion_v3","Kamdesh_Invasion_v4","Kamdesh_Invasion_v5","Kamdesh_Invasion_v6","Kamdesh_Invasion_v7","Kamdesh_RAAS_v1","Kamdesh_RAAS_v2","Kamdesh_RAAS_v3","Kamdesh_RAAS_v4","Kamdesh_RAAS_v5","Kamdesh_RAAS_v6","Kamdesh_RAAS_v7","Kamdesh_Skirmish_v1","Kamdesh_TC_v1","Kamdesh_TC_v2","Kamdesh_TC_v3","Kamdesh_TC_v4","Kohat_AAS_v1","Kohat_AAS_v2","Kohat_AAS_v3","Kohat_Insurgency_v1","Kohat_Invasion_v1","Kohat_Invasion_v2","Kohat_Invasion_v3","Kohat_Invasion_v4","Kohat_Invasion_v5","Kohat_RAAS_v01","Kohat_RAAS_v02","Kohat_RAAS_v03","Kohat_RAAS_v04","Kohat_RAAS_v05","Kohat_RAAS_v06","Kohat_RAAS_v07","Kohat_RAAS_v08","Kohat_RAAS_v09","Kohat_RAAS_v10","Kohat_RAAS_v11","Kohat_Skirmish_v1","Kohat_TC_v1","Kokan_AAS_v1","Kokan_AAS_v2","Kokan_AAS_v3","Kokan_Insurgency_v1","Kokan_Invasion_v1","Kokan_RAAS_v1","Kokan_RAAS_v2","Kokan_RAAS_v3","Kokan_RAAS_v4","Kokan_RAAS_v5","Kokan_Skirmish_v1","Kokan_TC_v1","Lashkar_AAS_v1","Lashkar_AAS_v2","Lashkar_AAS_v3","Lashkar_AAS_v4","Lashkar_Insurgency_v1","Lashkar_Invasion_v1","Lashkar_Invasion_v2","Lashkar_Invasion_v3","Lashkar_Invasion_v4","Lashkar_Invasion_v5","Lashkar_RAAS_v1","Lashkar_RAAS_v2","Lashkar_RAAS_v3","Lashkar_RAAS_v4","Lashkar_RAAS_v5","Lashkar_Skirmish_v1","Lashkar_TC_v1","Lashkar_TC_v2","Lashkar_TC_v3","Lashkar_TC_v4","Lashkar_TC_v5","Logar_AAS_v1","Logar_AAS_v2","Logar_AAS_v3","Logar_AAS_v4","Logar_Insurgency_v1","Logar_RAAS_v1","Logar_RAAS_v2","Logar_Seed_v1","Logar_Skirmish_v1","Logar_TC_v1","Manicouagan_AAS_v1","Manicouagan_AAS_v2","Manicouagan_AAS_v3","Manicouagan_AAS_v4","Manicouagan_AAS_v5","Manicouagan_Invasion_v1","Manicouagan_Invasion_v2","Manicouagan_Invasion_v3","Manicouagan_Invasion_v4","Manicouagan_Invasion_v5","Manicouagan_Invasion_v6","Manicouagan_Invasion_v7","Manicouagan_Invasion_v8","Manicouagan_Invasion_v9","Manicouagan_RAAS_v01","Manicouagan_RAAS_v02","Manicouagan_RAAS_v03","Manicouagan_RAAS_v04","Manicouagan_RAAS_v05","Manicouagan_RAAS_v06","Manicouagan_RAAS_v07","Manicouagan_RAAS_v08","Manicouagan_RAAS_v09","Manicouagan_RAAS_v10","Manicouagan_RAAS_v11","Manicouagan_RAAS_v12","Manicouagan_RAAS_v13","Manicouagan_RAAS_v14","Manicouagan_RAAS_v15","Manicouagan_Seed_v1","Manicouagan_Skirmish_v1","Manicouagan_Skirmish_v2","Manicouagan_Skirmish_v3","Mestia_AAS_v1","Mestia_AAS_v2","Mestia_Invasion_v1","Mestia_Invasion_v2","Mestia_RAAS_v1","Mestia_RAAS_v2","Mestia_Skirmish_v1","Mestia_TC_v1","Mutaha_AAS_v1","Mutaha_AAS_v2","Mutaha_AAS_v3","Mutaha_AAS_v4","Mutaha_Invasion_v1","Mutaha_Invasion_v2","Mutaha_Invasion_v3","Mutaha_Invasion_v4","Mutaha_Invasion_v5","Mutaha_RAAS_v1","Mutaha_RAAS_v2","Mutaha_RAAS_v3","Mutaha_RAAS_v4","Mutaha_RAAS_v5","Mutaha_RAAS_v6","Mutaha_RAAS_v7","Mutaha_RAAS_v8","Mutaha_Seed_v1","Mutaha_Skirmish_v1","Mutaha_Tanks_v1","Mutaha_TC_v1","Mutaha_TC_v2","Narva_AAS_v1","Narva_AAS_v2","Narva_AAS_v3","Narva_AAS_v4","Narva_Destruction_v1","Narva_Invasion_v1","Narva_Invasion_v2","Narva_Invasion_v3","Narva_Invasion_v4","Narva_Invasion_v5","Narva_RAAS_v1","Narva_RAAS_v2","Narva_RAAS_v3","Narva_RAAS_v4","Narva_RAAS_v5","Narva_RAAS_v6","Narva_RAAS_v7","Narva_Skirmish_v1","Narva_TA_v1","Narva_TC_v1","Narva_TC_v2","PacificProvingGrounds_AAS_v1","PacificProvingGrounds_AAS_v2","PacificProvingGrounds_PLANMC-VDV","PacificProvingGrounds_Seed_v1","PacificProvingGrounds_USMC-PLA","PacificProvingGrounds_USMC-RGF","Skorpo_AAS_v1","Skorpo_Invasion_v1","Skorpo_Invasion_v2","Skorpo_Invasion_v3","Skorpo_Invasion_v4","Skorpo_RAAS_v1","Skorpo_RAAS_v2","Skorpo_RAAS_v3","Skorpo_RAAS_v4","Skorpo_RAAS_v5","Skorpo_Skirmish_v1","Skorpo_TC_v1","Skorpo_TC_v2","Skorpo_TC_v3","Sumari_AAS_v1","Sumari_AAS_v2","Sumari_AAS_v3","Sumari_AAS_v4","Sumari_AAS_v5","Sumari_Insurgency_v1","Sumari_Invasion_v1","Sumari_RAAS_v1","Sumari_RAAS_v2","Sumari_RAAS_v3","Sumari_Seed_v1","Sumari_Seed_v2","Sumari_Seed_v3","Sumari_Seed_v4","Sumari_Skirmish_v1","Sumari_TC_v1","Tallil_AAS_v1","Tallil_AAS_v2","Tallil_Invasion_v1","Tallil_Invasion_v2","Tallil_Invasion_v3","Tallil_Invasion_v4","Tallil_Invasion_v5","Tallil_Invasion_v6","Tallil_RAAS_v1","Tallil_RAAS_v2","Tallil_RAAS_v3","Tallil_RAAS_v4","Tallil_RAAS_v5","Tallil_RAAS_v6","Tallil_RAAS_v7","Tallil_RAAS_v8","Tallil_RAAS_v9","Tallil_Seed_v1","Tallil_Seed_v2","Tallil_Skirmish_v1","Tallil_Skirmish_v2","Tallil_Skirmish_v3","Tallil_Tanks_v1","Tallil_Tanks_v2","Tallil_TA_v1","Tallil_TC_v1","Tutorial_Helicopter","Tutorial_Infantry","Yehorivka_AAS_v1","Yehorivka_AAS_v2","Yehorivka_AAS_v3","Yehorivka_AAS_v4","Yehorivka_Destruction_v1","Yehorivka_Invasion_v1","Yehorivka_Invasion_v2","Yehorivka_Invasion_v3","Yehorivka_Invasion_v4","Yehorivka_Invasion_v5","Yehorivka_RAAS_v01","Yehorivka_RAAS_v02","Yehorivka_RAAS_v03","Yehorivka_RAAS_v04","Yehorivka_RAAS_v05","Yehorivka_RAAS_v06","Yehorivka_RAAS_v07","Yehorivka_RAAS_v08","Yehorivka_RAAS_v09","Yehorivka_RAAS_v10","Yehorivka_RAAS_v11","Yehorivka_RAAS_v12","Yehorivka_RAAS_v13","Yehorivka_RAAS_v14","Yehorivka_RAAS_v15","Yehorivka_Skirmish_v1","Yehorivka_Skirmish_v2","Yehorivka_Skirmish_v3","Yehorivka_TA_v1","Yehorivka_TC_v1","Yehorivka_TC_v2","Yehorivka_TC_v3","BlackCoast_AAS_v1","BlackCoast_AAS_v2","BlackCoast_Invasion_v1","BlackCoast_Invasion_v2","BlackCoast_Invasion_v3","BlackCoast_Invasion_v4","BlackCoast_Invasion_v5","BlackCoast_Invasion_v6","BlackCoast_RAAS_v1","BlackCoast_RAAS_v2","BlackCoast_RAAS_v3","BlackCoast_RAAS_v4","BlackCoast_RAAS_v5","BlackCoast_RAAS_v6","BlackCoast_Seed_v1","BlackCoast_Seed_v2","BlackCoast_Skirmish_v1","Harju_AAS_v1","Harju_AAS_v2","Harju_AAS_v3","Harju_Invasion_v1","Harju_Invasion_v2","Harju_Invasion_v3","Harju_Invasion_v4","Harju_Invasion_v5","Harju_RAAS_v1","Harju_RAAS_v2","Harju_RAAS_v3","Harju_RAAS_v4","Harju_RAAS_v5","Harju_RAAS_v6","Harju_Seed_v1","Harju_Skirmish_v1","Harju_Skirmish_v2","Sanxian_AAS_v1","Sanxian_AAS_v2","Sanxian_AAS_v3","Sanxian_Invasion_v1","Sanxian_Invasion_v2","Sanxian_RAAS_v1","Sanxian_RAAS_v2","Sanxian_Seed_v1","Sanxian_Skirmish_v1"] as const;

  export interface Layer {
    Maps: Map[];
    mapsavailable: typeof mapAvailables;
  }

  export interface Map {
    // Display name, e.g., "Anvil AAS v1"
    Name: string;
    // Layer ID (used in LayerRotation.cfg), e.g., "Anvil_AAS_v1"
    rawName: string;
    // Unreal Engine 4 file name for the layer, e.g., "Anvil_AAS_v1"
    levelName: string;
    // e.g., "Anvil"
    mapId: string;
    // Name of level (Al Basrah, Belaya, etc.), e.g., "Anvil"
    mapName: string;
    // Gamemode derived from Name (NOT accurate)
    gamemode: Gamemode;
    // Layer version derived from Name (NOT accurate), e.g., "v1"
    layerVersion: string;
    // Texture name used for minimap. Useful to see which maps may be smaller
    // (Many skirmish maps, for example), e.g., "Anvil_Minimap"
    minimapTexture: string;
    // e.g., 300 (maximum helicopter altitude threshold)
    heliAltThreshold: number;
    // e.g., "T_Depthmap_Anvil" (depth map texture used for rendering)
    depthMapTexture: string;
    // Unreal Engine 4 file name for the lighting, e.g., "LL_Anvil_Mid_Day"
    lightingLevel?: string;
    // Lighting type translated from lightingLevel, e.g., "Sunny Mid Day"
    lighting?: string;
    // Array of points of borders. Newer maps have a border spline (think line)
    // that follows the outside of the map. Each point in the array is a point on
    // the spline. Older maps do not have this spline and instead have two opposite
    // points on the map that make a rectangle.
    border: Border[];
    // e.g., "mapTexture" or "spline"
    borderType: Type;
    // Type of map size calculation
    mapSizeType: Type;
    // Map size calculated from border (Rough estimate), e.g., "3.0x2.9 km"
    mapSize: string;
    mapTextureCorners: Border[];
    assets: Assets;
    // Number of capture points
    capturePoints: CapturePoints;
    objectives: { [key: string]: ObjectiveValue };
    mapAssets: MapAssets;
    // Factions that are on this layer (team 1 and team 2)
    team1: Team;
    // Factions that are on this layer (team 1 and team 2)
    team2: Team;
  }

  export interface Assets {
    vehicleSpawners: VehicleSpawner[];
    deployables: Deployable[];
    helipads: Deployable[];
  }

  export interface Deployable {
    type: DeployableType;
    icon: DeployableIcon;
    team: AttackingTeam;
    location_x: number;
    location_y: number;
    location_z: number;
    rotation_x: number;
    rotation_y: number;
    rotation_z: number;
  }

  export enum DeployableIcon {
    DeployableAmmocrate = "deployable_ammocrate",
    DeployableHab = "deployable_hab",
    DeployableHelipad = "deployable_helipad",
    InventoryCategoryRepair = "inventory_category_repair",
    Questionmark = "questionmark",
  }

  export enum AttackingTeam {
    TeamNeutral = "Team Neutral",
    TeamOne = "Team One",
    TeamTwo = "Team Two",
  }

  export enum DeployableType {
    AmmoCrate = "Ammo Crate",
    BPHelicopterRepairPadUSA1 = "BP_helicopter_repair_padUSA1",
    BPHelicopterRepairPadUSA2 = "BP_helicopter_repair_padUSA2",
    BPHelicopterRepairPadUSA3 = "BP_helicopter_repair_padUSA3",
    BPHelicopterRepairPadUSA4 = "BP_helicopter_repair_padUSA4",
    Empty = "",
    Hab = "HAB",
    RepairStation = "Repair Station",
    Team1CarrierHelicopterRepairPad1 = "Team1CarrierHelicopterRepairPad1",
    Team1CarrierHelicopterRepairPad2 = "Team1CarrierHelicopterRepairPad2",
    Team1CarrierHelicopterRepairPad3 = "Team1CarrierHelicopterRepairPad3",
    Team1HelicopterRepairPad = "Team1HelicopterRepairPad",
    Team1HelicopterRepairPad1 = "Team1HelicopterRepairPad1",
    Team1HelicopterRepairPad10 = "Team1HelicopterRepairPad1_0",
    Team1HelicopterRepairPad11 = "Team1HelicopterRepairPad1_1",
    Team1HelicopterRepairPad12 = "Team1HelicopterRepairPad1_2",
    Team1HelicopterRepairPad2 = "Team1HelicopterRepairPad2",
    Team1HelicopterRepairPad21 = "Team1HelicopterRepairPad2_1",
    Team1HelicopterRepairPad23 = "Team1HelicopterRepairPad2_3",
    Team1HelicopterRepairPad3 = "Team1HelicopterRepairPad3",
    Team1HelicopterRepairPad4 = "Team1HelicopterRepairPad4",
    Team1HelicopterRepairPad5 = "Team1HelicopterRepairPad5",
    Team1HelicopterRepairPad6 = "Team1HelicopterRepairPad6",
    Team1Helipad1 = "Team1Helipad1",
    Team1Helipad2 = "Team1Helipad2",
    Team1Helipad21 = "Team1Helipad2_1",
    Team1MainHelipad1 = "Team1MainHelipad1",
    Team1MainHelipad2 = "Team1MainHelipad2",
    Team2HelicopterRepairPad1 = "Team2HelicopterRepairPad1",
    Team2HelicopterRepairPad10 = "Team2HelicopterRepairPad1_0",
    Team2HelicopterRepairPad11 = "Team2HelicopterRepairPad1_1",
    Team2HelicopterRepairPad13 = "Team2HelicopterRepairPad1_3",
    Team2HelicopterRepairPad14 = "Team2HelicopterRepairPad1_4",
    Team2HelicopterRepairPad2 = "Team2HelicopterRepairPad2",
    Team2HelicopterRepairPad21 = "Team2HelicopterRepairPad2_1",
    Team2HelicopterRepairPad24 = "Team2HelicopterRepairPad2_4",
    Team2HelicopterRepairPad25 = "Team2HelicopterRepairPad2_5",
    Team2HelicopterRepairPad3 = "Team2HelicopterRepairPad3",
    Team2HelicopterRepairPad35 = "Team2HelicopterRepairPad3_5",
    Team2HelicopterRepairPad4 = "Team2HelicopterRepairPad4",
    Team2HelicopterRepairPad5 = "Team2HelicopterRepairPad5",
    Team2HelicopterRepairPad6 = "Team2HelicopterRepairPad6",
    Team2Helipad1 = "Team2Helipad1",
    Team2Helipad13 = "Team2Helipad1_3",
    Team2Helipad2 = "Team2Helipad2",
    Team2Helipad22 = "Team2Helipad2_2",
    Team2MainHelipad1 = "Team2MainHelipad1",
    Team2MainHelipad2 = "Team2MainHelipad2",
    TypeTeam1HelicopterRepairPad1 = "Team1helicopterRepairPad1",
    TypeTeam1HelicopterRepairPad2 = "Team1helicopterRepairPad2",
  }

  export interface VehicleSpawner {
    icon: DeployableIcon;
    // e.g., "Team2SpawnerGroundAny1" (unique name of the spawner)
    name: string;
    // e.g., "Team Two" (team associated with the spawner)
    type: AttackingTeam;
    size: Size;
    // e.g., 0 (maximum number of vehicles that can spawn from this spawner)
    maxNum: number;
    // e.g., 67953.59375 (X-coordinate of the spawner location)
    location_x: number;
    // e.g., -1039.854248046875 (Y-coordinate of the spawner location)
    location_y: number;
    // e.g., -5673.85546875 (Z-coordinate of the spawner location)
    location_z: number;
    // e.g., 0 (X rotation of the spawner object)
    rotation_x: number;
    // e.g., 0 (Y rotation of the spawner object)
    rotation_y: number;
    // e.g., 0 (Z rotation of the spawner object)
    rotation_z: number;
    typePriorities: TypePriority[];
    tagPriorities: any[];
  }

  export enum Size {
    Apc = "APC",
    Bike = "Bike",
    Boat = "Boat",
    Car = "Car",
    Helicopter = "Helicopter",
    Mbt = "MBT",
    QuadBike = "QuadBike",
  }

  export interface TypePriority {
    name: VehType;
    icon: string;
  }

  export enum VehType {
    Apc = "APC",
    Ifv = "IFV",
    Logi = "LOGI",
    Ltv = "LTV",
    Mbt = "MBT",
    Mgs = "MGS",
    Mrap = "MRAP",
    Rsv = "RSV",
    SPA = "SPA",
    Spaa = "SPAA",
    Td = "TD",
    Tran = "TRAN",
    Uh = "UH",
    Ultv = "ULTV",
  }

  export interface Border {
    point?: number;
    location_x: number;
    location_y: number;
    location_z: number;
    name?: string;
  }

  export enum Type {
    MapTexture = "mapTexture",
    Spline = "spline",
  }

  export interface CapturePoints {
    type: CapturePointsType;
    lanes: Lanes;
    points: Clusters;
    clusters: Clusters;
    hexs: Hexs;
    objectiveSpawnLocations: Border[];
    destructionObject: DestructionObject;
  }

  export interface Clusters {
    links?: Link[];
    pointsOrder?: string[];
    numberOfPoints?: number;
    listOfMains?: ClustersListOfMain[];
    objectives?: ObjectiveElement[];
  }

  export interface Link {
    name: LinkName;
    nodeA: string;
    nodeB: string;
  }

// Note: It seems like a string starting with "Link" followed by any number,
//       however, we parsed the full JSON, meaning Link31 do not exist
//       until maybe next Squad update.
  export enum LinkName {
    Link0 = "Link0",
    Link1 = "Link1",
    Link10 = "Link10",
    Link11 = "Link11",
    Link12 = "Link12",
    Link13 = "Link13",
    Link14 = "Link14",
    Link15 = "Link15",
    Link16 = "Link16",
    Link17 = "Link17",
    Link18 = "Link18",
    Link19 = "Link19",
    Link2 = "Link2",
    Link20 = "Link20",
    Link21 = "Link21",
    Link22 = "Link22",
    Link23 = "Link23",
    Link24 = "Link24",
    Link25 = "Link25",
    Link26 = "Link26",
    Link27 = "Link27",
    Link28 = "Link28",
    Link29 = "Link29",
    Link3 = "Link3",
    Link30 = "Link30",
    Link4 = "Link4",
    Link5 = "Link5",
    Link6 = "Link6",
    Link7 = "Link7",
    Link8 = "Link8",
    Link9 = "Link9",
  }

  export enum ClustersListOfMain {
    The00Team1Main = "00-Team1 Main",
    The00Team2Main = "00-Team2 Main",
    The00USAMain = "00-USA Main",
    The100MILMain = "100-MIL Main",
    The100RUSMain = "100-RUS Main",
    The100Team1Main = "100-Team1 Main",
    The100Team2Main = "100-Team2 Main",
  }

  export interface ObjectiveElement {
    name: ObjectiveName;
    // e.g., "00-Team1Main" (unique name or identifier associated with the objective)
    objectName: string;
    // e.g., -160541.9375 (X-coordinate of the objective's location)
    location_x: number;
    // e.g., -183808.375 (Y-coordinate of the objective's location)
    location_y: number;
    // e.g., -4465.359375 (Z-coordinate of the objective's location)
    location_z: number;
    objects: NoDeployZoneObject[];
    // e.g., 1 (position of the point, indicating its order or priority)
    pointPosition?: number;
  }

  export enum ObjectiveName {
    CentralObjective = "Central Objective",
    Crossroads = "Crossroads",
    GasTown = "Gas Town",
    Main = "Main",
    TheMotherbase = "The Motherbase",
  }

  export interface NoDeployZoneObject {
    location_x: number;
    location_y: number;
    location_z: number;
    sphereRadius: string;
    boxExtent: Border;
  }

  export interface DestructionObject {
    attackingTeam?: AttackingTeam;
    delayBetweenPhases?: number;
    objectiveClass?: string;
    roundTimerIncrease?: number;
    timerIncreasePerPhaseActive?: boolean;
    phases?: Phase[];
    noDeployZones?: NoDeployZone[];
  }

  export interface NoDeployZone {
    name: string;
    type: string;
    location_x: number;
    location_y: number;
    location_z: number;
    objects: NoDeployZoneObject[];
  }

  export interface Phase {
    PhaseNumber: number;
    phaseObjectives: PhaseObjective[];
  }

  export interface PhaseObjective {
    numberOfSpots: number;
    minDistanceBetweenSpots: number;
    numberOfCaches: number;
    splinePoints: Border[];
  }

  export interface Hexs {
    startOwnership?: number;
    endOwnership?: number;
    "startRandomAnchorDist:"?: number;
    "endRandomAnchorDist:"?: number;
    team1Anchors?: number[];
    team2Anchors?: number[];
    hexs?: Hex[];
  }

  export interface Hex {
    name: string;
    hexNum: number;
    initialTeam: string;
    flagName: string;
    location_x: number;
    location_y: number;
    location_z: number;
    sphereRadius: number;
    boxExtent: Border;
  }

  export interface Lanes {
    links?: Link[];
    listOfLanes?: string[];
    laneObjects?: { [key: string]: LaneObject };
  }

  export interface LaneObject {
    name: string;
    laneLinks: Link[];
    pointsOrder: string[];
    numberOfPoints: number;
    listOfMains: LaneObjectListOfMain[];
  }

  export enum LaneObjectListOfMain {
    ListOfMain00Team1Main = "00-Team 1 Main",
    ListOfMain100Team2Main = "100-Team 2 Main",
    The00MILMain = "00-MIL Main",
    The00Main = "00-Main",
    The00Team1Main = "00-Team1 Main",
    The00Team2Main = "00-Team2 Main",
    The100Team1Main = "100-Team1 Main",
    The100Team2Main = "100-Team2 Main",
    Z100Team2Main = "Z100-Team2 Main",
    ZTeam2Main = "Z-Team2 Main",
  }

  export enum CapturePointsType {
    AASGraph = "AAS Graph",
    Destruction = "Destruction",
    Insurgency = "Insurgency",
    InvasionRandomGraph = "Invasion Random Graph",
    RAASGraph = "RAASGraph",
    RAASLaneGraph = "RAASLane Graph",
    TCHexZone = "TC Hex Zone",
    TrackAttack = "Track Attack",
    Unknown = "Unknown",
  }

  export enum Gamemode {
    Aas = "AAS",
    Destruction = "Destruction",
    Insurgency = "Insurgency",
    Invasion = "Invasion",
    Raas = "RAAS",
    Seed = "Seed",
    Skirmish = "Skirmish",
    Tanks = "Tanks",
    TerritoryControl = "Territory Control",
    TrackAttack = "Track Attack",
    Training = "Training",
    Tutorial = "Tutorial",
  }

  export interface MapAssets {
    protectionZones: ProtectionZone[];
    stagingZones: StagingZone[];
  }

  export interface ProtectionZone {
    displayName: DisplayName;
    deployableLockDistance: number;
    teamid: string;
    objects: ProtectionZoneObject[];
  }

  export enum DisplayName {
    DisplayNameTeam1ProtectionZone = "Team 1 Protection Zone",
    DisplayNameTeam1ProtectionZone2 = "Team1 Protection Zone2",
    DisplayNameTeam2ProtectionZone = "Team2 ProtectionZone",
    DisplayNameTeam2ProtectionZone2 = "Team2 Protection Zone2",
    MosqueBlocker = "Mosque Blocker",
    PurpleTeam2ProtectionZone = "Team 2 Protection Zone",
    Team1CarrierProtectionZone = "Team1 Carrier Protection Zone",
    Team1CarrierProtectionZone1 = "Team1 Carrier Protection Zone 1",
    Team1EForwardProtectionZone1 = "Team1 E Forward Protection Zone 1",
    Team1EastProtectionZone1 = "Team1 East Protection Zone 1",
    Team1ForwardProtectionZone1 = "Team1 Forward Protection Zone 1",
    Team1MainProtectionZone1 = "Team1 Main Protection Zone 1",
    Team1ProtectionZone = "Team1 Protection Zone",
    Team1ProtectionZone1 = "Team1 Protection Zone 1",
    Team1ProtectionZone2 = "Team1 Protection Zone 2",
    Team1ProtectionZone3 = "Team1 Protection Zone 3",
    Team1ProtectionZone4 = "Team1 Protection Zone 4",
    Team1WForwardProtectionZone1 = "Team1 W Forward Protection Zone 1",
    Team1WestProtectionZone1 = "Team1 West Protection Zone 1",
    Team2ForwardProtectionZone1 = "Team2 Forward Protection Zone 1",
    Team2MainProtectionZone1 = "Team2 Main Protection Zone 1",
    Team2ProtectionZone = "Team2 Protection Zone",
    Team2ProtectionZone1 = "Team2 Protection Zone 1",
    Team2ProtectionZone2 = "Team2 Protection Zone 2",
    Team2ProtectionZone3 = "Team2 Protection Zone 3",
  }

  export interface ProtectionZoneObject {
    sphereRadius: number;
    location_x: number;
    location_y: number;
    location_z: number;
    boxExtent: Border;
    name?: string;
  }

  export interface StagingZone {
    name: StagingZoneName;
    objects: ProtectionZoneObject[];
  }

  export enum StagingZoneName {
    NameTeam1StagingZone = "Team1 StagingZone",
    NameTeam1StagingZone2 = "Team1 Staging Zone2",
    NameTeam2StagingZone = "Team2 StagingZone",
    NameTeam2StagingZone2 = "Team2 Staging Zone2",
    Team1CarrierStagingZone = "Team1 Carrier Staging Zone",
    Team1MainStagingZone1 = "Team1 Main Staging Zone 1",
    Team1StagingZone = "Team1 Staging Zone",
    Team1StagingZone1 = "Team1 Staging Zone 1",
    Team1StagingZone2 = "Team1 Staging Zone 2",
    Team1StagingZoneMain = "Team1 Staging Zone Main",
    Team1StagingZoneOPChaxton = "Team1 Staging Zone OP Chaxton",
    Team1StagingZoneOPLeeks = "Team1 Staging Zone OP Leeks",
    Team1StagingZoneVCP = "Team1 Staging Zone VCP",
    Team2MainStagingZone1 = "Team2 Main Staging Zone 1",
    Team2StagingZone = "Team2 Staging Zone",
    Team2StagingZone1 = "Team2 Staging Zone 1",
    Team2StagingZone2 = "Team2 Staging Zone 2",
    Team2StagingZoneEast = "Team2 Staging Zone East",
    Team2StagingZoneWest = "Team2 Staging Zone West",
    Team2StagingZonew = "Team2 Staging Zonew",
  }

  export interface ObjectiveValue {
    name: string;
    objectName?: string;
    location_x?: number;
    location_y?: number;
    location_z?: number;
    objects?: PointObject[];
    pointPosition: number;
    avgLocation?: Border;
    points?: Point[];
  }

  export interface PointObject {
    location_x: number;
    location_y: number;
    location_z: number;
    sphereRadius: string;
    boxExtent: Border;
    capsuleRadius?: string;
    capsuleLength?: string;
  }

  export interface Point {
    name: string;
    objectName: string;
    location_x: number;
    location_y: number;
    location_z: number;
    objects: PointObject[];
  }

  export interface Team {
    // e.g., true (indicates if the team consists of a single faction)
    singleFaction: boolean;
    // Faction name
    faction: Faction;
    shortName: ShortName;
    // More specific version of faction name; this will be displayed in who won in logs.
    // e.g., "5th Battalion, Royal Australian Regiment"
    teamSetupName: string;
    // Tickets the faction has at the start of the game.
    // e.g., 300 (initial number of tickets for the team)
    tickets: number;
    // e.g., true (indicates if vehicles are disabled for the team)
    disabledVeh: boolean;
    // e.g., 3 (level of intelligence available on the enemy team)
    // Intel on the enemy team.
    intelOnEnemy: number;
    // Percentage of players in a game allocated to the team.
    // 50% means the team would get 50/100 players. 25% would mean the team would get 25/100 players.
    // e.g., 50
    playerPercent: number;
    // Boolean to tell if there is a commander.
    // e.g., true (indicates if the team has a commander role)
    commander: boolean;
    vehicles: Vehicle[];
  }

  export enum Faction {
    AustralianDefenceForce = "Australian Defence Force",
    BritishArmedForces = "British Armed Forces",
    CanadianArmedForces = "Canadian Armed Forces",
    InsurgentForces = "Insurgent Forces",
    IrregularMilitiaForces = "Irregular Militia Forces",
    MiddleEasternAlliance = "Middle Eastern Alliance",
    PLANavyMarineCorps = "PLA Navy Marine Corps",
    PeopleSLiberationArmy = "People's Liberation Army",
    RussianAirborneForces = "Russian Airborne Forces",
    RussianGroundForces = "Russian Ground Forces",
    TurkishLandForces = "Turkish Land Forces",
    UnitedStatesArmy = "United States Army",
    UnitedStatesMarineCorps = "United States Marine Corps",
  }

  export enum ShortName {
    Adf = "ADF",
    Baf = "BAF",
    Caf = "CAF",
    Imf = "IMF",
    Ins = "INS",
    Mea = "MEA",
    Pla = "PLA",
    Planmc = "PLANMC",
    Rgf = "RGF",
    Tlf = "TLF",
    Usa = "USA",
    Usmc = "USMC",
    Vdv = "VDV",
  }

  export interface Vehicle {
    // e.g., "HX60 Transport" (type or name of the vehicle)
    type: string;
    icon: VehicleIcon;
    // e.g., "BP_Aussie_Util_Truck_C" (detailed or raw identifier for the vehicle)
    rawType: string;
    // e.g., 1 (number of vehicles available of this type)
    count: number;
    // e.g., 6 (delay in seconds before the vehicle becomes accessible)
    delay: number;
    // e.g., 3 (respawn time in seconds for the vehicle)
    respawnTime: number;
    vehType: VehType;
    spawnerSize: Size;
  }

  export enum VehicleIcon {
    MapAntiair = "map_antiair",
    MapApc = "map_apc",
    MapBoat = "map_boat",
    MapIfv = "map_ifv",
    MapJeep = "map_jeep",
    MapJeepAntitank = "map_jeep_antitank",
    MapJeepArtillery = "map_jeep_artillery",
    MapJeepLogistics = "map_jeep_logistics",
    MapJeepTransport = "map_jeep_transport",
    MapJeepTurret = "map_jeep_turret",
    MapMotorcycle = "map_motorcycle",
    MapTank = "map_tank",
    MapTrackedapc = "map_trackedapc",
    MapTrackedifv = "map_trackedifv",
    MapTrackedjeep = "map_trackedjeep",
    MapTransporthelo = "map_transporthelo",
    MapTruckAntiair = "map_truck_antiair",
    MapTruckLogistics = "map_truck_logistics",
    MapTruckTransport = "map_truck_transport",
    MapTruckTransportArmed = "map_truck_transport_armed",
    TMapApcOpenTurret = "T_map_apc_open_turret",
    TMapBoatLogistics = "T_map_boat_logistics",
    TMapBoatOpenturret = "T_map_boat_openturret",
    TMapMgs = "T_map_mgs",
    TMapTrackedapcLogistics = "T_map_trackedapc_logistics",
    TMapTrackedapcNoturret = "T_map_trackedapc_noturret",
    TMapTrackedrecon = "T_map_trackedrecon",
    TMapTruckArtillery = "T_map_truck_artillery",
    TMapWheeledrecon = "T_map_wheeledrecon",
  }

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
  export class Convert {
    public static toFinished(json: string): Layer {
      // Note it is named Finished because the json is named finished.json
      // but we renamed the Base interface from Finished to LayerGithub.
      return cast(JSON.parse(json), r("Finished"));
    }

    public static finishedToJson(value: Layer): string {
      return JSON.stringify(uncast(value, r("Finished")), null, 2);
    }
  }

  function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
  }

  function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
      if (typ.length === 2 && typ[0] === undefined) {
        return `an optional ${prettyTypeName(typ[1])}`;
      } else {
        return `one of [${typ.map(a => {
          return prettyTypeName(a);
        }).join(", ")}]`;
      }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
      return typ.literal;
    } else {
      return typeof typ;
    }
  }

  function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.json] = {key: p.js, typ: p.typ});
      typ.jsonToJS = map;
    }
    return typ.jsonToJS;
  }

  function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => map[p.js] = {key: p.json, typ: p.typ});
      typ.jsToJSON = map;
    }
    return typ.jsToJSON;
  }

  function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
      if (typeof typ === typeof val) return val;
      return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
      // val must validate against one typ in typs
      const l = typs.length;
      for (let i = 0; i < l; i++) {
        const typ = typs[i];
        try {
          return transform(val, typ, getProps);
        } catch (_) {
        }
      }
      return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
      if (cases.indexOf(val) !== -1) return val;
      return invalidValue(cases.map(a => {
        return l(a);
      }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
      // val must be an array with no invalid elements
      if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
      return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
      if (val === null) {
        return null;
      }
      const d = new Date(val);
      if (isNaN(d.valueOf())) {
        return invalidValue(l("Date"), val, key, parent);
      }
      return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
      if (val === null || typeof val !== "object" || Array.isArray(val)) {
        return invalidValue(l(ref || "object"), val, key, parent);
      }
      const result: any = {};
      Object.getOwnPropertyNames(props).forEach(key => {
        const prop = props[key];
        const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
        result[prop.key] = transform(v, prop.typ, getProps, key, ref);
      });
      Object.getOwnPropertyNames(val).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(props, key)) {
          result[key] = transform(val[key], additional, getProps, key, ref);
        }
      });
      return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
      if (val === null) return val;
      return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
      ref = typ.ref;
      typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
      return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
        : typ.hasOwnProperty("arrayItems") ? transformArray(typ.arrayItems, val)
          : typ.hasOwnProperty("props") ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
  }

  function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
  }

  function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
  }

  function l(typ: any) {
    return {literal: typ};
  }

  function a(typ: any) {
    return {arrayItems: typ};
  }

  function u(...typs: any[]) {
    return {unionMembers: typs};
  }

  function o(props: any[], additional: any) {
    return {props, additional};
  }

  function m(additional: any) {
    return {props: [], additional};
  }

  function r(name: string) {
    return {ref: name};
  }

  const typeMap: any = {
    "Finished": o([
      {json: "Maps", js: "Maps", typ: a(r("Map"))},
      {json: "mapsavailable", js: "mapsavailable", typ: a("")},
    ], false),
    "Map": o([
      {json: "Name", js: "Name", typ: ""},
      {json: "rawName", js: "rawName", typ: ""},
      {json: "levelName", js: "levelName", typ: ""},
      {json: "mapId", js: "mapId", typ: ""},
      {json: "mapName", js: "mapName", typ: ""},
      {json: "gamemode", js: "gamemode", typ: r("Gamemode")},
      {json: "layerVersion", js: "layerVersion", typ: ""},
      {json: "minimapTexture", js: "minimapTexture", typ: ""},
      {json: "heliAltThreshold", js: "heliAltThreshold", typ: 0},
      {json: "depthMapTexture", js: "depthMapTexture", typ: ""},
      {json: "lightingLevel", js: "lightingLevel", typ: u(undefined, "")},
      {json: "lighting", js: "lighting", typ: u(undefined, "")},
      {json: "borderType", js: "borderType", typ: r("Type")},
      {json: "mapSizeType", js: "mapSizeType", typ: r("Type")},
      {json: "border", js: "border", typ: a(r("Border"))},
      {json: "mapSize", js: "mapSize", typ: ""},
      {json: "mapTextureCorners", js: "mapTextureCorners", typ: a(r("Border"))},
      {json: "assets", js: "assets", typ: r("Assets")},
      {json: "capturePoints", js: "capturePoints", typ: r("CapturePoints")},
      {json: "objectives", js: "objectives", typ: m(r("ObjectiveValue"))},
      {json: "mapAssets", js: "mapAssets", typ: r("MapAssets")},
      {json: "team1", js: "team1", typ: r("Team")},
      {json: "team2", js: "team2", typ: r("Team")},
    ], false),
    "Assets": o([
      {json: "vehicleSpawners", js: "vehicleSpawners", typ: a(r("VehicleSpawner"))},
      {json: "deployables", js: "deployables", typ: a(r("Deployable"))},
      {json: "helipads", js: "helipads", typ: a(r("Deployable"))},
    ], false),
    "Deployable": o([
      {json: "type", js: "type", typ: r("DeployableType")},
      {json: "icon", js: "icon", typ: r("DeployableIcon")},
      {json: "team", js: "team", typ: r("AttackingTeam")},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "rotation_x", js: "rotation_x", typ: 3.14},
      {json: "rotation_y", js: "rotation_y", typ: 3.14},
      {json: "rotation_z", js: "rotation_z", typ: 3.14},
    ], false),
    "VehicleSpawner": o([
      {json: "icon", js: "icon", typ: r("DeployableIcon")},
      {json: "name", js: "name", typ: ""},
      {json: "type", js: "type", typ: r("AttackingTeam")},
      {json: "size", js: "size", typ: r("Size")},
      {json: "maxNum", js: "maxNum", typ: 0},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "rotation_x", js: "rotation_x", typ: 3.14},
      {json: "rotation_y", js: "rotation_y", typ: 3.14},
      {json: "rotation_z", js: "rotation_z", typ: 3.14},
      {json: "typePriorities", js: "typePriorities", typ: a(r("TypePriority"))},
      {json: "tagPriorities", js: "tagPriorities", typ: a("any")},
    ], false),
    "TypePriority": o([
      {json: "name", js: "name", typ: r("VehType")},
      {json: "icon", js: "icon", typ: ""},
    ], false),
    "Border": o([
      {json: "point", js: "point", typ: u(undefined, 0)},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "name", js: "name", typ: u(undefined, "")},
    ], false),
    "CapturePoints": o([
      {json: "type", js: "type", typ: r("CapturePointsType")},
      {json: "lanes", js: "lanes", typ: r("Lanes")},
      {json: "points", js: "points", typ: r("Clusters")},
      {json: "clusters", js: "clusters", typ: r("Clusters")},
      {json: "hexs", js: "hexs", typ: r("Hexs")},
      {json: "objectiveSpawnLocations", js: "objectiveSpawnLocations", typ: a(r("Border"))},
      {json: "destructionObject", js: "destructionObject", typ: r("DestructionObject")},
    ], false),
    "Clusters": o([
      {json: "links", js: "links", typ: u(undefined, a(r("Link")))},
      {json: "pointsOrder", js: "pointsOrder", typ: u(undefined, a(""))},
      {json: "numberOfPoints", js: "numberOfPoints", typ: u(undefined, 0)},
      {json: "listOfMains", js: "listOfMains", typ: u(undefined, a(r("ClustersListOfMain")))},
      {json: "objectives", js: "objectives", typ: u(undefined, a(r("ObjectiveElement")))},
    ], false),
    "Link": o([
      {json: "name", js: "name", typ: r("LinkName")},
      {json: "nodeA", js: "nodeA", typ: ""},
      {json: "nodeB", js: "nodeB", typ: ""},
    ], false),
    "ObjectiveElement": o([
      {json: "name", js: "name", typ: r("ObjectiveName")},
      {json: "objectName", js: "objectName", typ: ""},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "objects", js: "objects", typ: a(r("NoDeployZoneObject"))},
      {json: "pointPosition", js: "pointPosition", typ: u(undefined, 0)},
    ], false),
    "NoDeployZoneObject": o([
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "sphereRadius", js: "sphereRadius", typ: ""},
      {json: "boxExtent", js: "boxExtent", typ: r("Border")},
    ], false),
    "DestructionObject": o([
      {json: "attackingTeam", js: "attackingTeam", typ: u(undefined, r("AttackingTeam"))},
      {json: "delayBetweenPhases", js: "delayBetweenPhases", typ: u(undefined, 0)},
      {json: "objectiveClass", js: "objectiveClass", typ: u(undefined, "")},
      {json: "roundTimerIncrease", js: "roundTimerIncrease", typ: u(undefined, 0)},
      {json: "timerIncreasePerPhaseActive", js: "timerIncreasePerPhaseActive", typ: u(undefined, true)},
      {json: "phases", js: "phases", typ: u(undefined, a(r("Phase")))},
      {json: "noDeployZones", js: "noDeployZones", typ: u(undefined, a(r("NoDeployZone")))},
    ], false),
    "NoDeployZone": o([
      {json: "name", js: "name", typ: ""},
      {json: "type", js: "type", typ: ""},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "objects", js: "objects", typ: a(r("NoDeployZoneObject"))},
    ], false),
    "Phase": o([
      {json: "PhaseNumber", js: "PhaseNumber", typ: 0},
      {json: "phaseObjectives", js: "phaseObjectives", typ: a(r("PhaseObjective"))},
    ], false),
    "PhaseObjective": o([
      {json: "numberOfSpots", js: "numberOfSpots", typ: 0},
      {json: "minDistanceBetweenSpots", js: "minDistanceBetweenSpots", typ: 0},
      {json: "numberOfCaches", js: "numberOfCaches", typ: 0},
      {json: "splinePoints", js: "splinePoints", typ: a(r("Border"))},
    ], false),
    "Hexs": o([
      {json: "startOwnership", js: "startOwnership", typ: u(undefined, 3.14)},
      {json: "endOwnership", js: "endOwnership", typ: u(undefined, 3.14)},
      {json: "startRandomAnchorDist:", js: "startRandomAnchorDist:", typ: u(undefined, 3.14)},
      {json: "endRandomAnchorDist:", js: "endRandomAnchorDist:", typ: u(undefined, 3.14)},
      {json: "team1Anchors", js: "team1Anchors", typ: u(undefined, a(0))},
      {json: "team2Anchors", js: "team2Anchors", typ: u(undefined, a(0))},
      {json: "hexs", js: "hexs", typ: u(undefined, a(r("Hex")))},
    ], false),
    "Hex": o([
      {json: "name", js: "name", typ: ""},
      {json: "hexNum", js: "hexNum", typ: 0},
      {json: "initialTeam", js: "initialTeam", typ: ""},
      {json: "flagName", js: "flagName", typ: ""},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "sphereRadius", js: "sphereRadius", typ: 3.14},
      {json: "boxExtent", js: "boxExtent", typ: r("Border")},
    ], false),
    "Lanes": o([
      {json: "links", js: "links", typ: u(undefined, a(r("Link")))},
      {json: "listOfLanes", js: "listOfLanes", typ: u(undefined, a(""))},
      {json: "laneObjects", js: "laneObjects", typ: u(undefined, m(r("LaneObject")))},
    ], false),
    "LaneObject": o([
      {json: "name", js: "name", typ: ""},
      {json: "laneLinks", js: "laneLinks", typ: a(r("Link"))},
      {json: "pointsOrder", js: "pointsOrder", typ: a("")},
      {json: "numberOfPoints", js: "numberOfPoints", typ: 0},
      {json: "listOfMains", js: "listOfMains", typ: a(r("LaneObjectListOfMain"))},
    ], false),
    "MapAssets": o([
      {json: "protectionZones", js: "protectionZones", typ: a(r("ProtectionZone"))},
      {json: "stagingZones", js: "stagingZones", typ: a(r("StagingZone"))},
    ], false),
    "ProtectionZone": o([
      {json: "displayName", js: "displayName", typ: r("DisplayName")},
      {json: "deployableLockDistance", js: "deployableLockDistance", typ: 0},
      {json: "teamid", js: "teamid", typ: ""},
      {json: "objects", js: "objects", typ: a(r("ProtectionZoneObject"))},
    ], false),
    "ProtectionZoneObject": o([
      {json: "sphereRadius", js: "sphereRadius", typ: 3.14},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "boxExtent", js: "boxExtent", typ: r("Border")},
      {json: "name", js: "name", typ: u(undefined, "")},
    ], false),
    "StagingZone": o([
      {json: "name", js: "name", typ: r("StagingZoneName")},
      {json: "objects", js: "objects", typ: a(r("ProtectionZoneObject"))},
    ], false),
    "ObjectiveValue": o([
      {json: "name", js: "name", typ: ""},
      {json: "objectName", js: "objectName", typ: u(undefined, "")},
      {json: "location_x", js: "location_x", typ: u(undefined, 3.14)},
      {json: "location_y", js: "location_y", typ: u(undefined, 3.14)},
      {json: "location_z", js: "location_z", typ: u(undefined, 3.14)},
      {json: "objects", js: "objects", typ: u(undefined, a(r("PointObject")))},
      {json: "pointPosition", js: "pointPosition", typ: 0},
      {json: "avgLocation", js: "avgLocation", typ: u(undefined, r("Border"))},
      {json: "points", js: "points", typ: u(undefined, a(r("Point")))},
    ], false),
    "PointObject": o([
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "sphereRadius", js: "sphereRadius", typ: ""},
      {json: "boxExtent", js: "boxExtent", typ: r("Border")},
      {json: "capsuleRadius", js: "capsuleRadius", typ: u(undefined, "")},
      {json: "capsuleLength", js: "capsuleLength", typ: u(undefined, "")},
    ], false),
    "Point": o([
      {json: "name", js: "name", typ: ""},
      {json: "objectName", js: "objectName", typ: ""},
      {json: "location_x", js: "location_x", typ: 3.14},
      {json: "location_y", js: "location_y", typ: 3.14},
      {json: "location_z", js: "location_z", typ: 3.14},
      {json: "objects", js: "objects", typ: a(r("PointObject"))},
    ], false),
    "Team": o([
      {json: "singleFaction", js: "singleFaction", typ: true},
      {json: "faction", js: "faction", typ: r("Faction")},
      {json: "shortName", js: "shortName", typ: r("ShortName")},
      {json: "teamSetupName", js: "teamSetupName", typ: ""},
      {json: "tickets", js: "tickets", typ: 0},
      {json: "disabledVeh", js: "disabledVeh", typ: true},
      {json: "intelOnEnemy", js: "intelOnEnemy", typ: 0},
      {json: "playerPercent", js: "playerPercent", typ: 0},
      {json: "commander", js: "commander", typ: true},
      {json: "vehicles", js: "vehicles", typ: a(r("Vehicle"))},
    ], false),
    "Vehicle": o([
      {json: "type", js: "type", typ: ""},
      {json: "icon", js: "icon", typ: r("VehicleIcon")},
      {json: "rawType", js: "rawType", typ: ""},
      {json: "count", js: "count", typ: 0},
      {json: "delay", js: "delay", typ: 0},
      {json: "respawnTime", js: "respawnTime", typ: 0},
      {json: "vehType", js: "vehType", typ: r("VehType")},
      {json: "spawnerSize", js: "spawnerSize", typ: r("Size")},
    ], false),
    "DeployableIcon": [
      "deployable_ammocrate",
      "deployable_hab",
      "deployable_helipad",
      "inventory_category_repair",
      "questionmark",
    ],
    "AttackingTeam": [
      "Team Neutral",
      "Team One",
      "Team Two",
    ],
    "DeployableType": [
      "Ammo Crate",
      "BP_helicopter_repair_padUSA1",
      "BP_helicopter_repair_padUSA2",
      "BP_helicopter_repair_padUSA3",
      "BP_helicopter_repair_padUSA4",
      "",
      "HAB",
      "Repair Station",
      "Team1CarrierHelicopterRepairPad1",
      "Team1CarrierHelicopterRepairPad2",
      "Team1CarrierHelicopterRepairPad3",
      "Team1HelicopterRepairPad",
      "Team1HelicopterRepairPad1",
      "Team1HelicopterRepairPad1_0",
      "Team1HelicopterRepairPad1_1",
      "Team1HelicopterRepairPad1_2",
      "Team1HelicopterRepairPad2",
      "Team1HelicopterRepairPad2_1",
      "Team1HelicopterRepairPad2_3",
      "Team1HelicopterRepairPad3",
      "Team1HelicopterRepairPad4",
      "Team1HelicopterRepairPad5",
      "Team1HelicopterRepairPad6",
      "Team1Helipad1",
      "Team1Helipad2",
      "Team1Helipad2_1",
      "Team1MainHelipad1",
      "Team1MainHelipad2",
      "Team2HelicopterRepairPad1",
      "Team2HelicopterRepairPad1_0",
      "Team2HelicopterRepairPad1_1",
      "Team2HelicopterRepairPad1_3",
      "Team2HelicopterRepairPad1_4",
      "Team2HelicopterRepairPad2",
      "Team2HelicopterRepairPad2_1",
      "Team2HelicopterRepairPad2_4",
      "Team2HelicopterRepairPad2_5",
      "Team2HelicopterRepairPad3",
      "Team2HelicopterRepairPad3_5",
      "Team2HelicopterRepairPad4",
      "Team2HelicopterRepairPad5",
      "Team2HelicopterRepairPad6",
      "Team2Helipad1",
      "Team2Helipad1_3",
      "Team2Helipad2",
      "Team2Helipad2_2",
      "Team2MainHelipad1",
      "Team2MainHelipad2",
      "Team1helicopterRepairPad1",
      "Team1helicopterRepairPad2",
    ],
    "Size": [
      "APC",
      "Bike",
      "Boat",
      "Car",
      "Helicopter",
      "MBT",
      "QuadBike",
    ],
    "VehType": [
      "APC",
      "IFV",
      "LOGI",
      "LTV",
      "MBT",
      "MGS",
      "MRAP",
      "RSV",
      "SPA",
      "SPAA",
      "TD",
      "TRAN",
      "UH",
      "ULTV",
    ],
    "Type": [
      "mapTexture",
      "spline",
    ],
    "LinkName": [
      "Link0",
      "Link1",
      "Link10",
      "Link11",
      "Link12",
      "Link13",
      "Link14",
      "Link15",
      "Link16",
      "Link17",
      "Link18",
      "Link19",
      "Link2",
      "Link20",
      "Link21",
      "Link22",
      "Link23",
      "Link24",
      "Link25",
      "Link26",
      "Link27",
      "Link28",
      "Link29",
      "Link3",
      "Link30",
      "Link4",
      "Link5",
      "Link6",
      "Link7",
      "Link8",
      "Link9",
    ],
    "ClustersListOfMain": [
      "00-Team1 Main",
      "00-Team2 Main",
      "00-USA Main",
      "100-MIL Main",
      "100-RUS Main",
      "100-Team1 Main",
      "100-Team2 Main",
    ],
    "ObjectiveName": [
      "Central Objective",
      "Crossroads",
      "Gas Town",
      "Main",
      "The Motherbase",
    ],
    "LaneObjectListOfMain": [
      "00-Team 1 Main",
      "100-Team 2 Main",
      "00-MIL Main",
      "00-Main",
      "00-Team1 Main",
      "00-Team2 Main",
      "100-Team1 Main",
      "100-Team2 Main",
      "Z100-Team2 Main",
      "Z-Team2 Main",
    ],
    "CapturePointsType": [
      "AAS Graph",
      "Destruction",
      "Insurgency",
      "Invasion Random Graph",
      "RAASGraph",
      "RAASLane Graph",
      "TC Hex Zone",
      "Track Attack",
      "Unknown",
    ],
    "Gamemode": [
      "AAS",
      "Destruction",
      "Insurgency",
      "Invasion",
      "RAAS",
      "Seed",
      "Skirmish",
      "Tanks",
      "Territory Control",
      "Track Attack",
      "Training",
      "Tutorial",
    ],
    "DisplayName": [
      "Team 1 Protection Zone",
      "Team1 Protection Zone2",
      "Team2 ProtectionZone",
      "Team2 Protection Zone2",
      "Mosque Blocker",
      "Team 2 Protection Zone",
      "Team1 Carrier Protection Zone",
      "Team1 Carrier Protection Zone 1",
      "Team1 E Forward Protection Zone 1",
      "Team1 East Protection Zone 1",
      "Team1 Forward Protection Zone 1",
      "Team1 Main Protection Zone 1",
      "Team1 Protection Zone",
      "Team1 Protection Zone 1",
      "Team1 Protection Zone 2",
      "Team1 Protection Zone 3",
      "Team1 Protection Zone 4",
      "Team1 W Forward Protection Zone 1",
      "Team1 West Protection Zone 1",
      "Team2 Forward Protection Zone 1",
      "Team2 Main Protection Zone 1",
      "Team2 Protection Zone",
      "Team2 Protection Zone 1",
      "Team2 Protection Zone 2",
      "Team2 Protection Zone 3",
    ],
    "StagingZoneName": [
      "Team1 StagingZone",
      "Team1 Staging Zone2",
      "Team2 StagingZone",
      "Team2 Staging Zone2",
      "Team1 Carrier Staging Zone",
      "Team1 Main Staging Zone 1",
      "Team1 Staging Zone",
      "Team1 Staging Zone 1",
      "Team1 Staging Zone 2",
      "Team1 Staging Zone Main",
      "Team1 Staging Zone OP Chaxton",
      "Team1 Staging Zone OP Leeks",
      "Team1 Staging Zone VCP",
      "Team2 Main Staging Zone 1",
      "Team2 Staging Zone",
      "Team2 Staging Zone 1",
      "Team2 Staging Zone 2",
      "Team2 Staging Zone East",
      "Team2 Staging Zone West",
      "Team2 Staging Zonew",
    ],
    "Faction": [
      "Australian Defence Force",
      "British Armed Forces",
      "Canadian Armed Forces",
      "Insurgent Forces",
      "Irregular Militia Forces",
      "Middle Eastern Alliance",
      "PLA Navy Marine Corps",
      "People's Liberation Army",
      "Russian Airborne Forces",
      "Russian Ground Forces",
      "Turkish Land Forces",
      "United States Army",
      "United States Marine Corps",
    ],
    "ShortName": [
      "ADF",
      "BAF",
      "CAF",
      "IMF",
      "INS",
      "MEA",
      "PLA",
      "PLANMC",
      "RGF",
      "TLF",
      "USA",
      "USMC",
      "VDV",
    ],
    "VehicleIcon": [
      "map_antiair",
      "map_apc",
      "map_boat",
      "map_ifv",
      "map_jeep",
      "map_jeep_antitank",
      "map_jeep_artillery",
      "map_jeep_logistics",
      "map_jeep_transport",
      "map_jeep_turret",
      "map_motorcycle",
      "map_tank",
      "map_trackedapc",
      "map_trackedifv",
      "map_trackedjeep",
      "map_transporthelo",
      "map_truck_antiair",
      "map_truck_logistics",
      "map_truck_transport",
      "map_truck_transport_armed",
      "T_map_apc_open_turret",
      "T_map_boat_logistics",
      "T_map_boat_openturret",
      "T_map_mgs",
      "T_map_trackedapc_logistics",
      "T_map_trackedapc_noturret",
      "T_map_trackedrecon",
      "T_map_truck_artillery",
      "T_map_wheeledrecon",
    ],
  };
}
