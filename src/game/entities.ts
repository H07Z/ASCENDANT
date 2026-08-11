// ============================================================
//  Live entities + AI: enemies, bosses, projectiles, FX
// ============================================================
import { BOSS_ART, BOSSES, ENEMIES, ENEMY_ART } from "./content";
import { RNG } from "./rng";
import { type World } from "./world";

export interface PlayerRef {
  col: number;
  feetRow: number;
  alive: boolean;
  invuln: boolean;
}

export interface CombatCtx {
  dt: number;
  t: number;
  rng: RNG;
  player: PlayerRef;
  groundAt(col: number): number;
  hurtPlayer(dmg: number, source: string): void;
  spawnProj(p: Projectile): void;
  burst(x: number, y: number, color: string, n: number): void;
  damageNumber(x: number, y: number, val: number, crit: boolean, color?: string): void;
  floatText(x: number, y: number, text: string, color: string): void;
  shake(amount: number): void;
}

// ----------------------------------------------------------
export interface Enemy {
  kind: "enemy";
  x: number; // world col
  feetRow: number;
  vy: number;
  hp: number;
  maxHp: number;
  ghostHp: number; // lagging value for damage-chip animation
  atk: number;
  def: number;
  xp: number;
  gold: number;
  elite: boolean;
  level: number;
  ai: string;
  ranged: boolean;
  color: string;
  artKey: string;
  name: string;
  size: [number, number];
  cd: number; // attack cooldown
  hurtT: number; // flash timer
  kb: number; // knockback velocity
  dead: boolean;
  anim: number;
}

export function makeEnemy(spawn: { x: number; enemyId: string; elite: boolean; level: number }, world: World): Enemy {
  const d = ENEMIES[spawn.enemyId];
  const diff = world.difficulty(world.dist(spawn.x));
  const eliteMul = spawn.elite ? 2.6 : 1;
  return {
    kind: "enemy",
    x: spawn.x,
    feetRow: world.groundAt(Math.round(spawn.x)) - 1,
    vy: 0,
    hp: Math.round(d.hp * diff.hp * (1 + spawn.level * 0.12) * eliteMul),
    maxHp: Math.round(d.hp * diff.hp * (1 + spawn.level * 0.12) * eliteMul),
    ghostHp: Math.round(d.hp * diff.hp * (1 + spawn.level * 0.12) * eliteMul),
    atk: Math.round(d.atk * diff.atk * (1 + spawn.level * 0.1) * (spawn.elite ? 1.5 : 1)),
    def: Math.round(d.def * (1 + spawn.level * 0.08)),
    xp: Math.round(d.xp * diff.xp * (spawn.elite ? 4 : 1)),
    gold: Math.round(d.gold * diff.gold * (spawn.elite ? 5 : 1)),
    elite: spawn.elite,
    level: spawn.level,
    ai: d.ai,
    ranged: !!d.ranged,
    color: spawn.elite ? "#ffd24b" : d.color,
    artKey: d.artKey,
    name: d.name,
    size: d.size,
    cd: 0.6,
    hurtT: 0,
    kb: 0,
    dead: false,
    anim: Math.random() * 10,
  };
}

export function enemyFrames(e: Enemy): string[] {
  const frames = ENEMY_ART[e.artKey];
  return frames[Math.floor(e.anim) % frames.length];
}

export function updateEnemy(e: Enemy, ctx: CombatCtx) {
  const { dt } = ctx;
  e.anim += dt * 6;
  if (e.hurtT > 0) e.hurtT -= dt;
  if (e.cd > 0) e.cd -= dt;
  // damage-chip trail catches up to real HP smoothly
  if (e.ghostHp > e.hp) e.ghostHp = Math.max(e.hp, e.ghostHp - (e.ghostHp - e.hp) * dt * 6 - e.maxHp * dt * 0.35);

  // knockback decays & pushes right (away from player)
  if (e.kb !== 0) {
    e.x += e.kb * dt;
    e.kb *= 0.86;
    if (Math.abs(e.kb) < 0.2) e.kb = 0;
  }

  const target = ctx.player.col;
  const dist = target - e.x;

  // ground followers
  if (e.ai === "walker" || e.ai === "charger") {
    const speed = e.ai === "charger" ? 3.4 : 1.7;
    // enemies hold a visible gap in front of the hero instead of overlapping
    if (dist > 2.2) e.x += Math.min(speed * dt, dist - 2.2);
    e.feetRow = ctx.groundAt(Math.round(e.x)) - 1;
  } else if (e.ai === "flyer") {
    const speed = 2.0;
    if (dist > 4) e.x += speed * dt;
    e.feetRow = ctx.groundAt(Math.round(e.x)) - 3.5 - Math.sin(ctx.t * 2 + e.anim) * 0.5;
  } else {
    // turret: stationary
    e.feetRow = ctx.groundAt(Math.round(e.x)) - 2;
  }

  // attack
  const sameHeight = Math.abs(e.feetRow - ctx.player.feetRow) <= 5.5;
  if (e.ranged) {
    if (Math.abs(dist) < 16 && e.cd <= 0) {
      e.cd = 2.2;
      const dir = dist >= 0 ? 1 : -1;
      // fire from the caster's own hand/torso, angled so it converges on the hero
      const originY = e.feetRow - Math.max(1, Math.floor(e.size[1] / 2));
      const targetY = ctx.player.feetRow - 1.5;
      const speed = 7;
      const travel = Math.max(1, Math.abs(dist));
      const vy = ((targetY - originY) / travel) * speed;
      ctx.spawnProj({
        x: e.x + dir * 1.5,
        y: originY,
        vx: dir * speed,
        vy,
        life: 3,
        dmg: e.atk,
        color: e.color,
        fromPlayer: false,
        symbol: "●",
      });
    }
  } else if (sameHeight && Math.abs(dist) < 5.4 && e.cd <= 0 && !ctx.player.invuln) {
    e.cd = e.ai === "charger" ? 1.6 : 1.2;
    ctx.hurtPlayer(e.atk, e.name);
    ctx.burst(e.x, e.feetRow - 1, "#ff6a4a", 4);
  }
}

