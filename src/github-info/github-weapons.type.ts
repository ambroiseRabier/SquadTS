// Namespace to correctly isolate stuff from Wiki with the rest of SquadTS.
export namespace GithubWikiWeapon {
  // Sadly, some weapons are missing, like the melee. Rocket launcher may also be missing ?
  //
  // From file: https://github.com/Squad-Wiki/squad-wiki-pipeline-weapon-and-vehicle-data/blob/main/data/_currentVersion/weaponInfo.json
  // Note: some doc here : https://github.com/Squad-Wiki/squad-wiki-pipeline-weapon-and-vehicle-data/blob/main/doc/weapon.md
  //
  // Comment generated by quicktype =>
  //
  // To parse this data:
  //
  //   import { Convert } from "./file";
  //
  //   const weaponInfo = Convert.toWeaponInfo(json);
  //
  // These functions will throw an error if the JSON doesn't
  // match the expected interface, even if the JSON is valid.

  export interface WeaponInfo {
    // Display name found in HUD e.g., "C6"
    displayName: string;
    // Raw blueprint name e.g., "BP_C6.BP_C6_C"
    rawName: string;
    // Folder where blueprint is loaded e.g., "MachineGuns"
    folder: Folder;
    // Factions that the weapon is used by e.g., ["CAF"]
    factions: Faction[];
    // Item description found in game
    inventoryInfo: InventoryInfo;
    weaponInfo: WeaponInfoClass;
    physicalInfo: PhysicalInfo;
    staticInfo: StaticInfo;
  }

  export enum Faction {
    Adf = 'ADF',
    Baf = 'BAF',
    Caf = 'CAF',
    Imf = 'IMF',
    Ins = 'INS',
    Mea = 'MEA',
    Pla = 'PLA',
    Planmc = 'PLANMC',
    Rgf = 'RGF',
    Tlf = 'TLF',
    Usa = 'USA',
    Usmc = 'USMC',
    Vdv = 'VDV',
  }

  export enum Folder {
    MachineGuns = 'MachineGuns',
    Pistols = 'Pistols',
    Rifles = 'Rifles',
  }

  export interface InventoryInfo {
    // Item description found in game e.g., "Magazine Capacity: 75/Caliber: 7.62x51mm NATO Red Tracer/Rate of Fire: 700 RPM/Fire Mode: Auto/Zeroing: 100m-1800m..."
    description: string;
    // e.g, "mag58"
    HUDTexture: string;
    // Inventory texture e.g., "inventory_category_machinegun"
    inventoryTexture: InventoryTexture;
    // Ammo point cost from FOB for 1 mag/item e.g., 11.0
    ammoPerRearm: number;
    // Show item count in inventory e.g., false
    showItemCount: boolean;
    // Show mag counts on HUD e.g., true
    showMagCount: boolean;
  }

  export enum InventoryTexture {
    InventoryCategoryDMR = 'inventory_category_dmr',
    InventoryCategoryMachinegun = 'inventory_category_machinegun',
    InventoryCategoryPistol = 'inventory_category_pistol',
    InventoryCategoryRifle = 'inventory_category_rifle',
  }

  export interface PhysicalInfo {
    // Mesh of weapon e.g., "C6"
    skeletalMesh: string;
    // Attachments (blueprint names, there are no pretty names afaik) e.g., ["BP_Attachment_PAQ_NoSwitch_C"]
    attachments: string[];
  }

  export interface StaticInfo {
    sway: Sway;
    swayAlignment: Sway;
    spring: Spring;
    recoil: Recoil;
  }

  export interface Recoil {
    camera: Camera;
    dynamic: RecoilDynamic;
  }

  export interface Camera {
    // How much the camera goes up as the sight is offsetting from the center e.g., 0.35
    recoilCameraOffsetFactor: number;
    // How fast the camera goes up as the sight is offsetting from the center e.g., 5.0
    recoilCameraOffsetInterpSpeed: number;
    // How far the sight can go away from the center of the screen (on any axis) e.g., 20.0
    recoilLofCameraOffsetLimit: number;
    // How fast the sight is reaching the new point defined by the past shot (don't change it except for specific cases) e.g., 45.0
    recoilLofAttackInterpSpeed: number;
    // Speed of timer allowing the sight to go back to the center e.g., 30.0
    recoilCanReleaseInterpSpeed: number;
    // How fast the sight goes back to the center of the screen when it's allowed to e.g., 10.0
    recoilLofReleaseInterpSpeed: number;
    // Speed of camera bone rotation update when firing while ADS. Set to zero for disabling it e.g., 200.0
    recoilAdsCameraShotInterpSpeed: number;
  }

