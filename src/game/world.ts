// ============================================================
//  Procedural world: terrain, regions, difficulty, spawns
// ============================================================
import { BOSSES, ENEMIES, REGIONS, MID_ART } from "./content";
import { RNG, fbm1D, hashStr } from "./rng";
import { GROUND_BASE, type RegionDef } from "./types";

export const METERS_PER_CELL = 1.55;

// ---- Difficulty progression tiers --------------------------
// Enemy strength scales with distance; loot & XP scale alongside so
// pushing deeper always stays rewarding. Abyss scales infinitely.
export interface DifficultyTier {
  name: string;
  color: string;
  mult: number;
  from: number;
}

export function difficultyTier(dist: number): DifficultyTier {
  if (dist < 5000) return { name: "EASY", color: "#5fd17a", mult: 1, from: 0 };
  if (dist < 15000) return { name: "NORMAL", color: "#9fd0ff", mult: 1.25, from: 5000 };
  if (dist < 30000) return { name: "HARD", color: "#ffd24b", mult: 1.6, from: 15000 };
  if (dist < 50000) return { name: "NIGHTMARE", color: "#ff8a4a", mult: 2.1, from: 30000 };
  // Abyss: +10% enemy power per 10,000m forever
  const abyssMult = 2.8 * (1 + ((dist - 50000) / 10000) * 0.1);
  return { name: "ABYSS", color: "#ff5d5d", mult: abyssMult, from: 50000 };
}

export type Spawn =
  | { kind: "enemy"; x: number; enemyId: string; elite: boolean; level: number }
  | { kind: "loot"; x: number; row: number; payload: LootPayload }
  | { kind: "platform"; x: number; w: number; topRow: number }
  | { kind: "spike"; x: number; w: number; row: number }
  | { kind: "chest"; x: number; row: number; tier: number }
  | { kind: "npc"; x: number; row: number; npc: string }
  | { kind: "boss"; x: number; bossId: string; regionIdx: number; level: number }
  | { kind: "town"; x: number };

export interface LootPayload {
  gold?: number;
  crystals?: number;
  mat?: { id: string; n: number };
  exp?: number;
}

export interface BgProp {
  sx: number;
  row: number;
  kind: string;
  alpha: number;
}

export class World {
  rng: RNG;
  ground: Map<number, number> = new Map();
  chasms: Array<[number, number]> = [];
  computedTo = 0;
  genCol = 24;
  spawns: Spawn[] = [];
  scheduledBoss: Set<number> = new Set();
  totalLen: number;
  seed: number;

  constructor(seed?: number) {
    this.seed = seed ?? ((Math.random() * 1e9) | 0);
    this.rng = new RNG(this.seed);
    this.totalLen = REGIONS.reduce((s, r) => s + r.lengthM, 0);
    this.reset();
  }

  reset() {
    this.ground.clear();
    this.chasms = [];
    this.computedTo = 0;
    this.genCol = 24;
    this.spawns = [];
    this.scheduledBoss.clear();
  }

  dist(col: number): number {
    return col * METERS_PER_CELL;
  }

  regionFor(dist: number): { region: RegionDef; cycle: number; regionIdx: number; localDist: number; regionStart: number } {
    const within = dist % this.totalLen;
    const cycle = Math.floor(dist / this.totalLen);
    let acc = 0;
    for (let i = 0; i < REGIONS.length; i++) {
      if (within < acc + REGIONS[i].lengthM) {
        return { region: REGIONS[i], cycle, regionIdx: i, localDist: within - acc, regionStart: acc + cycle * this.totalLen };
      }
      acc += REGIONS[i].lengthM;
    }
    const last = REGIONS.length - 1;
    return { region: REGIONS[last], cycle, regionIdx: last, localDist: 0, regionStart: 0 };
  }

  regionAtCol(col: number) {
    return this.regionFor(this.dist(col));
  }

  difficulty(dist: number): { hp: number; atk: number; xp: number; gold: number; level: number } {
    const level = 1 + Math.floor(dist / 240);
    const tier = difficultyTier(dist);
    return {
      level,
      hp: (1 + dist / 820) * tier.mult,
      atk: (1 + dist / 2100) * tier.mult,
      xp: (1 + dist / 2800) * (1 + (tier.mult - 1) * 0.6),
      gold: (1 + dist / 2500) * (1 + (tier.mult - 1) * 0.6),
    };
  }

