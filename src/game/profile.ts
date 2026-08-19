// ============================================================
//  Persistent profile: creation, stats, leveling, item gen
// ============================================================
import {
  CLASSES,
  COSTUMES,
  COSTUME_GACHA_RATES,
  COSTUME_LIST,
  COSTUME_PITY,
  PETS,
  PET_DUPE_SHARDS,
  PET_GACHA_RATES,
  PET_LIST,
  PET_MAX_STAR,
  PET_PITY,
  RARITY_WEIGHT,
  petStarMult,
  titleStat,
} from "./content";
import { RNG } from "./rng";
import {
  type Item,
  type OwnedPet,
  type Profile,
  type Rarity,
  type Slot,
  type Stats,
  PET_UNLOCK_LEVEL,
  RARITY_ORDER,
  SLOT_ORDER,
  emptyStats,
} from "./types";

const UID_PREFIX = "i";
let _uid = 1;
export function nextUid(): string {
  return UID_PREFIX + (_uid++).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}

const SLOT_ITEMS: Record<Slot, string[]> = {
  weapon: ["Edge", "Reaver", "Fang", "Bolt", "Orb", "Cannon", "Cleaver", "Lance"],
  helmet: ["Helm", "Crown", "Visor", "Cap", "Mask", "Hood"],
  chest: ["Plate", "Aegis", "Mail", "Robe", "Garb", "Cuirass"],
  gloves: ["Gauntlets", "Grips", "Hands", "Claws", "Bracers"],
  boots: ["Greaves", "Boots", "Striders", "Sabatons", "Treads"],
  ring: ["Band", "Ring", "Loop", "Signet", "Circle"],
  necklace: ["Amulet", "Pendant", "Collar", "Charm", "Torc"],
  earrings: ["Studs", "Drops", "Earrings", "Hooks"],
};

export const CLASS_WEAPONS: Record<string, string[]> = {
  warrior: ["Claymore", "Longsword", "Steel Blade", "Broadsword", "Zweihander"],
  knight: ["Bastard Sword", "Aegis Shield", "Knightly Sword", "Kite Shield", "Tower Shield"],
  assassin: ["Dagger", "Kris", "Twin Blades", "Stiletto", "Main-Gauche"],
  ranger: ["Recurve Bow", "Longbow", "Great Bow", "Composite Bow", "Flatbow"],
  mage: ["Archstaff", "Sorcerer Staff", "Arcane Wand", "Spellbook", "Elemental Prism"],
  berserker: ["Greatsword", "War Axe", "Battleaxe", "Labrys", "Greataxe"],
  gunner: ["Hand Cannon", "Rifle", "Blaster", "Repeater", "Pulse Pistol"],
  bard: ["Lute", "Lyre", "Harp", "Mandolin", "Zither"],
  summoner: ["Hexstaff", "Conjurer Staff", "Spirit Tome", "Grimoire", "Soul Reaver"],
};

const REGION_ADJ = [
  ["Ashen", "Dusty", "Worn", "Iron"],
  ["Verdant", "Thorned", "Wild", "Mossy"],
  ["Ancient", "Hallowed", "Dusty", "Relic"],
  ["Frostbound", "Glacial", "Icy", "Rime"],
  ["Cindering", "Infernal", "Dark", "Ember"],
  ["Celestial", "Astral", "Radiant", "Void"],
];

const SPECIALS = [
  "Burning Edge",
  "Frostbite",
  "Life Drain",
  "Static Charge",
  "Venom Coat",
  "Holy Light",
  "Arcane Surge",
  "Stormcall",
];

const ITEM_BASE: Partial<Record<keyof Stats, number>> = {
  atk: 9,
  def: 6,
  hp: 85,
  mp: 26,
  acc: 4,
  eva: 3,
  crit: 2,
  critdmg: 10,
  atkspd: 0.03,
  mvspd: 0.02,
  skilldmg: 3,
};

const SLOT_STATS: Record<Slot, (keyof Stats)[]> = {
  weapon: ["atk", "crit", "critdmg", "atkspd", "acc"],
  helmet: ["hp", "def", "acc", "eva"],
  chest: ["hp", "def", "eva"],
  gloves: ["atk", "crit", "atkspd", "acc"],
  boots: ["mvspd", "eva", "hp", "def"],
  ring: ["atk", "crit", "critdmg", "hp", "mp"],
  necklace: ["hp", "mp", "atk", "critdmg", "skilldmg"],
  earrings: ["mp", "eva", "acc", "crit"],
};