// ----------------------------------------------------------
export interface BossAction {
  kind: string;
  timer: number;
  total: number;
  fired: boolean;
  mult: number;
}

export interface Boss {
  kind: "boss";
  x: number;
  feetRow: number;
  homeX: number;
  hp: number;
  maxHp: number;
  ghostHp: number; // lagging value for damage-chip animation
  atk: number;
  def: number;
  xp: number;
  gold: number;
  tokens: number;
  color: string;
  artKey: string;
  defId: string;
  name: string;
  title: string;
  size: [number, number];
  level: number;
  hurtT: number;
  kb: number;
  anim: number;
  action: BossAction | null;
  nextAttack: number;
  phase: number;
  charging: number; // charge velocity
  dead: boolean;
  appeared: number;
  contactT: number;
}

export function makeBoss(spawn: { x: number; bossId: string; regionIdx: number; level: number }, world: World): Boss {
  const d = BOSSES[spawn.bossId];
  const cycle = Math.floor(world.dist(spawn.x) / world.totalLen);
  const scale = Math.pow(1.7, cycle);
  return {
    kind: "boss",
    x: spawn.x,
    homeX: spawn.x,
    feetRow: world.groundAt(Math.round(spawn.x)) - 1,
    hp: Math.round(d.hp * (1 + spawn.level * 0.05) * scale),
    maxHp: Math.round(d.hp * (1 + spawn.level * 0.05) * scale),
    ghostHp: Math.round(d.hp * (1 + spawn.level * 0.05) * scale),
    atk: Math.round(d.atk * (1 + spawn.level * 0.06) * scale),
    def: Math.round(d.def * (1 + spawn.level * 0.04)),
    xp: Math.round(d.xp * scale),
    gold: Math.round(d.gold * scale),
    tokens: d.tokens + cycle * 4,
    color: d.color,
    artKey: d.artKey,
    defId: spawn.bossId,
    name: d.name,
    title: d.title,
    size: d.size,
    level: spawn.level,
    hurtT: 0,
    kb: 0,
    anim: 0,
    action: null,
    nextAttack: 2.2,
    phase: 0,
    charging: 0,
    dead: false,
    appeared: 0,
    contactT: 0.8,
  };
}

export function bossFrames(b: Boss): string[] {
  const frames = BOSS_ART[b.artKey];
  return frames[Math.floor(b.anim) % frames.length];
}

export function bossPhase(b: Boss): number {
  const pct = b.hp / b.maxHp;
  if (pct < 0.33) return 3;
  if (pct < 0.66) return 2;
  return 1;
}