  // ---- Terrain: smooth, always-walkable rolling ground ----
  ensureGround(upTo: number) {
    let h = this.ground.get(this.computedTo) ?? GROUND_BASE;
    if (this.computedTo === 0) h = GROUND_BASE;
    for (let c = this.computedTo; c <= upTo; c++) {
      const reg = this.regionAtCol(c);
      const amp = 1.6 + reg.regionIdx * 0.35;
      const noise = (fbm1D(c * 0.06, this.seed + reg.regionIdx * 131 + reg.cycle * 7, 3) - 0.5) * 2 * amp;
      const target = GROUND_BASE + noise;
      // chasms keep the surface line (the hero falls through it, bounces back out)
      h += (target - h) * 0.16;
      this.ground.set(c, Math.round(h));
    }
    this.computedTo = Math.max(this.computedTo, upTo);
  }

  groundAt(col: number): number {
    if (col < 0) return GROUND_BASE;
    if (!this.ground.has(col) || col > this.computedTo) this.ensureGround(col);
    return this.ground.get(col) ?? GROUND_BASE;
  }

  isChasm(col: number): boolean {
    return this.chasms.some(([a, b]) => col >= a && col <= b);
  }

  // ---- Feature / spawn generation ahead of camera ----
  generate(cameraRight: number) {
    const target = cameraRight + 60;
    this.ensureGround(target + 8);
    while (this.genCol < target) {
      const col = this.genCol;
      const dist = this.dist(col);
      const info = this.regionFor(dist);
      const diff = this.difficulty(dist);
      const regionEnd = info.regionStart + info.region.lengthM;

      // boss near region end
      const bossX = Math.round((regionEnd - 70) / METERS_PER_CELL);
      const bossKey = info.cycle * 10 + info.regionIdx;
      if (col >= bossX && !this.scheduledBoss.has(bossKey) && info.localDist > info.region.lengthM - 200) {
        this.scheduledBoss.add(bossKey);
        // generous clear arena in front of & behind the boss spawn point
        this.spawns.push({ kind: "boss", x: bossX + 14, bossId: info.region.boss, regionIdx: info.regionIdx, level: diff.level + 4 + info.cycle * 6 });
        this.genCol = bossX + 34;
        continue;
      }

      if (this.isChasm(col)) {
        this.genCol += 1;
        continue;
      }

      const roll = this.rng.next();
      const eliteChance = Math.min(0.22, 0.03 + dist / 11000);

      // A wide, clean gap always separates one encounter/obstacle from the next —
      // mirrors a simple 1v1 "battle arena" pacing instead of cluttered terrain.
      const CLEAR_GAP = 22;

      if (roll < 0.03 + dist / 70000) {
        // chasm gap (jumpable — kept narrow so a timed jump always clears it)
        const w = this.rng.int(3, 4);
        this.chasms.push([col, col + w]);
        this.genCol += w + CLEAR_GAP;
        continue;
      } else if (roll < 0.07) {
        // chest — open ground around it, nothing crowding it
        const g = this.groundAt(col);
        this.spawns.push({ kind: "chest", x: col, row: g - 3, tier: info.regionIdx + info.cycle });
        this.genCol += CLEAR_GAP;
        continue;
      } else if (roll < 0.10 && info.regionIdx > 0) {
        // npc quest-giver
        const g = this.groundAt(col);
        const npcs = ["merchant", "elder", "wanderer", "blacksmith"];
        this.spawns.push({ kind: "npc", x: col, row: g - 4, npc: this.rng.pick(npcs) });
        this.genCol += CLEAR_GAP + 4;
        continue;
      } else if (roll < 0.15) {
        // platform — isolated, reachable, no overlap with anything else
        const g = this.groundAt(col);
        const topRow = g - this.rng.int(4, 7);
        this.spawns.push({ kind: "platform", x: col, w: this.rng.int(4, 7), topRow });
        this.genCol += CLEAR_GAP;
        continue;
      } else if (roll < 0.20) {
        // spike hazard — kept short and clear of the next encounter
        const g = this.groundAt(col);
        this.spawns.push({ kind: "spike", x: col, w: this.rng.int(2, 3), row: g - 1 });
        this.genCol += CLEAR_GAP;
        continue;
      } else if (roll < 0.27) {
        // world loot
        const g = this.groundAt(col);
        const pay = this.rollLoot(dist, info.regionIdx, false);
        this.spawns.push({ kind: "loot", x: col, row: g - 3, payload: pay });
        this.genCol += CLEAR_GAP;
        continue;
      } else if (roll < 0.27 + eliteChance) {
        // elite — spawns alone in a clean arena, no clutter nearby
        const id = this.rng.pick(info.region.enemies);
        this.spawns.push({ kind: "enemy", x: col, enemyId: id, elite: true, level: diff.level + 2 });
        this.genCol += CLEAR_GAP + 10;
        continue;
      } else {
        // single enemy encounter — strict 1v1 arena, generously spaced from
        // whatever came before and whatever comes next
        const id = this.rng.pick(info.region.enemies);
        this.spawns.push({ kind: "enemy", x: col, enemyId: id, elite: false, level: diff.level });
        this.genCol += CLEAR_GAP + this.rng.int(4, 12);
        continue;
      }
    }
  }