const RARITY_STAT_COUNT: Record<Rarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 3,
  LEGENDARY: 4,
  MYTHIC: 5,
  ANCIENT: 5,
};

const RARITY_MULT: Record<Rarity, number> = {
  COMMON: 1,
  UNCOMMON: 1.35,
  RARE: 1.8,
  EPIC: 2.4,
  LEGENDARY: 3.2,
  MYTHIC: 4.2,
  ANCIENT: 5.5,
};

export function rollRarity(rng: RNG, luck = 0): Rarity {
  const weights = RARITY_ORDER.map((r, i) => RARITY_WEIGHT[r] * (1 + luck * i * 0.15));
  return rng.weighted(RARITY_ORDER, weights);
}

export function generateItem(
  rng: RNG,
  slot: Slot,
  ilvl: number,
  regionIdx: number,
  forceRarity?: Rarity,
  classId?: string
): Item {
  const rarity = forceRarity ?? rollRarity(rng, regionIdx * 0.5);
  const pool = SLOT_STATS[slot];
  const count = RARITY_STAT_COUNT[rarity];
  const chosen = rng.shuffle(pool.slice()).slice(0, count);
  const stats: Partial<Stats> = {};
  const lvlScale = 1 + ilvl * 0.05;
  for (const k of chosen) {
    const base = ITEM_BASE[k] ?? 1;
    const v = base * lvlScale * RARITY_MULT[rarity] * rng.range(0.85, 1.15);
    stats[k] = roundStat(k, v);
  }
  const adj = rng.pick(REGION_ADJ[Math.min(regionIdx, REGION_ADJ.length - 1)]);
  
  let noun = "";
  if (slot === "weapon" && classId && CLASS_WEAPONS[classId]) {
    noun = rng.pick(CLASS_WEAPONS[classId]);
  } else {
    noun = rng.pick(SLOT_ITEMS[slot]);
  }

  const item: Item = {
    uid: nextUid(),
    slot,
    name: `${adj} ${noun}`,
    rarity,
    ilvl,
    enhance: 0,
    stats,
  };
  if (RARITY_ORDER.indexOf(rarity) >= 3) item.special = rng.pick(SPECIALS);
  return item;
}

function roundStat(k: keyof Stats, v: number): number {
  if (k === "atkspd" || k === "mvspd") return Math.round(v * 100) / 100;
  if (k === "hp" || k === "mp") return Math.round(v);
  if (k === "crit" || k === "eva" || k === "acc" || k === "critdmg" || k === "skilldmg") return Math.round(v);
  return Math.round(v);
}

export function enhanceMult(item: Item): number {
  return 1 + item.enhance * 0.08;
}

export function itemPower(item: Item): number {
  let p = 0;
  for (const k of Object.keys(item.stats) as (keyof Stats)[]) {
    const v = (item.stats[k] ?? 0) * enhanceMult(item);
    p += powerWeight(k) * v;
  }
  return Math.round(p);
}

function powerWeight(k: keyof Stats): number {
  switch (k) {
    case "hp": return 0.4;
    case "mp": return 0.2;
    case "atk": return 4;
    case "def": return 3;
    case "acc": return 1;
    case "eva": return 2;
    case "crit": return 4;
    case "critdmg": return 0.4;
    case "atkspd": return 30;
    case "mvspd": return 20;
    case "skilldmg": return 1.2;
  }
}

// ---- Experience curve ------------------------------------
export function expForLevel(level: number): number {
  return Math.floor(80 * Math.pow(level, 1.62));
}

// ---- Stat computation ------------------------------------
export function baseClassStats(classId: string, level: number, allocated: Stats): Stats {
  const c = CLASSES[classId];
  const s = emptyStats();
  (Object.keys(s) as (keyof Stats)[]).forEach((k) => {
    s[k] = Math.round((c.base[k] + c.growth[k] * (level - 1) + allocated[k]) * 100) / 100;
  });
  return s;
}