export function updateBoss(b: Boss, ctx: CombatCtx, def: { attacks: { kind: string; windup: number; dmgMult: number }[] }) {
  const { dt } = ctx;
  b.appeared += dt;
  b.anim += dt * 2.2;
  if (b.hurtT > 0) b.hurtT -= dt;
  // damage-chip trail catches up to real HP smoothly
  if (b.ghostHp > b.hp) b.ghostHp = Math.max(b.hp, b.ghostHp - (b.ghostHp - b.hp) * dt * 5 - b.maxHp * dt * 0.25);
  b.phase = bossPhase(b);
  const enraged = b.phase >= 3;

  if (b.charging !== 0) {
    b.x += b.charging * dt;
    // charge stops once it reaches (and passes) the hero
    if (b.charging < 0 && b.x < ctx.player.col - 1.5) b.charging = 0;
    b.charging *= 0.9;
    if (Math.abs(b.charging) < 0.4) b.charging = 0;
    b.feetRow = ctx.groundAt(Math.round(b.x)) - 1;
  } else if (b.kb !== 0) {
    b.x += b.kb * dt;
    b.kb *= 0.85;
    if (Math.abs(b.kb) < 0.2) b.kb = 0;
  } else {
    // drift back toward home if pushed
    const dx = b.homeX - b.x;
    if (Math.abs(dx) > 0.3) b.x += Math.sign(dx) * Math.min(1.5 * dt, Math.abs(dx));
    b.feetRow = ctx.groundAt(Math.round(b.x)) - 1;
  }

  // attack scheduling
  if (!b.action) {
    b.nextAttack -= dt * (enraged ? 1.5 : 1);
    if (b.nextAttack <= 0) {
      const atk = ctx.rng.pick(def.attacks);
      b.action = { kind: atk.kind, timer: 0, total: atk.windup, fired: false, mult: atk.dmgMult };
      b.nextAttack = (enraged ? 2.2 : 3.4) + ctx.rng.range(0, 1.5);
    }
  } else {
    const a = b.action;
    a.timer += dt;
    const warn = a.total - a.timer;
    // telegraph text
    if (warn > 0 && warn < a.total) {
      ctx.floatText(b.x, b.feetRow - b.size[1] - 1, a.kind.toUpperCase() + "!", "#ff5d5d");
    }
    if (!a.fired && a.timer >= a.total) {
      a.fired = true;
      fireBossAttack(b, a, ctx);
    }
    if (a.timer >= a.total + 0.4) b.action = null;
  }

  // contact damage: the boss always hurts the hero while looming over them
  b.contactT -= dt;
  if (b.contactT <= 0) {
    if (Math.abs(ctx.player.col - b.x) < 4.5 && Math.abs(ctx.player.feetRow - b.feetRow) < 6) {
      ctx.hurtPlayer(b.atk * 0.85, b.name);
      b.contactT = 1.0;
    } else {
      b.contactT = 0.4;
    }
  }
}

function fireBossAttack(b: Boss, a: BossAction, ctx: CombatCtx) {
  const dmg = b.atk * (defMult(a.kind) || 1);
  ctx.shake(7);
  ctx.burst(b.x, b.feetRow - 3, b.color, 16);
  const dist = ctx.player.col - b.x;
  const playerY = ctx.player.feetRow - 1.5;
  if (a.kind === "slam") {
    // wide slam zone — melee and mid-range heroes are always threatened
    if (Math.abs(dist) < 8 && Math.abs(ctx.player.feetRow - b.feetRow) < 6) ctx.hurtPlayer(dmg, b.name);
    ctx.burst(ctx.player.col, ctx.player.feetRow, "#ff8a4a", 10);
  } else if (a.kind === "charge") {
    b.charging = -10;
    if (Math.abs(dist) < 9) ctx.hurtPlayer(dmg, b.name);
  } else if (a.kind === "wave") {
    // arc projectiles aimed at the hero's torso
    for (let i = -1; i <= 1; i++) {
      ctx.spawnProj({ x: b.x, y: playerY, vx: -7, vy: i * 0.9, life: 4, dmg, color: b.color, fromPlayer: false, symbol: "◆" });
    }
  } else if (a.kind === "rain") {
    // guaranteed strikes on the hero's column plus scattered ones
    for (let i = -1; i <= 1; i++) {
      ctx.spawnProj({ x: ctx.player.col + i, y: 2, vx: 0, vy: 9, life: 3, dmg: dmg * 0.6, color: b.color, fromPlayer: false, symbol: "▼" });
    }
    for (let i = 0; i < 2; i++) {
      const px = ctx.player.col + ctx.rng.range(-7, 7);
      ctx.spawnProj({ x: px, y: 2, vx: 0, vy: 9, life: 3, dmg: dmg * 0.5, color: b.color, fromPlayer: false, symbol: "▼" });
    }
  }
}

function defMult(kind: string): number {
  // matched at call site via def.attacks; fallback
  if (kind === "slam") return 1.3;
  if (kind === "charge") return 1.6;
  if (kind === "wave") return 1.1;
  if (kind === "rain") return 1.2;
  return 1;
}

// ----------------------------------------------------------
export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  dmg: number;
  color: string;
  fromPlayer: boolean;
  symbol: string;
  aoe?: number;
  pierce?: number;
  dead?: boolean;
}

export function updateProjectile(p: Projectile, dt: number) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;
  if (p.life <= 0) p.dead = true;
}

// ----------------------------------------------------------
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  ch: string;
}

export interface DmgNum {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
  size: number;
}

export interface FloatText {
  x: number;
  y: number;
  vy: number;
  life: number;
  text: string;
  color: string;
}

// ----------------------------------------------------------
export interface Pickup {
  kind: "loot" | "chest";
  x: number;
  row: number;
  bob: number;
  payload?: { gold?: number; crystals?: number; mat?: { id: string; n: number }; exp?: number };
  tier?: number;
  opened?: boolean;
  dead?: boolean;
}

export interface Spike {
  x: number;
  w: number;
  row: number;
}

export interface Platform {
  x: number;
  w: number;
  topRow: number;
}

export interface NpcEntity {
  x: number;
  row: number;
  npc: string;
  bob: number;
  talked: boolean;
}
