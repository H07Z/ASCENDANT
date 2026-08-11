// ============================================================
//  Persistent profile: creation, stats, leveling, item gen
// ============================================================
import { CLASSES, RARITY_WEIGHT, titleStat } from "./content";
import { RNG } from "./rng";
import {
  type Item,
  type Profile,
  type Rarity,
  type Slot,
  type Stats,
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
  forceRarity?: Rarity
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
  const noun = rng.pick(SLOT_ITEMS[slot]);
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

export function totalStats(profile: Profile): Stats {
  const base = baseClassStats(profile.classId, profile.level, profile.allocated);
  const eq = equipmentStats(profile);
  const title = titleBonus(profile);
  const s = emptyStats();
  (Object.keys(s) as (keyof Stats)[]).forEach((k) => {
    let v = base[k] + eq[k] + title[k];
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
  // starter weapon
  const rng = new RNG((Math.random() * 1e9) | 0);
  equipment.weapon = generateItem(rng, "weapon", 1, 0, "COMMON");
  const achievements: Profile["achievements"] = {};
  return {
    version: 1,
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
    bestDistance: 0,
    totalKills: 0,
    bossRecords: {},
    regionsCleared: 0,
    autoCombat: false,
    sound: true,
  };
}

export function formatNum(n: number): string {
  return Math.floor(n).toLocaleString("en-US");
}