export function equipmentStats(profile: Profile): Stats {
  const s = emptyStats();
  for (const slot of SLOT_ORDER) {
    const it = profile.equipment[slot];
    if (!it) continue;
    const m = enhanceMult(it);
    for (const k of Object.keys(it.stats) as (keyof Stats)[]) {
      s[k] += (it.stats[k] ?? 0) * m;
    }
  }
  return s;
}

export function titleBonus(profile: Profile): Stats {
  const s = emptyStats();
  const t = titleStat(profile.activeTitle);
  (Object.keys(t) as (keyof Stats)[]).forEach((k) => (s[k] = t[k] ?? 0));
  return s;
}

/** Stat bonus granted by the currently equipped pet (scaled by its star level). */
export function petBonus(profile: Profile): Stats {
  const s = emptyStats();
  const active = activePetEntry(profile);
  if (!active) return s;
  const def = PETS[active.id];
  if (!def) return s;
  const mult = petStarMult(active.star);
  (Object.keys(def.bonus) as (keyof Stats)[]).forEach((k) => {
    s[k] = (def.bonus[k] ?? 0) * mult;
  });
  return s;
}

export function costumeBonus(profile: Profile): Stats {
  const s = emptyStats();
  if (!profile.activeCostume) return s;
  const costume = COSTUMES[profile.activeCostume];
  if (!costume) return s;
  (Object.keys(costume.bonus) as (keyof Stats)[]).forEach((k) => { s[k] = costume.bonus[k] ?? 0; });
  return s;
}

/** The owned-pet record for the profile's active pet, if any. */
export function activePetEntry(profile: Profile): OwnedPet | null {
  if (!profile.activePet) return null;
  if (profile.level < PET_UNLOCK_LEVEL) return null;
  return profile.pets.find((p) => p.id === profile.activePet) ?? null;
}

export function totalStats(profile: Profile): Stats {
  const base = baseClassStats(profile.classId, profile.level, profile.allocated);
  const eq = equipmentStats(profile);
  const title = titleBonus(profile);
  const pet = petBonus(profile);
  const costume = costumeBonus(profile);
  const s = emptyStats();
  (Object.keys(s) as (keyof Stats)[]).forEach((k) => {
    let v = base[k] + eq[k] + title[k] + pet[k] + costume[k];
    if (k === "hp" || k === "mp") v = Math.round(v);
    else if (k === "atk" || k === "def") v = Math.round(v);
    s[k] = Math.round(v * 100) / 100;
  });
  return s;
}

export function combatPower(stats: Stats): number {
  let p = 0;
  (Object.keys(stats) as (keyof Stats)[]).forEach((k) => (p += powerWeight(k) * stats[k]));
  return Math.round(p);
}

// ---- Profile creation ------------------------------------
export function newProfile(name: string, classId: string): Profile {
  const skills: Record<string, number> = {};
  CLASSES[classId].skills.forEach((id, i) => (skills[id] = i === 0 ? 3 : 0));
  const equipment: Record<Slot, Item | null> = {
    weapon: null, helmet: null, chest: null, gloves: null,
    boots: null, ring: null, necklace: null, earrings: null,
  };
  // starter weapon - generated specifically for the chosen class
  const rng = new RNG((Math.random() * 1e9) | 0);
  equipment.weapon = generateItem(rng, "weapon", 1, 0, "COMMON", classId);
  const achievements: Profile["achievements"] = {};
  return {
    version: 1,
    id: "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
    name: name || "Hero",
    classId,
    level: 1,
    exp: 0,
    gold: 120,
    crystals: 5,
    tokens: 0,
    statPoints: 0,
    allocated: emptyStats(),
    equipment,
    inventory: [],
    skills,
    unlocked: [classId],
    titles: ["Novice"],
    activeTitle: "Novice",
    achievements,
    materials: { iron: 3, leather: 2, crystal_shard: 0 },
    pets: [],
    activePet: null,
    costumes: [],
    activeCostume: null,
    costumePity: 0,
    costumePulls: 0,
    petShards: 0,
    spiritOrbs: 60,
    diamonds: 0,
    petPity: 0,
    petPulls: 0,
    bestDistance: 0,
    totalKills: 0,
    bossRecords: {},
    regionsCleared: 0,
    autoCombat: false,
    sound: true,
    checkpointDistance: 0,
  };
}

