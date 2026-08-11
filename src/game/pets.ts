// ============================================================
//  PET SYSTEM — gacha summoning, companions, passive bonuses
//  Unlocks at level 10. Pets float behind the hero and attack.
// ============================================================
import { RNG } from "./rng";
import { type Rarity, type Stats, RARITY_ORDER } from "./types";

export const PET_UNLOCK_LEVEL = 10;
export const PET_MAX_LEVEL = 20;

export interface PetDef {
  id: string;
  name: string;
  rarity: Rarity;
  color: string;
  frames: string[][];
  symbol: string; // projectile glyph
  atkPct: number; // % of owner ATK per hit
  cd: number; // attack interval (seconds)
  range: number;
  bonus: Partial<Stats>; // passive bonus granted while active
  desc: string;
}

export interface OwnedPet {
  uid: string;
  defId: string;
  level: number;
  shards: number;
}

export interface GachaPity {
  epic: number;
  legendary: number;
}

// ----------------------------------------------------------
//  Pet roster
// ----------------------------------------------------------
export const PETS: Record<string, PetDef> = {
  mote: {
    id: "mote", name: "Glimmer Mote", rarity: "COMMON", color: "#9aa7b8",
    frames: [[" (*) ", "  ·  "], [" (*) ", "  ˙  "]],
    symbol: "·", atkPct: 22, cd: 2.2, range: 12,
    bonus: { atk: 4 }, desc: "A faint spark that nips at foes.",
  },
  dust_pup: {
    id: "dust_pup", name: "Dust Pup", rarity: "COMMON", color: "#b9a98c",
    frames: [["/^-^\\", " ~~~ "], ["/^-^\\", "  ~~ "]],
    symbol: "•", atkPct: 25, cd: 2.1, range: 11,
    bonus: { hp: 60 }, desc: "Loyal scrapper from the plains.",
  },
  ember_wisp: {
    id: "ember_wisp", name: "Ember Wisp", rarity: "UNCOMMON", color: "#ff9a4a",
    frames: [["  ^  ", " (o) ", "  ~  "], ["  ^  ", " (o) ", "  ˅  "]],
    symbol: "*", atkPct: 34, cd: 2.0, range: 13,
    bonus: { atk: 10, crit: 2 }, desc: "Burning cinder that scorches enemies.",
  },
  frost_moth: {
    id: "frost_moth", name: "Frost Moth", rarity: "UNCOMMON", color: "#9fe0ff",
    frames: [[" \\*/ ", " (o) "], [" /*\\ ", " (o) "]],
    symbol: "❄", atkPct: 31, cd: 2.0, range: 13,
    bonus: { def: 9, eva: 2 }, desc: "Chill wings that blunt incoming blows.",
  },
  storm_finch: {
    id: "storm_finch", name: "Storm Finch", rarity: "RARE", color: "#7fd0ff",
    frames: [[" >o) ", "  ^^ "], [" >o) ", "  vv "]],
    symbol: "⁄", atkPct: 46, cd: 1.6, range: 15,
    bonus: { atk: 18, atkspd: 0.05 }, desc: "Darting bird that strikes like lightning.",
  },
  grove_sprout: {
    id: "grove_sprout", name: "Grove Sprout", rarity: "RARE", color: "#6fd98a",
    frames: [["  YY ", " (··)"], ["  YY ", " (^^)"]],
    symbol: "❦", atkPct: 42, cd: 1.9, range: 13,
    bonus: { hp: 220, def: 14 }, desc: "Sapling spirit that bolsters vitality.",
  },
  shadow_cat: {
    id: "shadow_cat", name: "Shadow Cat", rarity: "EPIC", color: "#a98bff",
    frames: [["/\\_/\\", "(-.-)"], ["/\\_/\\", "(o.o)"]],
    symbol: "✕", atkPct: 64, cd: 1.4, range: 14,
    bonus: { atk: 30, crit: 6, critdmg: 15 }, desc: "Stalks from the dark, striking vitals.",
  },
  rune_orb: {
    id: "rune_orb", name: "Rune Orb", rarity: "EPIC", color: "#49b6ff",
    frames: [[" {◆} ", "  ·  "], [" {◇} ", "  ·  "]],
    symbol: "◆", atkPct: 60, cd: 1.5, range: 16,
    bonus: { mp: 80, skilldmg: 12 }, desc: "Ancient sigil pulsing with arcane force.",
  },
  astral_drake: {
    id: "astral_drake", name: "Astral Drake", rarity: "LEGENDARY", color: "#ffc24b",
    frames: [[" /\\_/\\", "(◆ ◆)", " ~^~ "], [" /\\_/\\", "(◇ ◇)", " ~v~ "]],
    symbol: "≫", atkPct: 92, cd: 1.2, range: 17,
    bonus: { atk: 55, crit: 8, critdmg: 25, hp: 300 }, desc: "Wyrmling of the star-paths.",
  },
  ember_phoenix: {
    id: "ember_phoenix", name: "Ember Phoenix", rarity: "LEGENDARY", color: "#ff7a4a",
    frames: [["  /\\  ", " (**) ", " /~~\\ "], ["  /\\  ", " (**) ", " \\~~/ "]],
    symbol: "✹", atkPct: 88, cd: 1.25, range: 16,
    bonus: { atk: 48, skilldmg: 20, hp: 260 }, desc: "Reborn flame that never yields.",
  },
  void_seraph: {
    id: "void_seraph", name: "Void Seraph", rarity: "MYTHIC", color: "#ff6fb0",
    frames: [[" \\|/ ", " (@) ", " /|\\ "], [" /|\\ ", " (@) ", " \\|/ "]],
    symbol: "✷", atkPct: 128, cd: 1.0, range: 18,
    bonus: { atk: 90, crit: 12, critdmg: 40, hp: 500, skilldmg: 25 },
    desc: "Winged herald from beyond the veil.",
  },
  eclipse_wyrm: {
    id: "eclipse_wyrm", name: "Eclipse Wyrm", rarity: "ANCIENT", color: "#ff7d52",
    frames: [[" /≡\\ ", "(●●●)", " \\≡/ "], [" \\≡/ ", "(●●●)", " /≡\\ "]],
    symbol: "✺", atkPct: 175, cd: 0.85, range: 20,
    bonus: { atk: 150, def: 60, crit: 18, critdmg: 60, hp: 900, skilldmg: 40 },
    desc: "The devourer of light. Few have ever seen one.",
  },
};