  export interface RecoilDynamic {
    movement: Movement;
    stamina: Stamina;
    shoulder: Shoulder;
    grip: Grip;
    // Maximum additive multiplier for recoil misalignment (Stance + Movement + Stamina) e.g., 2.0
    recoilAlignmentMultiplierMax: number;
  }

  export interface Grip {
    // Maximum misalignment per-shot, rotating around the grip bone e.g., {x: 5, y: 4}
    recoilAlignmentGripMax: RecoilAlignment;
    // Maximum overall misalignment, to prevent misalignment adding up too far from rapid fire e.g., {x: 11, y: 7}
    recoilAlignmentGripAngleLimits: RecoilAlignment;
  }

  export interface RecoilAlignment {
    // Maximum misalignment in X direction e.g., 5.0
    x: number;
    // Maximum misalignment in Y direction e.g., 4.0
    y: number;
  }

  export interface Movement {
    // Reset shot recoil multiplier (Increases the size of delta time, reducing the time to get to minimum after movement) e.g., 1.0
    moveRecoilFactorRelease: number;
    // Amount of additive recoil to add when moving e.g., 1.0
    addMoveRecoil: number;
    // Maximum amount of additive recoil possible when moving e.g., 2.0
    maxMoveRecoilFactor: number;
    // Minimum amount of additive recoil possible when moving e.g., 0.07
    minMoveRecoilFactor: number;
    // Additive recoil misalignment from moving when firing e.g., 0.3
    recoilAlignmentMovementAddative: number;
    // Allows you to ease in the additional recoil misalignment from firing while moving e.g., 1.0
    recoilAlignmentMovementExponent: number;
  }

  export interface Shoulder {
    // Maximum misalignment per-shot, rotating around the shoulder bone e.g., {x: 3, y: 2}
    recoilAlignmentShoulderMax: RecoilAlignment;
    // Maximum overall misalignment, to prevent misalignment adding up too far from rapid fire e.g., {x: 5, y: 4}
    recoilAlignmentShoulderAngleLimits: RecoilAlignment;
  }

  export interface Stamina {
    // Amount of additive recoil to apply when low on stamina e.g., 0.2
    lowStaminaRecoilFactor: number;
    // Amount of additive recoil to apply when full on stamina e.g., 0.0
    fullStaminaRecoilFactor: number;
    // Additive recoil misalignment from firing with low stamina e.g., 0.1
    recoilAlignmentStaminaAddative: number;
    // Allows you to ease in the additional recoil misalignment from firing while tired e.g., 0.5
    recoilAlignmentStaminaExponent: number;
  }

  export interface Spring {
    // Should the item follow or counter player rotation e.g., -1
    weaponSpringSide: number;
    // How oscillating should the spring be e.g., 0.75
    weaponSpringStiffness: number;
    // Decay speed of spring oscillation e.g., 0.4
    weaponSpringDamping: number;
    // Amplitude and resistance to change of the spring oscillation e.g., 0.05
    weaponSpringMass: number;
  }

  export interface Sway {
    dynamic: SwayDynamic;
    stance: Stance;
    // Max sway e.g., 10.0
    maxSway: number;
  }

  export interface SwayDynamic {
    // Amount of additive sway to apply when low on stamina e.g., 3.5
    lowStaminaSwayFactor: number;
    // Amount of additive sway to apply when full on stamina e.g., 0.0
    fullStaminaSwayFactor: number;
    // Sway factor applied to stance's minimum sway range e.g., 0.66
    holdingBreathSwayFactor: number;
    // Amount of additive sway to add when moving e.g., 0.0004
    addMoveSway: number;
    // Minimum amount of additive sway possible when moving e.g., 0.0
    minMoveSwayFactor: number;
    // Maximum amount of additive sway possible when moving e.g., 22.0
    maxMoveSwayFactor: number;
  }