export function formatNum(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}

// ============================================================
//  PET GACHA
// ============================================================
export interface PullResult {
  petId: string;
  rarity: Rarity;
  duplicate: boolean;
  star: number;
  shards: number;
  pity: boolean;
}

export interface CostumePullResult {
  costumeId: string;
  rarity: Rarity;
  duplicate: boolean;
  level: number;
  pity: boolean;
}

const HIGH_TIERS: Rarity[] = ["LEGENDARY", "MYTHIC", "ANCIENT"];

function rollPetRarity(rng: RNG, forceHigh: boolean): Rarity {
  if (forceHigh) {
    // pity break — weighted among the top tiers only
    return rng.weighted(HIGH_TIERS, [88, 10, 2]);
  }
  const tiers = RARITY_ORDER;
  const weights = tiers.map((r) => PET_GACHA_RATES[r]);
  return rng.weighted(tiers, weights);
}

/**
 * Perform a single summon. Mutates the profile (pets, shards, pity counters).
 * Assumes the caller already deducted the crystal cost.
 */
export function pullPet(profile: Profile, rng: RNG): PullResult {
  profile.petPulls += 1;
  profile.petPity += 1;

  const forceHigh = profile.petPity >= PET_PITY;
  const rarity = rollPetRarity(rng, forceHigh);
  if (HIGH_TIERS.includes(rarity)) profile.petPity = 0;

  const pool = PET_LIST.filter((p) => p.rarity === rarity);
  const def = pool.length ? rng.pick(pool) : PET_LIST[0];

  const owned = profile.pets.find((p) => p.id === def.id);
  let duplicate = false;
  let shards = 0;
  let star = 1;

  if (owned) {
    duplicate = true;
    if (owned.star < PET_MAX_STAR) {
      owned.star += 1;
    } else {
      // fully starred — convert to shards instead
      shards = PET_DUPE_SHARDS[def.rarity] * 2;
    }
    shards += PET_DUPE_SHARDS[def.rarity];
    profile.petShards += shards;
    star = owned.star;
  } else {
    profile.pets.push({ id: def.id, star: 1 });
    // auto-equip the very first pet for convenience
    if (!profile.activePet) profile.activePet = def.id;
  }

  return { petId: def.id, rarity: def.rarity, duplicate, star, shards, pity: forceHigh };
}

export function pullPetMany(profile: Profile, rng: RNG, count: number): PullResult[] {
  const out: PullResult[] = [];
  for (let i = 0; i < count; i++) out.push(pullPet(profile, rng));
  return out;
}

/** Spend shards to raise a pet's star without pulling duplicates. */
export function starUpCost(star: number): number {
  return 40 + star * 60;
}

export function pullCostume(profile: Profile, rng: RNG): CostumePullResult {
  profile.costumePulls += 1;
  profile.costumePity += 1;
  const forceHigh = profile.costumePity >= COSTUME_PITY;
  const tiers = forceHigh ? HIGH_TIERS : RARITY_ORDER;
  const weights = forceHigh ? [88, 10, 2] : tiers.map((r) => COSTUME_GACHA_RATES[r]);
  const rarity = rng.weighted(tiers, weights);
  if (HIGH_TIERS.includes(rarity)) profile.costumePity = 0;
  const pool = COSTUME_LIST.filter((c) => c.rarity === rarity);
  const def = pool.length ? rng.pick(pool) : COSTUME_LIST[0];
  const owned = profile.costumes.find((c) => c.id === def.id);
  if (owned) {
    owned.level = Math.min(5, owned.level + 1);
    return { costumeId: def.id, rarity: def.rarity, duplicate: true, level: owned.level, pity: forceHigh };
  }
  profile.costumes.push({ id: def.id, level: 1 });
  if (!profile.activeCostume) profile.activeCostume = def.id;
  return { costumeId: def.id, rarity: def.rarity, duplicate: false, level: 1, pity: forceHigh };
}

export function pullCostumes(profile: Profile, rng: RNG, count: number): CostumePullResult[] {
  return Array.from({ length: count }, () => pullCostume(profile, rng));
}