export const PET_LIST: PetDef[] = Object.values(PETS);

// ----------------------------------------------------------
//  Gacha banners & rates
// ----------------------------------------------------------
export type BannerId = "basic" | "premium";

export interface Banner {
  id: BannerId;
  name: string;
  desc: string;
  currency: "gold" | "crystals";
  cost: number;
  cost10: number;
  color: string;
  rates: Record<Rarity, number>;
}

export const BANNERS: Record<BannerId, Banner> = {
  basic: {
    id: "basic", name: "Wandering Menagerie", desc: "Standard summon using gold.",
    currency: "gold", cost: 1500, cost10: 13500, color: "#9fd17a",
    rates: { COMMON: 44, UNCOMMON: 30, RARE: 16, EPIC: 7, LEGENDARY: 2.4, MYTHIC: 0.5, ANCIENT: 0.1 },
  },
  premium: {
    id: "premium", name: "Astral Covenant", desc: "Boosted rates using crystals.",
    currency: "crystals", cost: 20, cost10: 180, color: "#b98bff",
    rates: { COMMON: 20, UNCOMMON: 28, RARE: 27, EPIC: 16, LEGENDARY: 6.5, MYTHIC: 2, ANCIENT: 0.5 },
  },
};

// Pity: guaranteed EPIC+ every 10 pulls, LEGENDARY+ every 60.
export const PITY_EPIC = 10;
export const PITY_LEGENDARY = 60;

const RARITY_SHARDS: Record<Rarity, number> = {
  COMMON: 1, UNCOMMON: 2, RARE: 4, EPIC: 8, LEGENDARY: 18, MYTHIC: 40, ANCIENT: 80,
};

export function shardsFor(r: Rarity): number {
  return RARITY_SHARDS[r];
}

export interface PullResult {
  def: PetDef;
  duplicate: boolean;
  shards: number;
  pityTriggered: boolean;
}

function pickByRarity(rng: RNG, rarity: Rarity): PetDef {
  const pool = PET_LIST.filter((p) => p.rarity === rarity);
  if (pool.length === 0) return PETS.mote;
  return rng.pick(pool);
}

function rollRarity(rng: RNG, banner: Banner, pity: GachaPity): { rarity: Rarity; forced: boolean } {
  // hard pity checks first
  if (pity.legendary + 1 >= PITY_LEGENDARY) {
    const high: Rarity[] = ["LEGENDARY", "MYTHIC", "ANCIENT"];
    return { rarity: rng.weighted(high, [80, 17, 3]), forced: true };
  }
  if (pity.epic + 1 >= PITY_EPIC) {
    const high: Rarity[] = ["EPIC", "LEGENDARY", "MYTHIC", "ANCIENT"];
    return { rarity: rng.weighted(high, [76, 19, 4, 1]), forced: true };
  }
  const weights = RARITY_ORDER.map((r) => banner.rates[r]);
  return { rarity: rng.weighted(RARITY_ORDER, weights), forced: false };
}

/** Perform a single pull, mutating the pity counters. */
export function pullOnce(rng: RNG, banner: Banner, pity: GachaPity, owned: OwnedPet[]): PullResult {
  const { rarity, forced } = rollRarity(rng, banner, pity);
  const def = pickByRarity(rng, rarity);
  const idx = RARITY_ORDER.indexOf(rarity);

  // update pity counters
  pity.epic = idx >= RARITY_ORDER.indexOf("EPIC") ? 0 : pity.epic + 1;
  pity.legendary = idx >= RARITY_ORDER.indexOf("LEGENDARY") ? 0 : pity.legendary + 1;

  const existing = owned.find((p) => p.defId === def.id);
  const shards = shardsFor(rarity);
  if (existing) {
    existing.shards += shards;
    return { def, duplicate: true, shards, pityTriggered: forced };
  }
  owned.push({ uid: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, defId: def.id, level: 1, shards: 0 });
  return { def, duplicate: false, shards: 0, pityTriggered: forced };
}

// ----------------------------------------------------------
//  Pet progression
// ----------------------------------------------------------
export function levelUpCost(level: number): number {
  return Math.max(2, Math.round(2 + level * 1.8));
}

export function petScale(level: number): number {
  return 1 + (level - 1) * 0.12;
}

/** Effective damage-per-hit as a fraction of the owner's ATK. */
export function petAtkFraction(def: PetDef, level: number): number {
  return (def.atkPct / 100) * petScale(level);
}

/** Passive stats granted by the active pet, scaled by its level. */
export function petBonusStats(def: PetDef, level: number): Partial<Stats> {
  const s = petScale(level);
  const out: Partial<Stats> = {};
  for (const k of Object.keys(def.bonus) as (keyof Stats)[]) {
    const v = def.bonus[k] ?? 0;
    out[k] = k === "atkspd" || k === "mvspd" ? Math.round(v * s * 100) / 100 : Math.round(v * s);
  }
  return out;
}

export function petFrames(def: PetDef, anim: number): string[] {
  return def.frames[Math.floor(anim) % def.frames.length];
}