  export interface Stance {
    // Min sway range when aiming down sights while prone e.g., 1.5
    proneADSSwayMin: number;
    // Min sway range while prone e.g., 3.0
    proneSwayMin: number;
    // Min sway range when aiming down sights while crouching e.g., 6.0
    crouchADSSwayMin: number;
    // Min sway range while crouching e.g., 8.0
    crouchSwayMin: number;
    // Min sway range when aiming down sights while standing e.g., 9.0
    standingADSSwayMin: number;
    // Min sway range while standing e.g., 12.0
    standingSwayMin: number;
    // Min sway range when aiming down sights while using a bipod e.g., 0.0
    bipodADSSwayMin: number;
    // Min sway range while using a bipod e.g., 0.0
    bipodSwayMin: number;
  }

  export interface WeaponInfoClass {
    // Max number of mags e.g., 8
    maxMags: number;
    // Rounds per mag e.g., 75
    roundsPerMag: number;
    // Allow a round to stay loaded in chamber e.g., false
    roundInChamber: boolean;
    // Allow item to be loaded bullet by bullet e.g., false
    allowSingleLoad: boolean;
    // Firemodes. -1 -> automatic | 0 -> burst | 1 -> semi-auto e.g., [-1]
    firemodes: number[];
    // Min time between two shots (burst/auto) e.g., 0.085
    timeBetweenShots: number;
    // Min time between two shots (semi-auto) e.g., 0.125
    timeBetweenSingleShots: number;
    // Unknown e.g., true
    avgFireRate: boolean;
    // Unknown e.g., false
    resetBurstOnTriggerRelease: boolean;
    // Finish reload grace period for canceling reload close to finishing the reload process e.g., 0.0
    reloadCancelGracePeriod: number;
    // Time it takes to reload weapon without an empty mag e.g., 9.5
    tacticalReloadDuration: number;
    // Time it takes to reload weapon with an empty mag e.g., 11.2
    dryReloadDuration: number;
    // Time it takes to reload weapon without an empty mag with a bipod e.g., 8.0
    tacticalReloadBipodDuration: number;
    // Time it takes to reload weapon with an empty mag with a bipod e.g., 8.75
    dryReloadBipodDuration: number;
    // ADS Post Process transition point == ZoomedFOV / (CurrentFOV - FOVSetting - 90) e.g., 0.4
    ADSPostTransitionRation: number;
    // If ADS is allowed on the weapon e.g., true
    allowZoom: boolean;
    // How much ADS slows a player e.g., 0.6
    ADSMoveSpeedMultiplier: number;
    // Projectile blueprint e.g., "BP_Projectile_7_62mm_C"
    projectileClass: ProjectileClass;
    // Tracer blueprint (MAY BE NULL) e.g., "BP_Projectile_Red_762mm_C"
    tracerProjectileClass: TracerProjectileClass | null;
    // Rounds between tracer e.g., 4
    roundsBetweenTracer: number;
    // Starting/muzzle velocity for projectiles e.g., 85300.0
    muzzleVelocity: number;
    // Min damage from fall off e.g., 35.0
    damageFallOffMinDamage: number;
    // Distance the min damage occurs e.g., 80000.0
    damageFallOffMinDamageDistance: number;
    // Max damage from fall off e.g., 86.0
    damageFallOffMaxDamage: number;
    // Distance the max damage occurs until e.g., 38000.0
    damageFallOffMaxDamageDistance: number;
    // Armor penetration depth (mm) e.g., 7
    armorPenetrationDepthMM: number;
    // Trace distance after penetrating to determine if damage will occur e.g., 10.0
    traceDistanceAfterPen: number;
    // How accurate the weapon is (in minutes of angle aka 1/60th of a degree) e.g., 3
    MOA: number;
    // If a mag must be empty to reload e.g., false
    emptyMagReload: boolean;
    // How long it takes to equip e.g., 1.63
    equipDuration: number;
    // How long it takes to dequip e.g., 1.316
    unequipDuration: number;
  }