  rollLoot(dist: number, regionIdx: number, boss: boolean): LootPayload {
    const g = Math.round((8 + dist * 0.4) * (boss ? 12 : 1) * this.rng.range(0.8, 1.3));
    const pay: LootPayload = { gold: g };
    if (boss || this.rng.chance(0.12)) pay.crystals = this.rng.int(1, boss ? 8 : 3);
    if (this.rng.chance(0.5)) {
      const mats = ["iron", "leather", "crystal_shard", "essence"];
      const id = mats[Math.min(regionIdx, mats.length - 1)];
      pay.mat = { id, n: this.rng.int(1, boss ? 6 : 2) };
    }
    if (boss) pay.exp = Math.round(dist * 0.5 + 2000);
    return pay;
  }

  popSpawns(upto: number): Spawn[] {
    const out: Spawn[] = [];
    for (let i = this.spawns.length - 1; i >= 0; i--) {
      if (this.spawns[i].x <= upto) {
        out.push(this.spawns[i]);
        this.spawns.splice(i, 1);
      }
    }
    return out;
  }

  // ---- Background parallax silhouettes ----
  farProps(cameraX: number): BgProp[] {
    const out: BgProp[] = [];
    const info = this.regionAtCol(cameraX + 30);
    const p = info.region;
    const factor = 0.25;
    for (let x = -2; x < 110; x += 1) {
      const wc = Math.floor((cameraX * factor + x) * 0.5);
      const h = hashStr(wc + "f" + p.id);
      if (h % 100 < 8) {
        const kind = p.mid === "sky" ? "cloud" : "tower";
        out.push({ sx: x, row: 6 + (h % 5), kind, alpha: 0.5 });
      } else if (p.mid !== "sky" && h % 137 < 6) {
        out.push({ sx: x, row: 8 + (h % 4), kind: "mountain", alpha: 0.4 });
      }
    }
    return out;
  }

  midProps(cameraX: number): BgProp[] {
    const out: BgProp[] = [];
    const info = this.regionAtCol(cameraX + 30);
    const p = info.region;
    const factor = 0.5;
    for (let x = -2; x < 110; x += 1) {
      const wc = Math.floor((cameraX * factor + x) * 0.6);
      const h = hashStr(wc + "m" + p.id);
      if (h % 100 < 10) {
        let kind = "tree";
        if (p.mid === "forest") kind = h % 2 ? "pine" : "tree";
        else if (p.mid === "ruin") kind = h % 2 ? "pillar" : "obelisk";
        else if (p.mid === "ice") kind = "crystal";
        else if (p.mid === "demon") kind = "obelisk";
        else if (p.mid === "sky") kind = "crystal";
        const baseRow = this.groundAt(Math.floor(cameraX + x)) - 1;
        out.push({ sx: x, row: baseRow - (MID_ART[kind]?.length ?? 3) + 1, kind, alpha: 0.7 });
      }
    }
    return out;
  }

  enemyDef(id: string) {
    return ENEMIES[id];
  }
  bossDef(id: string) {
    return BOSSES[id];
  }
}
