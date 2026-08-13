// ============================================================
//  ASCENDANT — ASCII MMORPG Endless Runner
//  Shared types & global grid constants
// ============================================================

// ---- Grid / viewport configuration -------------------------
export const COLS = 104; // characters per row
export const ROWS = 34; // rows of characters
export const CELL_W = 10; // px per character (monospace)
export const CELL_H = 16; // px per character line
export const GROUND_BASE = 25; // baseline ground row (0 = top)
export const PLAYER_COL = 40; // screen column the hero occupies (slightly left of center)

// ---- Stats --------------------------------------------------
export type StatKey =
  | "hp"
  | "mp"
  | "atk"
  | "def"
  | "acc"
  | "eva"
  | "crit"
  | "critdmg"
  | "atkspd"
  | "mvspd"
  | "skilldmg";

export type Stats = Record<StatKey, number>;

export const STAT_ORDER: StatKey[] = [
  "hp",
  "mp",
  "atk",
  "def",
  "acc",
  "eva",
  "crit",
  "critdmg",
  "atkspd",
  "mvspd",
  "skilldmg",
];

export const STAT_LABEL: Record<StatKey, string> = {
  hp: "HP",
  mp: "MP",
  atk: "ATK",
  def: "DEF",
  acc: "ACC",
  eva: "EVA",
  crit: "CRIT",
  critdmg: "C.DMG",
  atkspd: "ATK SPD",
  mvspd: "MOVE",
  skilldmg: "SKILL",
};

export function emptyStats(): Stats {
  return {
    hp: 0,
    mp: 0,
    atk: 0,
    def: 0,
    acc: 0,
    eva: 0,
    crit: 0,
    critdmg: 0,
    atkspd: 0,
    mvspd: 0,
    skilldmg: 0,
  };
}

// ---- Rarity -------------------------------------------------
export type Rarity =
  | "COMMON"
  | "UNCOMMON"
  | "RARE"
  | "EPIC"
  | "LEGENDARY"
  | "MYTHIC"
  | "ANCIENT";

export const RARITY_ORDER: Rarity[] = [
  "COMMON",
  "UNCOMMON",
  "RARE",
  "EPIC",
  "LEGENDARY",
  "MYTHIC",
  "ANCIENT",
];

export type Slot =
  | "weapon"
  | "helmet"
  | "chest"
  | "gloves"
  | "boots"
  | "ring"
  | "necklace"
  | "earrings";

export const SLOT_ORDER: Slot[] = [
  "weapon",
  "helmet",
  "chest",
  "gloves",
  "boots",
  "ring",
  "necklace",
  "earrings",
];

export const SLOT_LABEL: Record<Slot, string> = {
  weapon: "Weapon",
  helmet: "Helmet",
  chest: "Chest",
  gloves: "Gloves",
  boots: "Boots",
  ring: "Ring",
  necklace: "Necklace",
  earrings: "Earrings",
};

// ---- Items --------------------------------------------------
export interface Item {
  uid: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  ilvl: number;
  enhance: number;
  stats: Partial<Stats>;
  special?: string;
}

// ---- Skills -------------------------------------------------
export type SkillKind =
  | "strike"
  | "cleave"
  | "aoe"
  | "projectile"
  | "dash"
  | "heal"
  | "buff"
  | "ultimate";

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  desc: string;
  mana: number;
  cd: number;
  mult: number;
  radius?: number;
  range?: number;
  symbol: string;
  ultimate?: boolean;
}

// ---- Classes ------------------------------------------------
export interface ClassDef {
  id: string;
  name: string;
  role: string;
  desc: string;
  color: string;
  headGlyph: string;
  bodyGlyph: string;
  weaponGlyph: string;
  base: Stats;
  growth: Stats;
  skills: string[]; // skill ids unlocked in order (last = ultimate)
}

// ---- Enemies / Bosses --------------------------------------
export type AIType = "walker" | "charger" | "flyer" | "turret" | "cavalry";

export interface EnemyDef {
  id: string;
  name: string;
  artKey: string;
  color: string;
  ai: AIType;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  size: [number, number];
  ranged?: boolean;
}

export type BossAttackKind = "slam" | "wave" | "charge" | "rain";

export interface BossAttack {
  kind: BossAttackKind;
  windup: number;
  dmgMult: number;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  artKey: string;
  color: string;
  hp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  tokens: number;
  size: [number, number];
  attacks: BossAttack[];
}

// ---- Regions ------------------------------------------------
export interface Palette {
  sky1: string;
  sky2: string;
  ground: string;
  ground2: string;
  fog: string;
  accent: string;
  star: string;
}

export type MidKind = "plain" | "forest" | "ruin" | "ice" | "demon" | "sky";

export interface RegionDef {
  idx: number;
  id: string;
  name: string;
  palette: Palette;
  mid: MidKind;
  groundChar: string;
  fogChar: string;
  enemies: string[];
  boss: string;
  lengthM: number;
}

// ---- Pets ---------------------------------------------------
export const PET_UNLOCK_LEVEL = 10;

export interface PetDef {
  id: string;
  name: string;
  rarity: Rarity;
  element: string;
  color: string;
  desc: string;
  art: string[];
  atkMult: number; // shot damage as a fraction of owner ATK
  cd: number; // seconds between shots
  range: number; // attack range in cells
  symbol: string; // projectile glyph
  bonus: Partial<Stats>; // owner stat bonus at 1★
}

export interface OwnedPet {
  id: string;
  star: number; // 1..5
}

// ---- Achievement -------------------------------------------
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  goal: number;
  rewardTitle: string;
  stat?: Partial<Stats>;
}

// ---- Persistent profile ------------------------------------
export interface Profile {
  version: number;
  id: string;
  name: string;
  classId: string;
  level: number;
  exp: number;
  gold: number;
  crystals: number;
  tokens: number;
  statPoints: number;
  allocated: Stats;
  equipment: Record<Slot, Item | null>;
  inventory: Item[];
  skills: Record<string, number>;
  unlocked: string[];
  titles: string[];
  activeTitle: string;
  achievements: Record<string, { p: number; c: boolean }>;
  materials: Record<string, number>;
  pets: OwnedPet[];
  activePet: string | null;
  petShards: number;
  spiritOrbs: number;
  diamonds: number; // rare boss-only currency, used to continue after death
  petPity: number;
  petPulls: number;
  bestDistance: number;
  totalKills: number;
  bossRecords: Record<string, number>;
  regionsCleared: number;
  autoCombat: boolean;
  sound: boolean;
}

// ---- Run statistics (resets each run) ----------------------
export interface RunStats {
  distance: number;
  kills: number;
  bosses: number;
  goldEarned: number;
  expEarned: number;
  regionIdx: number;
  maxCombo: number;
}