  export enum ProjectileClass {
    BPProjectile338_C = 'BP_Projectile_338_C',
    BPProjectile7_62MmC = 'BP_Projectile_7_62mm_C',
    BPProjectile9MmC = 'BP_Projectile_9mm_C',
    BPProjectileC = 'BP_Projectile_C',
    BPProjectileSubsonicC = 'BP_Projectile_Subsonic_C',
  }

  export enum TracerProjectileClass {
    BPProjectileGreen762MmC = 'BP_Projectile_Green_762mm_C',
    BPProjectileGreenC = 'BP_Projectile_Green_C',
    BPProjectileRed762MmC = 'BP_Projectile_Red_762mm_C',
    BPProjectileRedC = 'BP_Projectile_Red_C',
  }

  // Converts JSON strings to/from your types
  // and asserts the results of JSON.parse at runtime
  export class Convert {
    public static toWeaponInfo(json: string): { [key: string]: WeaponInfo } {
      return cast(JSON.parse(json), m(r('WeaponInfo')));
    }

    // Added by SquadTS
    public static validate(parsedJson: any) {
      cast(parsedJson, m(r('WeaponInfo')));
    }

    public static weaponInfoToJson(value: { [key: string]: WeaponInfo }): string {
      return JSON.stringify(uncast(value, m(r('WeaponInfo'))), null, 2);
    }
  }

  function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(
      `Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`
    );
  }

  function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
      if (typ.length === 2 && typ[0] === undefined) {
        return `an optional ${prettyTypeName(typ[1])}`;
      } else {
        return `one of [${typ
          .map(a => {
            return prettyTypeName(a);
          })
          .join(', ')}]`;
      }
    } else if (typeof typ === 'object' && typ.literal !== undefined) {
      return typ.literal;
    } else {
      return typeof typ;
    }
  }

  function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => (map[p.json] = { key: p.js, typ: p.typ }));
      typ.jsonToJS = map;
    }
    return typ.jsonToJS;
  }

  function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
      const map: any = {};
      typ.props.forEach((p: any) => (map[p.js] = { key: p.json, typ: p.typ }));
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
        } catch (_) {}
      }
      return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
      if (cases.indexOf(val) !== -1) return val;
      return invalidValue(
        cases.map(a => {
          return l(a);
        }),
        val,
        key,
        parent
      );
    }

    function transformArray(typ: any, val: any): any {
      // val must be an array with no invalid elements
      if (!Array.isArray(val)) return invalidValue(l('array'), val, key, parent);
      return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
      if (val === null) {
        return null;
      }
      const d = new Date(val);
      if (isNaN(d.valueOf())) {
        return invalidValue(l('Date'), val, key, parent);
      }
      return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
      if (val === null || typeof val !== 'object' || Array.isArray(val)) {
        return invalidValue(l(ref || 'object'), val, key, parent);
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

    if (typ === 'any') return val;
    if (typ === null) {
      if (val === null) return val;
      return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === 'object' && typ.ref !== undefined) {
      ref = typ.ref;
      typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === 'object') {
      return typ.hasOwnProperty('unionMembers')
        ? transformUnion(typ.unionMembers, val)
        : typ.hasOwnProperty('arrayItems')
          ? transformArray(typ.arrayItems, val)
          : typ.hasOwnProperty('props')
            ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== 'number') return transformDate(val);
    return transformPrimitive(typ, val);
  }

  function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
  }

  function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
  }

  function l(typ: any) {
    return { literal: typ };
  }

  function a(typ: any) {
    return { arrayItems: typ };
  }

  function u(...typs: any[]) {
    return { unionMembers: typs };
  }

  function o(props: any[], additional: any) {
    return { props, additional };
  }

  function m(additional: any) {
    return { props: [], additional };
  }

  function r(name: string) {
    return { ref: name };
  }

  const typeMap: any = {
    WeaponInfo: o(
      [
        { json: 'displayName', js: 'displayName', typ: '' },
        { json: 'rawName', js: 'rawName', typ: '' },
        { json: 'folder', js: 'folder', typ: r('Folder') },
        { json: 'factions', js: 'factions', typ: a(r('Faction')) },
        { json: 'inventoryInfo', js: 'inventoryInfo', typ: r('InventoryInfo') },
        { json: 'weaponInfo', js: 'weaponInfo', typ: r('WeaponInfoClass') },
        { json: 'physicalInfo', js: 'physicalInfo', typ: r('PhysicalInfo') },
        { json: 'staticInfo', js: 'staticInfo', typ: r('StaticInfo') },
      ],
      false
    ),
    InventoryInfo: o(
      [
        { json: 'description', js: 'description', typ: '' },
        { json: 'HUDTexture', js: 'HUDTexture', typ: '' },
        {
          json: 'inventoryTexture',
          js: 'inventoryTexture',
          typ: r('InventoryTexture'),
        },
        { json: 'ammoPerRearm', js: 'ammoPerRearm', typ: 3.14 },
        { json: 'showItemCount', js: 'showItemCount', typ: true },
        { json: 'showMagCount', js: 'showMagCount', typ: true },
      ],
      false
    ),
    PhysicalInfo: o(
      [
        { json: 'skeletalMesh', js: 'skeletalMesh', typ: '' },
        { json: 'attachments', js: 'attachments', typ: a('') },
      ],
      false
    ),
    StaticInfo: o(
      [
        { json: 'sway', js: 'sway', typ: r('Sway') },
        { json: 'swayAlignment', js: 'swayAlignment', typ: r('Sway') },
        { json: 'spring', js: 'spring', typ: r('Spring') },
        { json: 'recoil', js: 'recoil', typ: r('Recoil') },
      ],
      false
    ),
    Recoil: o(
      [
        { json: 'camera', js: 'camera', typ: r('Camera') },
        { json: 'dynamic', js: 'dynamic', typ: r('RecoilDynamic') },
      ],
      false
    ),
    Camera: o(
      [
        {
          json: 'recoilCameraOffsetFactor',
          js: 'recoilCameraOffsetFactor',
          typ: 3.14,
        },
        {
          json: 'recoilCameraOffsetInterpSpeed',
          js: 'recoilCameraOffsetInterpSpeed',
          typ: 3.14,
        },
        {
          json: 'recoilLofCameraOffsetLimit',
          js: 'recoilLofCameraOffsetLimit',
          typ: 3.14,
        },
        {
          json: 'recoilLofAttackInterpSpeed',
          js: 'recoilLofAttackInterpSpeed',
          typ: 3.14,
        },
        {
          json: 'recoilCanReleaseInterpSpeed',
          js: 'recoilCanReleaseInterpSpeed',
          typ: 3.14,
        },
        {
          json: 'recoilLofReleaseInterpSpeed',
          js: 'recoilLofReleaseInterpSpeed',
          typ: 3.14,
        },
        {
          json: 'recoilAdsCameraShotInterpSpeed',
          js: 'recoilAdsCameraShotInterpSpeed',
          typ: 3.14,
        },
      ],
      false
    ),
    RecoilDynamic: o(
      [
        { json: 'movement', js: 'movement', typ: r('Movement') },
        { json: 'stamina', js: 'stamina', typ: r('Stamina') },
        { json: 'shoulder', js: 'shoulder', typ: r('Shoulder') },
        { json: 'grip', js: 'grip', typ: r('Grip') },
        {
          json: 'recoilAlignmentMultiplierMax',
          js: 'recoilAlignmentMultiplierMax',
          typ: 3.14,
        },
      ],
      false
    ),
    Grip: o(
      [
        {
          json: 'recoilAlignmentGripMax',
          js: 'recoilAlignmentGripMax',
          typ: r('RecoilAlignment'),
        },
        {
          json: 'recoilAlignmentGripAngleLimits',
          js: 'recoilAlignmentGripAngleLimits',
          typ: r('RecoilAlignment'),
        },
      ],
      false
    ),
    RecoilAlignment: o(
      [
        { json: 'x', js: 'x', typ: 3.14 },
        { json: 'y', js: 'y', typ: 3.14 },
      ],
      false
    ),
    Movement: o(
      [
        {
          json: 'moveRecoilFactorRelease',
          js: 'moveRecoilFactorRelease',
          typ: 3.14,
        },
        { json: 'addMoveRecoil', js: 'addMoveRecoil', typ: 3.14 },
        { json: 'maxMoveRecoilFactor', js: 'maxMoveRecoilFactor', typ: 3.14 },
        { json: 'minMoveRecoilFactor', js: 'minMoveRecoilFactor', typ: 3.14 },
        {
          json: 'recoilAlignmentMovementAddative',
          js: 'recoilAlignmentMovementAddative',
          typ: 3.14,
        },
        {
          json: 'recoilAlignmentMovementExponent',
          js: 'recoilAlignmentMovementExponent',
          typ: 3.14,
        },
      ],
      false
    ),
    Shoulder: o(
      [
        {
          json: 'recoilAlignmentShoulderMax',
          js: 'recoilAlignmentShoulderMax',
          typ: r('RecoilAlignment'),
        },
        {
          json: 'recoilAlignmentShoulderAngleLimits',
          js: 'recoilAlignmentShoulderAngleLimits',
          typ: r('RecoilAlignment'),
        },
      ],
      false
    ),
    Stamina: o(
      [
        {
          json: 'lowStaminaRecoilFactor',
          js: 'lowStaminaRecoilFactor',
          typ: 3.14,
        },
        {
          json: 'fullStaminaRecoilFactor',
          js: 'fullStaminaRecoilFactor',
          typ: 3.14,
        },
        {
          json: 'recoilAlignmentStaminaAddative',
          js: 'recoilAlignmentStaminaAddative',
          typ: 3.14,
        },
        {
          json: 'recoilAlignmentStaminaExponent',
          js: 'recoilAlignmentStaminaExponent',
          typ: 3.14,
        },
      ],
      false
    ),
    Spring: o(
      [
        { json: 'weaponSpringSide', js: 'weaponSpringSide', typ: 0 },
        {
          json: 'weaponSpringStiffness',
          js: 'weaponSpringStiffness',
          typ: 3.14,
        },
        { json: 'weaponSpringDamping', js: 'weaponSpringDamping', typ: 3.14 },
        { json: 'weaponSpringMass', js: 'weaponSpringMass', typ: 3.14 },
      ],
      false
    ),
    Sway: o(
      [
        { json: 'dynamic', js: 'dynamic', typ: r('SwayDynamic') },
        { json: 'stance', js: 'stance', typ: r('Stance') },
        { json: 'maxSway', js: 'maxSway', typ: 3.14 },
      ],
      false
    ),
    SwayDynamic: o(
      [
        { json: 'lowStaminaSwayFactor', js: 'lowStaminaSwayFactor', typ: 3.14 },
        {
          json: 'fullStaminaSwayFactor',
          js: 'fullStaminaSwayFactor',
          typ: 3.14,
        },
        {
          json: 'holdingBreathSwayFactor',
          js: 'holdingBreathSwayFactor',
          typ: 3.14,
        },
        { json: 'addMoveSway', js: 'addMoveSway', typ: 3.14 },
        { json: 'minMoveSwayFactor', js: 'minMoveSwayFactor', typ: 3.14 },
        { json: 'maxMoveSwayFactor', js: 'maxMoveSwayFactor', typ: 3.14 },
      ],
      false
    ),
    Stance: o(
      [
        { json: 'proneADSSwayMin', js: 'proneADSSwayMin', typ: 3.14 },
        { json: 'proneSwayMin', js: 'proneSwayMin', typ: 3.14 },
        { json: 'crouchADSSwayMin', js: 'crouchADSSwayMin', typ: 3.14 },
        { json: 'crouchSwayMin', js: 'crouchSwayMin', typ: 3.14 },
        { json: 'standingADSSwayMin', js: 'standingADSSwayMin', typ: 3.14 },
        { json: 'standingSwayMin', js: 'standingSwayMin', typ: 3.14 },
        { json: 'bipodADSSwayMin', js: 'bipodADSSwayMin', typ: 3.14 },
        { json: 'bipodSwayMin', js: 'bipodSwayMin', typ: 3.14 },
      ],
      false
    ),
    WeaponInfoClass: o(
      [
        { json: 'maxMags', js: 'maxMags', typ: 0 },
        { json: 'roundsPerMag', js: 'roundsPerMag', typ: 0 },
        { json: 'roundInChamber', js: 'roundInChamber', typ: true },
        { json: 'allowSingleLoad', js: 'allowSingleLoad', typ: true },
        { json: 'firemodes', js: 'firemodes', typ: a(0) },
        { json: 'timeBetweenShots', js: 'timeBetweenShots', typ: 3.14 },
        {
          json: 'timeBetweenSingleShots',
          js: 'timeBetweenSingleShots',
          typ: 3.14,
        },
        { json: 'avgFireRate', js: 'avgFireRate', typ: true },
        {
          json: 'resetBurstOnTriggerRelease',
          js: 'resetBurstOnTriggerRelease',
          typ: true,
        },
        {
          json: 'reloadCancelGracePeriod',
          js: 'reloadCancelGracePeriod',
          typ: 3.14,
        },
        {
          json: 'tacticalReloadDuration',
          js: 'tacticalReloadDuration',
          typ: 3.14,
        },
        { json: 'dryReloadDuration', js: 'dryReloadDuration', typ: 3.14 },
        {
          json: 'tacticalReloadBipodDuration',
          js: 'tacticalReloadBipodDuration',
          typ: 3.14,
        },
        {
          json: 'dryReloadBipodDuration',
          js: 'dryReloadBipodDuration',
          typ: 3.14,
        },
        {
          json: 'ADSPostTransitionRation',
          js: 'ADSPostTransitionRation',
          typ: 3.14,
        },
        { json: 'allowZoom', js: 'allowZoom', typ: true },
        {
          json: 'ADSMoveSpeedMultiplier',
          js: 'ADSMoveSpeedMultiplier',
          typ: 3.14,
        },
        {
          json: 'projectileClass',
          js: 'projectileClass',
          typ: r('ProjectileClass'),
        },
        {
          json: 'tracerProjectileClass',
          js: 'tracerProjectileClass',
          typ: u(r('TracerProjectileClass'), null),
        },
        { json: 'roundsBetweenTracer', js: 'roundsBetweenTracer', typ: 0 },
        { json: 'muzzleVelocity', js: 'muzzleVelocity', typ: 3.14 },
        {
          json: 'damageFallOffMinDamage',
          js: 'damageFallOffMinDamage',
          typ: 3.14,
        },
        {
          json: 'damageFallOffMinDamageDistance',
          js: 'damageFallOffMinDamageDistance',
          typ: 3.14,
        },
        {
          json: 'damageFallOffMaxDamage',
          js: 'damageFallOffMaxDamage',
          typ: 3.14,
        },
        {
          json: 'damageFallOffMaxDamageDistance',
          js: 'damageFallOffMaxDamageDistance',
          typ: 3.14,
        },
        {
          json: 'armorPenetrationDepthMM',
          js: 'armorPenetrationDepthMM',
          typ: 0,
        },
        {
          json: 'traceDistanceAfterPen',
          js: 'traceDistanceAfterPen',
          typ: 3.14,
        },
        { json: 'MOA', js: 'MOA', typ: 0 },
        { json: 'emptyMagReload', js: 'emptyMagReload', typ: true },
        { json: 'equipDuration', js: 'equipDuration', typ: 3.14 },
        { json: 'unequipDuration', js: 'unequipDuration', typ: 3.14 },
      ],
      false
    ),
    Faction: [
      'ADF',
      'BAF',
      'CAF',
      'IMF',
      'INS',
      'MEA',
      'PLA',
      'PLANMC',
      'RGF',
      'TLF',
      'USA',
      'USMC',
      'VDV',
    ],
    Folder: ['MachineGuns', 'Pistols', 'Rifles'],
    InventoryTexture: [
      'inventory_category_dmr',
      'inventory_category_machinegun',
      'inventory_category_pistol',
      'inventory_category_rifle',
    ],
    ProjectileClass: [
      'BP_Projectile_338_C',
      'BP_Projectile_7_62mm_C',
      'BP_Projectile_9mm_C',
      'BP_Projectile_C',
      'BP_Projectile_Subsonic_C',
    ],
    TracerProjectileClass: [
      'BP_Projectile_Green_762mm_C',
      'BP_Projectile_Green_C',
      'BP_Projectile_Red_762mm_C',
      'BP_Projectile_Red_C',
    ],
  };
}
