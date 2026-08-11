// ============================================================
//  Engine: loop, physics, combat, spawning, scene render
// ============================================================
import {
  ACHIEVEMENTS,
  BOSSES,
  CLASSES,
  PLAYER_FRAMES,
  RARITY_COLOR,
  REGIONS,
  SKILLS,
  MID_ART,
} from "./content";
import { Grid } from "./renderer";
import { RNG } from "./rng";
import { combatPower, expForLevel, generateItem, totalStats } from "./profile";
import {
  type Boss,
  type CombatCtx,
  type DmgNum,
  type Enemy,
  type FloatText,
  type NpcEntity,
  type Particle,
  type Pickup,
  type Platform,
  type Projectile,
  type Spike,
  bossFrames,
  bossPhase,
  enemyFrames,
  makeBoss,
  makeEnemy,
  updateBoss,
  updateEnemy,
  updateProjectile,
} from "./entities";
import { METERS_PER_CELL, World } from "./world";
import {
  CELL_H,
  CELL_W,
  COLS,
  PLAYER_COL,
  ROWS,
  type Item,
  type Profile,
  type RunStats,
  type Stats,
  SLOT_ORDER,
} from "./types";

const GRAVITY = 33;
const JUMP_V = 23;
const RUN_BASE = 7.0;
const DASH_TIME = 0.18;

export interface HudSnapshot {
  level: number;
  exp: number;
  expNeed: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  crystals: number;
  combo: number;
  distance: number;
  region: string;
  regionIdx: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  skills: Array<{ id: string; name: string; cd: number; cdMax: number; ready: boolean; key: string; ult: boolean; lvl: number }>;
  potionCd: number;
  dashCd: number;
  auto: boolean;
  cp: number;
}

export interface GameCallbacks {
  onHud?: (s: HudSnapshot) => void;
  onDeath?: (stats: RunStats) => void;
  onTown?: (regionIdx: number, cycle: number) => void;
  onLoot?: (item: Item) => void;
  onLevelUp?: (level: number) => void;
  onBoss?: (name: string) => void;
  onDirty?: () => void;
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
function darken(hex: string, f: number): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return hex;
  const r = Math.round(parseInt(c.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(c.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(c.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
}

interface Damagable {
  hp: number;
  maxHp: number;
  def: number;
  x: number;
  color: string;
  hurtT: number;
  kb: number;
  dead?: boolean;
  feetRow: number;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  grid: Grid;
  world: World;
  profile: Profile;
  cb: GameCallbacks;
  rng = new RNG((Math.random() * 1e9) | 0);

  running = false;
  paused = false;
  dead = false;
  t = 0;
  private raf = 0;
  private last = 0;
  private hudT = 0;

  // player
  stats!: Stats;
  maxHp = 100;
  maxMp = 50;
  hp = 100;
  mp = 50;
  worldCol = 0;
  cameraX = 0;
  height = 0;
  vy = 0;
  onGround = true;
  facing = 1;
  state = "run";
  animT = 0;
  attackTimer = 0;
  castTimer = 0;
  hurtT = 0;
  invuln = 0;
  dashT = 0;
  dashCd = 0;
  potionCd = 0;
  autoCd = 0;
  combo = 0;
  comboTimer = 0;
  jumpQueued = false;
  buffAtk = 1;
  buffCrit = 0;
  buffTimer = 0;
  autoAttackT = 0;
  skillCd: Record<string, number> = {};

  // entities
  enemies: Enemy[] = [];
  boss: Boss | null = null;
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  dmgNums: DmgNum[] = [];
  floats: FloatText[] = [];
  pickups: Pickup[] = [];
  spikes: Spike[] = [];
  platforms: Platform[] = [];
  npcs: NpcEntity[] = [];

  // fx
  shakeAmt = 0;
  flash = 0;

  run: RunStats = { distance: 0, kills: 0, bosses: 0, goldEarned: 0, expEarned: 0, regionIdx: 0, maxCombo: 0 };
  private kbdBound = false;

  constructor(canvas: HTMLCanvasElement, profile: Profile, cb: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.grid = new Grid();
    this.profile = profile;
    this.cb = cb;
    this.world = new World();
    canvas.width = COLS * CELL_W;
    canvas.height = ROWS * CELL_H;
    this.ctx.font = `${CELL_H - 3}px 'Share Tech Mono', ui-monospace, monospace`;
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = "center";
    this.applyProfile(true);
    this.attachKbd();
  }

  // --------------------------------------------------------
  applyProfile(full = false) {
    this.stats = totalStats(this.profile);
    const newMaxHp = Math.max(1, Math.round(this.stats.hp));
    const newMaxMp = Math.max(1, Math.round(this.stats.mp));
    if (full || this.maxHp === 0) {
      this.maxHp = newMaxHp;
      this.maxMp = newMaxMp;
      this.hp = newMaxHp;
      this.mp = newMaxMp;
    } else {
      const ratio = this.hp / this.maxHp;
      this.maxHp = newMaxHp;
      this.maxMp = newMaxMp;
      this.hp = Math.min(newMaxHp, Math.round(newMaxHp * ratio));
      this.mp = Math.min(newMaxMp, this.mp);
    }
  }

  start() {
    this.reset();
    this.running = true;
    this.paused = false;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  reset() {
    this.world = new World();
    this.worldCol = 0;
    this.cameraX = 0;
    this.height = 0;
    this.vy = 0;
    this.onGround = true;
    this.dead = false;
    this.combo = 0;
    this.enemies = [];
    this.boss = null;
    this.projectiles = [];
    this.particles = [];
    this.dmgNums = [];
    this.floats = [];
    this.pickups = [];
    this.spikes = [];
    this.platforms = [];
    this.npcs = [];
    this.shakeAmt = 0;
    this.flash = 0;
    this.skillCd = {};
    this.run = { distance: 0, kills: 0, bosses: 0, goldEarned: 0, expEarned:0, regionIdx: 0, maxCombo: 0 };
    this.applyProfile(true);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.detachKbd();
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.last = performance.now(); }

  // --------------------------------------------------------
  private loop = (ts: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.paused && !this.dead) this.update(dt);
    this.render();
    this.hudT += dt;
    if (this.hudT > 0.1) { this.hudT = 0; this.cb.onHud?.(this.getHud()); }
    this.raf = requestAnimationFrame(this.loop);
  };

  // --------------------------------------------------------
  private get playerFeetRow(): number {
    return this.world.groundAt(Math.round(this.worldCol)) - 1 - this.height;
  }

  private weaponY(): number {
    // matches the hand row drawn in drawPlayer: y0 + 1, where y0 = feetRow - 4
    return this.playerFeetRow - 3;
  }

  private update(dt: number) {
    this.t += dt;
    // timers
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.potionCd > 0) this.potionCd -= dt;
    if (this.buffTimer > 0) { this.buffTimer -= dt; if (this.buffTimer <= 0) { this.buffAtk = 1; this.buffCrit = 0; } }
    if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.combo = 0; }
    if (this.shakeAmt > 0) this.shakeAmt = Math.max(0, this.shakeAmt - dt * 26);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.6);
    for (const k of Object.keys(this.skillCd)) if (this.skillCd[k] > 0) this.skillCd[k] -= dt;
    this.animT += dt;

    // movement
    const mv = this.stats.mvspd;
    let speed = RUN_BASE * mv;
    if (this.dashT > 0) { this.dashT -= dt; speed = RUN_BASE * 2.6; this.invuln = Math.max(this.invuln, 0.05); }

    // combat priority: stop completely in front of the enemy so we can fight 1v1 in proper range!
    const isRanged = ["ranger", "mage", "gunner"].includes(this.profile.classId);
    const stopDistance = isRanged ? 9.0 : 4.0;
    const frontTarget = this.findTarget(stopDistance);
    if (frontTarget && !frontTarget.dead && frontTarget.hp > 0) {
      speed = 0;
    }

    this.worldCol += speed * dt;
    this.cameraX = this.worldCol - PLAYER_COL;

    // Only progress run animation when moving; hold standing pose during combat stops
    if (!this.dead && speed === 0 && this.state === "run" && (frontTarget && !frontTarget.dead && frontTarget.hp > 0)) {
      this.animT = 0;
    } else {
      this.animT += dt;
    }

    // vertical physics
    if (!this.onGround) {
      this.vy -= GRAVITY * dt;
      this.height += this.vy * dt;
    }
    // buffered jump: consumed on the next grounded frame (responsive dodge timing)
    if (this.onGround && this.jumpQueued) {
      this.vy = JUMP_V;
      this.onGround = false;
      this.height = 0.01;
      this.jumpQueued = false;
    }
    const ground = this.world.groundAt(Math.round(this.worldCol));
    // platforms
    let landRow = ground;
    for (const pf of this.platforms) {
      if (this.worldCol >= pf.x && this.worldCol <= pf.x + pf.w && this.vy <= 0) {
        const surface = pf.topRow;
        if (this.height <= ground - surface + 0.6 && this.height >= ground - surface - 1) {
          landRow = surface;
        }
      }
    }
    const overChasm = this.world.isChasm(Math.round(this.worldCol));
    if (overChasm) {
      // no ground beneath: step off the edge and fall into the pit
      if (this.onGround) {
        this.onGround = false;
        this.vy = Math.max(this.vy, 0);
      }
      if (this.height < -1.2) {
        this.fallPit(); // hurt + bounce out
      }
    } else if (this.height <= 0) {
      this.height = 0;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    void landRow;

    // hazards: spikes
    for (const s of this.spikes) {
      if (this.worldCol >= s.x && this.worldCol <= s.x + s.w && this.height < 1 && this.invuln <= 0) {
        this.hurt(this.maxHp * 0.06 + 8, "spikes");
        this.vy = JUMP_V * 0.7;
        this.onGround = false;
      }
    }

    // world generation + spawns
    this.world.generate(this.cameraX + COLS);
    const spawns = this.world.popSpawns(this.cameraX + COLS + 6);
    for (const s of spawns) this.realizeSpawn(s);

    // auto combat
    if (this.profile.autoCombat) this.autoCombat(dt);

    // player auto-attack
    this.autoAttackT -= dt;
    const cls = CLASSES[this.profile.classId];
    const ranged = ["ranger", "mage", "gunner"].includes(this.profile.classId);
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.castTimer > 0) this.castTimer -= dt;
    if (this.autoAttackT <= 0) {
      this.autoAttackT = 0.55 / Math.max(0.4, this.stats.atkspd);
      if (this.findTarget(ranged ? 14 : 6.2)) this.basicAttack();
    }

    // update entities
    const ctx = this.combatCtx(dt);
    for (const e of this.enemies) if (!e.dead) updateEnemy(e, ctx);
    if (this.boss) updateBoss(this.boss, ctx, BOSSES[this.findBossDefId()]);
    for (const p of this.projectiles) {
      updateProjectile(p, dt);
      this.handleProj(p);
    }
    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.life -= dt;
    }
    for (const d of this.dmgNums) { d.y += d.vy * dt; d.vy += 6 * dt; d.life -= dt; }
    for (const f of this.floats) { f.y += f.vy * dt; f.life -= dt; }

    // pickups
    this.collectPickups();
    // npcs
    for (const n of this.npcs) {
      n.bob += dt;
      if (!n.talked && Math.abs(this.worldCol - n.x) < 3) {
        n.talked = true;
        this.npcTalk(n.npc);
      }
    }

    // death cleanup
    for (const e of this.enemies) {
      if (e.dead) { this.onEnemyDie(e); }
    }
    this.enemies = this.enemies.filter((e) => !e.dead && e.x > this.cameraX - 8);
    if (this.boss && this.boss.dead) { this.onBossDie(); }
    this.projectiles = this.projectiles.filter((p) => !p.dead && p.x > this.cameraX - 6 && p.x < this.cameraX + COLS + 10 && p.y < ROWS + 4);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.dmgNums = this.dmgNums.filter((d) => d.life > 0);
    this.floats = this.floats.filter((f) => f.life > 0);
    this.pickups = this.pickups.filter((p) => !p.dead && p.x > this.cameraX - 6);
    this.npcs = this.npcs.filter((n) => n.x > this.cameraX - 6);
    this.spikes = this.spikes.filter((s) => s.x + s.w > this.cameraX - 4);
    this.platforms = this.platforms.filter((p) => p.x + p.w > this.cameraX - 4);

    // run stats
    this.run.distance = Math.floor(this.worldCol * METERS_PER_CELL);
    this.run.regionIdx = this.world.regionAtCol(Math.round(this.worldCol)).regionIdx;
    if (this.combo > this.run.maxCombo) this.run.maxCombo = this.combo;
    if (this.run.distance > this.profile.bestDistance) this.profile.bestDistance = this.run.distance;

    if (this.hp <= 0 && !this.dead) this.die();
    void cls;
  }

  private findBossDefId(): string {
    return this.boss ? (this.boss.defId ?? Object.keys(BOSSES)[0]) : "ashen_behemoth";
  }

  private fallPit() {
    this.hurt(this.maxHp * 0.08, "pit");
    this.headText("PIT!", "#ff8a4a");
    this.vy = JUMP_V * 1.1;
    this.invuln = 0.6;
    this.jumpQueued = false;
    this.shake(6);
  }

  // --------------------------------------------------------
  private combatCtx(dt: number): CombatCtx {
    return {
      dt,
      t: this.t,
      rng: this.rng,
      player: { col: this.worldCol, feetRow: this.playerFeetRow, alive: !this.dead, invuln: this.invuln > 0 || this.dashT > 0 },
      groundAt: (c) => this.world.groundAt(Math.round(c)),
      hurtPlayer: (d, src) => this.hurt(d, src),
      spawnProj: (p) => this.projectiles.push(p),
      burst: (x, y, color, n) => this.burst(x, y, color, n),
      damageNumber: (x, y, val, crit, color) => this.dmgNum(x, y, val, crit, color),
      floatText: (x, y, text, color) => this.floats.push({ x, y, vy: -1.4, life: 1.1, text, color }),
      shake: (a) => this.shake(a),
    };
  }

  // --------------------------------------------------------
  private realizeSpawn(s: World["spawns"][number]) {
    switch (s.kind) {
      case "enemy": {
        const hasActiveEnemy = this.enemies.some((e) => !e.dead && e.hp > 0) || (this.boss && !this.boss.dead && this.boss.hp > 0);
        if (!hasActiveEnemy) {
          this.enemies.push(makeEnemy(s, this.world));
        }
        break;
      }
      case "boss":
        if (!this.boss) {
          this.boss = makeBoss(s, this.world);
          this.flash = 0.6;
          this.shake(10);
          this.cb.onBoss?.(this.boss.name);
          this.floatText(this.boss.x, this.boss.feetRow - this.boss.size[1] - 2, `${this.boss.name} APPEARS!`, this.boss.color);
        }
        break;
      case "loot":
        this.pickups.push({ kind: "loot", x: s.x, row: s.row, bob: Math.random() * 6, payload: s.payload });
        break;
      case "chest":
        this.pickups.push({ kind: "chest", x: s.x, row: s.row, bob: 0, tier: s.tier });
        break;
      case "platform":
        this.platforms.push({ x: s.x, w: s.w, topRow: s.topRow });
        break;
      case "spike":
        this.spikes.push({ x: s.x, w: s.w, row: s.row });
        break;
      case "npc":
        this.npcs.push({ x: s.x, row: s.row, npc: s.npc, bob: 0, talked: false });
        break;
      case "town":
        break;
    }
  }

  // --------------------------------------------------------
  // Combat resolution
  private playerAtkValue(mult: number, isSkill: boolean): { dmg: number; crit: boolean } {
    const skillBonus = isSkill ? 1 + this.stats.skilldmg / 100 : 1;
    let base = this.stats.atk * mult * this.buffAtk * skillBonus * (1 + this.combo * 0.01);
    base *= this.rng.range(0.9, 1.12);
    const critRate = this.stats.crit + this.buffCrit;
    const crit = this.rng.chance(clamp(critRate, 0, 95) / 100);
    if (crit) base *= this.stats.critdmg / 100;
    return { dmg: base, crit };
  }

  private dealDamage(t: Damagable, dmg: number, crit: boolean, color?: string) {
    const reduced = dmg * (1 - clamp(t.def / (t.def + 130), 0, 0.8));
    const final = Math.max(1, Math.round(reduced));
    t.hp -= final;
    if (t.hp <= 0) {
      t.hp = 0;
      t.dead = true;
    }
    t.hurtT = 0.16;
    t.kb = Math.max(t.kb, 1.6);
    this.dmgNum(t.x, t.feetRow - 2, final, crit, color);
    this.burst(t.x, t.feetRow - 1, color ?? "#ffd24b", crit ? 7 : 4);
    this.combo++;
    this.comboTimer = 2.6;
    if (this.combo > this.run.maxCombo) this.run.maxCombo = this.combo;
  }

  private findTarget(range: number): Enemy | Boss | null {
    let best: Enemy | Boss | null = null;
    let bestD = range;
    const pf = this.playerFeetRow;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.x - this.worldCol;
      // High tolerance on overlap and height difference to guarantee hits connect seamlessly
      if (d > -2.2 && d <= bestD && Math.abs(e.feetRow - pf) <= 6.0) {
        best = e;
        bestD = d;
      }
    }
    if (this.boss && !this.boss.dead) {
      const d = this.boss.x - this.worldCol;
      if (d > -3.5 && d <= range + 2 && Math.abs(this.boss.feetRow - pf) <= 8.0) {
        best = this.boss;
      }
    }
    return best;
  }

  // Nearest living enemy ahead of the hero — used for the TARGET HUD panel.
  private displayTarget(): Enemy | null {
    let best: Enemy | null = null;
    let bestD = 26;
    for (const e of this.enemies) {
      if (e.dead || e.hp <= 0) continue;
      const d = e.x - this.worldCol;
      if (d > -3 && d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  private basicAttack() {
    const cls = CLASSES[this.profile.classId];
    const ranged = ["ranger", "mage", "gunner"].includes(this.profile.classId);
    this.attackTimer = 0.16;
    if (ranged) {
      const wpn = this.profile.equipment.weapon;
      const sym = this.profile.classId === "mage" ? "*" : this.profile.classId === "gunner" ? "•" : ">";
      this.projectiles.push({
        x: this.worldCol + 5, y: this.weaponY(), vx: 16, vy: 0, life: 1.4,
        dmg: this.playerAtkValue(1, false).dmg, color: wpn ? RARITY_COLOR[wpn.rarity] : cls.color,
        fromPlayer: true, symbol: sym, pierce: 1,
      });
    } else {
      const tgt = this.findTarget(6.2);
      if (tgt) {
        const v = this.playerAtkValue(1, false);
        this.dealDamage(tgt, v.dmg, v.crit, cls.color);
      }
    }
  }

  useSkill(index: number) {
    const cls = CLASSES[this.profile.classId];
    const id = cls.skills[index];
    if (!id) return;
    const def = SKILLS[id];
    const lvl = this.profile.skills[id] ?? 0;
    if (def.ultimate && lvl <= 0) { this.headText("ULT LOCKED", "#ff6a4a"); return; }
    if (!def.ultimate && index > 0 && lvl <= 0) { this.headText("LEARN SKILL", "#ff6a4a"); return; }
    if ((this.skillCd[id] ?? 0) > 0) return;
    if (this.mp < def.mana) { this.headText("NO MP", "#5fb0ff"); return; }
    this.mp -= def.mana;
    this.skillCd[id] = def.cd;
    this.castTimer = 0.3;
    const lvlMult = 1 + lvl * 0.18;
    const baseMult = def.mult * lvlMult;

    switch (def.kind) {
      case "strike": {
        const tgt = this.findTarget(Math.max(def.range ?? 3, 6.2));
        if (tgt) {
          const v = this.playerAtkValue(baseMult, true);
          if (id === "backstab" && this.rng.chance(0.5)) v.crit = true;
          this.dealDamage(tgt, v.dmg, v.crit, "#ff8a4a");
          this.burst(tgt.x, 0, "#ff8a4a", 8);
        }
        break;
      }
      case "cleave":
      case "aoe": {
        const r = def.radius ?? 4;
        this.aoeBlast(this.worldCol, r, baseMult, def.symbol, def.kind === "aoe");
        break;
      }
      case "projectile": {
        const sym = def.symbol[0] ?? ">";
        const n = id === "multi_shot" ? 3 : 1;
        for (let i = 0; i < n; i++) {
          this.projectiles.push({
            x: this.worldCol + 5, y: this.weaponY(), vx: 17, vy: n > 1 ? (i - 1) * 0.8 : 0,
            life: 1.6, dmg: this.playerAtkValue(baseMult, true).dmg, color: cls.color,
            fromPlayer: true, symbol: sym, pierce: 99, aoe: def.radius,
          });
        }
        break;
      }
      case "dash": {
        this.dashT = DASH_TIME;
        this.invuln = Math.max(this.invuln, 0.3);
        this.aoeBlast(this.worldCol + 4, def.range ?? 6, baseMult, def.symbol, true);
        this.worldCol += 3;
        break;
      }
      case "heal": {
        const heal = Math.round(this.maxHp * 0.35);
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.dmgNum(this.worldCol, this.playerFeetRow - 3, heal, false, "#5fd17a");
        this.headText("+HEAL", "#5fd17a");
        break;
      }
      case "buff": {
        this.buffTimer = id === "blood_rage" ? 8 : 10;
        this.buffAtk = id === "blood_rage" ? 1.7 : 1.35;
        this.buffCrit = id === "blood_rage" ? 20 : 0;
        this.headText(id === "blood_rage" ? "BLOOD RAGE!" : "WAR CRY!", "#ff5d5d");
        this.flash = 0.3;
        break;
      }
      case "ultimate": {
        this.flash = 0.8;
        this.shake(14);
        this.aoeBlast(this.worldCol + 3, def.radius ?? 7, baseMult, def.symbol, true);
        this.headText(def.name.toUpperCase() + "!", "#ffd24b");
        break;
      }
    }
    this.cb.onDirty?.();
  }

  private aoeBlast(cx: number, radius: number, mult: number, symbol: string, big: boolean) {
    const pf = this.playerFeetRow;
    let hit = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - cx) <= radius && Math.abs(e.feetRow - pf) <= radius) {
        const v = this.playerAtkValue(mult, true);
        this.dealDamage(e, v.dmg, v.crit, "#ffd24b");
        hit++;
      }
    }
    if (this.boss && !this.boss.dead && Math.abs(this.boss.x - cx) <= radius + 2) {
      const v = this.playerAtkValue(mult, true);
      this.dealDamage(this.boss, v.dmg, v.crit, "#ffd24b");
      hit++;
    }
    // visual
    for (let i = -radius; i <= radius; i++) {
      this.particles.push({
        x: cx + i, y: pf - Math.abs(i) * 0.3, vx: i * 2, vy: -3, life: 0.5, max: 0.5,
        color: "#ffd24b", ch: symbol[Math.floor(Math.random() * symbol.length)] ?? "*",
      });
    }
    if (big) this.shake(4);
    if (hit === 0) this.combo = Math.max(0, this.combo);
  }

  private handleProj(p: Projectile) {
    if (p.fromPlayer) {
      // hit enemies/boss
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - p.x) < 1.2 && Math.abs(e.feetRow - 1 - p.y) < 2.4) {
          const crit = this.rng.chance(clamp(this.stats.crit, 0, 95) / 100);
          this.dealDamage(e, p.dmg * (crit ? this.stats.critdmg / 100 : 1), crit, p.color);
          if (p.aoe) this.aoeBlast(p.x, p.aoe, 0.0001, "*", false);
          if ((p.pierce ?? 1) > 0) { p.pierce = (p.pierce ?? 1) - 1; }
          else p.dead = true;
          if (!p.dead && !p.aoe) p.dead = true;
          break;
        }
      }
      if (this.boss && !this.boss.dead && !p.dead) {
        if (Math.abs(this.boss.x - p.x) < this.boss.size[0] / 2 && Math.abs(this.boss.feetRow - this.boss.size[1] / 2 - p.y) < this.boss.size[1] / 2) {
          const crit = this.rng.chance(clamp(this.stats.crit, 0, 95) / 100);
          this.dealDamage(this.boss, p.dmg * (crit ? this.stats.critdmg / 100 : 1), crit, p.color);
          if (!p.aoe) p.dead = true;
        }
      }
    } else {
      // enemy projectile hits player
      if (Math.abs(p.x - this.worldCol) < 1.6 && Math.abs(p.y - (this.playerFeetRow - 1.5)) < 2.8 && this.invuln <= 0) {
        this.hurt(p.dmg, "projectile");
        p.dead = true;
      }
    }
  }

  // --------------------------------------------------------
  private hurt(dmg: number, _src: string) {
    if (this.invuln > 0 || this.dashT > 0) return;
    const reduced = dmg * (1 - clamp(this.stats.def / (this.stats.def + 140), 0, 0.75));
    const final = Math.max(1, Math.round(reduced));
    this.hp -= final;
    this.hurtT = 0.25;
    this.invuln = 0.35;
    this.combo = 0;
    this.shake(5);
    this.dmgNum(this.worldCol, this.playerFeetRow - 3, final, false, "#ff5d5d");
    this.flash = Math.min(1, this.flash + 0.25);
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const sp = this.rng.range(2, 7);
      this.particles.push({
        x, y: y + this.rng.range(-1, 1),
        vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, life: 0.5, max: 0.5,
        color, ch: ["*", "+", "·", "x", "#"][Math.floor(this.rng.next() * 5)],
      });
    }
  }
  // Floating damage numbers are intentionally disabled — combat feedback is
  // conveyed through hit flashes, particle bursts, shake and the TARGET HP bar.
  private dmgNum(_x: number, _y: number, _val: number, _crit: boolean, _color?: string) {
    /* no-op */
  }
  private floatText(x: number, y: number, text: string, color: string) {
    this.floats.push({ x, y, vy: -1.2, life: 1.4, text, color });
  }
  // Row one cell above the top of the player's head (art is 4 rows tall).
  private headRow(): number {
    return this.playerFeetRow - 5;
  }
  // All player-centric popups (gold, loot, level-up, skill, potion, etc.)
  // surface just above the hero's head so they never overlap the body.
  private headText(text: string, color: string) {
    this.floatText(this.worldCol, this.headRow(), text, color);
  }
  private shake(a: number) { this.shakeAmt = Math.max(this.shakeAmt, a); }

  // --------------------------------------------------------
  private onEnemyDie(e: Enemy) {
    this.run.kills++;
    this.profile.totalKills++;
    // explode
    this.burst(e.x, e.feetRow - 1, e.color, e.elite ? 16 : 9);
    this.shake(e.elite ? 5 : 2);
    this.headText(`+${e.gold}G`, "#ffd24b");
    this.grantGold(e.gold);
    this.addExp(e.xp);
    // drops
    const dropR = this.rng.next();
    if (e.elite || dropR < 0.12) {
      const it = generateItem(this.rng, this.rng.pick(SLOT_ORDER), Math.max(1, Math.round(this.worldCol / 60)), this.run.regionIdx, e.elite ? "RARE" : undefined);
      this.cb.onLoot?.(it);
      this.headText(`[${it.rarity}] ${it.name}`, RARITY_COLOR[it.rarity]);
    }
    if (this.rng.chance(0.18)) {
      const mats = ["iron", "leather", "crystal_shard", "essence"];
      const id = mats[Math.min(this.run.regionIdx, 3)];
      this.profile.materials[id] = (this.profile.materials[id] ?? 0) + 1;
    }
    this.checkAchievements();
    this.cb.onDirty?.();
  }

  private onBossDie() {
    const b = this.boss!;
    this.run.bosses++;
    this.run.kills++;
    this.profile.totalKills++;
    this.profile.bossRecords[b.name] = (this.profile.bossRecords[b.name] ?? 0) + 1;
    this.profile.regionsCleared = Math.max(this.profile.regionsCleared, this.run.regionIdx + 1);
    this.burst(b.x, b.feetRow - 2, b.color, 40);
    this.flash = 0.9;
    this.shake(16);
    this.grantGold(b.gold);
    this.profile.tokens += b.tokens;
    this.addExp(b.xp);
    this.floatText(b.x, b.feetRow - b.size[1] - 2, "BOSS DEFEATED!", "#ffd24b");
    // guaranteed drop
    const it = generateItem(this.rng, this.rng.pick(SLOT_ORDER), Math.max(1, Math.round(this.worldCol / 50)), this.run.regionIdx, "EPIC");
    this.cb.onLoot?.(it);
    this.checkAchievements();
    this.cb.onDirty?.();
    this.boss = null;
    // offer town
    const info = this.world.regionFor(this.worldCol * METERS_PER_CELL);
    setTimeout(() => this.cb.onTown?.(info.regionIdx, info.cycle), 400);
  }

  private grantGold(g: number) {
    this.profile.gold += g;
    this.run.goldEarned += g;
  }

  private addExp(xp: number) {
    this.profile.exp += xp;
    this.run.expEarned += xp;
    let need = expForLevel(this.profile.level);
    while (this.profile.exp >= need) {
      this.profile.exp -= need;
      this.profile.level++;
      this.profile.statPoints += 3;
      const c = CLASSES[this.profile.classId];
      // auto-allocate growth already in stats; grant bonus allocation to ATK/HP
      this.headText(`LEVEL UP! ${this.profile.level}`, "#5fd17a");
      this.flash = 0.5;
      this.applyProfile();
      const prev = this.hp;
      void c; void prev;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      this.cb.onLevelUp?.(this.profile.level);
      need = expForLevel(this.profile.level);
    }
    this.checkAchievements();
  }

  private collectPickups() {
    const pf = this.playerFeetRow;
    for (const p of this.pickups) {
      if (p.dead) continue;
      p.bob += 0.03;
      if (Math.abs(this.worldCol - p.x) < 1.6 && Math.abs(pf - p.row) < 3.2) {
        if (p.kind === "chest") {
          p.dead = true;
          const it = generateItem(this.rng, this.rng.pick(SLOT_ORDER), Math.max(1, Math.round(this.worldCol / 55)), this.run.regionIdx, this.rng.chance(0.3) ? "EPIC" : "RARE");
          this.cb.onLoot?.(it);
          const g = 50 + this.run.distance;
          this.grantGold(g);
          this.headText(`CHEST! +${g}G`, "#ffd24b");
          this.burst(p.x, 0, "#ffd24b", 14);
        } else if (p.payload) {
          p.dead = true;
          if (p.payload.gold) { this.grantGold(p.payload.gold); this.headText(`+${p.payload.gold}G`, "#ffd24b"); }
          if (p.payload.crystals) { this.profile.crystals += p.payload.crystals; this.headText(`+${p.payload.crystals}◆`, "#b98bff"); }
          if (p.payload.mat) { this.profile.materials[p.payload.mat.id] = (this.profile.materials[p.payload.mat.id] ?? 0) + p.payload.mat.n; }
          if (p.payload.exp) this.addExp(p.payload.exp);
          this.burst(p.x, 0, "#5fd17a", 8);
        }
        this.cb.onDirty?.();
      }
    }
  }

  private npcTalk(npc: string) {
    const msgs: Record<string, string> = {
      merchant: "MERCHANT: Fine wares in the next town!",
      elder: "ELDER: The beasts grow bolder... be ready.",
      wanderer: "WANDERER: Seek the boss at the region's end.",
      blacksmith: "BLACKSMITH: Bring me ore to forge mightier arms.",
    };
    this.headText(msgs[npc] ?? "...", "#bfe0ff");
    // small blessing buff
    this.buffTimer = 6;
    this.buffAtk = Math.max(this.buffAtk, 1.15);
  }

  // --------------------------------------------------------
  private checkAchievements() {
    for (const a of ACHIEVEMENTS) {
      const rec = this.profile.achievements[a.id] ?? { p: 0, c: false };
      const prog = this.achProgress(a.id);
      rec.p = Math.max(rec.p, prog);
      if (!rec.c && rec.p >= a.goal) {
        rec.c = true;
        if (!this.profile.titles.includes(a.rewardTitle)) {
          this.profile.titles.push(a.rewardTitle);
          this.headText(`TITLE: ${a.rewardTitle}`, "#ffd24b");
        }
      }
      this.profile.achievements[a.id] = rec;
    }
  }
  private achProgress(id: string): number {
    switch (id) {
      case "kill_100": case "kill_1000": case "kill_10000": return this.profile.totalKills;
      case "boss_1": case "boss_10": return Object.values(this.profile.bossRecords).reduce((s, v) => s + v, 0);
      case "dist_5000": case "dist_20000": return this.profile.bestDistance;
      case "combo_50": return this.run.maxCombo;
      case "lvl_25": case "lvl_50": return this.profile.level;
    }
    return 0;
  }

  // --------------------------------------------------------
  private autoCombat(dt: number) {
    this.autoCd -= dt;
    // auto-jump over hazards/chasms
    const ahead = Math.round(this.worldCol + 2);
    if (this.onGround && (this.world.isChasm(ahead) || this.spikes.some((s) => s.x <= ahead + 1 && s.x + s.w >= ahead))) {
      this.jump();
    }
    // auto-use a ready skill when enemy near
    if (this.autoCd <= 0) {
      this.autoCd = 0.6;
      const cls = CLASSES[this.profile.classId];
      for (let i = 1; i < cls.skills.length; i++) {
        const id = cls.skills[i];
        if ((this.skillCd[id] ?? 0) <= 0 && this.mp >= (SKILLS[id].mana)) {
          const tgt = this.findTarget(8);
          if (tgt) { this.useSkill(i); break; }
        }
      }
    }
    // auto potion
    if (this.hp < this.maxHp * 0.35 && this.potionCd <= 0) this.potion();
  }

  // --------------------------------------------------------
  // Input actions
  input(action: string) {
    if (this.dead && action !== "revive") return;
    switch (action) {
      case "jump": this.jump(); break;
      case "attack": if (this.attackTimer <= 0) this.basicAttack(); break;
      case "dash": this.dash(); break;
      case "potion": this.potion(); break;
      case "skill0": this.useSkill(0); break;
      case "skill1": this.useSkill(1); break;
      case "skill2": this.useSkill(2); break;
      case "skill3": this.useSkill(3); break;
      case "skill4": this.useSkill(4); break;
      case "toggleAuto": this.profile.autoCombat = !this.profile.autoCombat; this.cb.onDirty?.(); break;
    }
  }

  private jump() {
    // buffered jump: fires the instant the hero is grounded (or continues a bounce)
    this.jumpQueued = true;
  }
  private dash() {
    if (this.dashCd <= 0) { this.dashT = DASH_TIME; this.dashCd = 1.1; this.invuln = Math.max(this.invuln, 0.25); }
  }
  private potion() {
    if (this.potionCd <= 0) {
      this.potionCd = 10;
      const heal = Math.round(this.maxHp * 0.4);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.dmgNum(this.worldCol, this.playerFeetRow - 3, heal, false, "#5fd17a");
      this.headText("POTION", "#5fd17a");
    }
  }

  private die() {
    this.dead = true;
    this.state = "dead";
    this.shake(12);
    this.flash = 0.8;
    this.burst(this.worldCol, 0, "#ff5d5d", 24);
    this.cb.onDirty?.();
    this.cb.onDeath?.(this.run);
  }

  revive() {
    this.dead = false;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.invuln = 2;
    this.combo = 0;
    this.animT = 0; // reset animation timer after revive
    // clear nearby enemies for breathing room
    this.enemies = this.enemies.filter((e) => e.x - this.worldCol > 10);
    this.boss = null;
  }

  endRun() {
    // run resets next start; keep profile
  }

  // --------------------------------------------------------
  private attachKbd() {
    if (this.kbdBound) return;
    this.kbdBound = true;
    window.addEventListener("keydown", this.onKey);
  }
  private detachKbd() {
    window.removeEventListener("keydown", this.onKey);
    this.kbdBound = false;
  }
  private onKey = (e: KeyboardEvent) => {
    if (this.paused || this.dead) return;
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    const map: Record<string, string> = {
      " ": "jump", w: "jump", arrowup: "jump", s: "dash", arrowdown: "dash", shift: "dash",
      j: "attack", k: "skill0", l: "skill1", u: "skill2", i: "skill3", o: "skill4", h: "potion", q: "toggleAuto",
    };
    const action = map[k];
    if (action) { e.preventDefault(); this.input(action); }
  };

  // --------------------------------------------------------
  getHud(): HudSnapshot {
    const cls = CLASSES[this.profile.classId];
    const skills = cls.skills.map((id, i) => {
      const def = SKILLS[id];
      const cd = this.skillCd[id] ?? 0;
      return { id, name: def.name, cd, cdMax: def.cd, ready: cd <= 0, key: ["K", "L", "U", "I", "O"][i] ?? "?", ult: !!def.ultimate, lvl: this.profile.skills[id] ?? 0 };
    });
    return {
      level: this.profile.level, exp: this.profile.exp, expNeed: expForLevel(this.profile.level),
      hp: Math.max(0, Math.round(this.hp)), maxHp: this.maxHp, mp: Math.round(this.mp), maxMp: this.maxMp,
      gold: this.profile.gold, crystals: this.profile.crystals, combo: this.combo, distance: this.run.distance,
      region: REGIONS[this.run.regionIdx]?.name ?? "?", regionIdx: this.run.regionIdx,
      bossActive: !!this.boss, bossName: this.boss?.name ?? "", bossHp: this.boss?.hp ?? 0, bossMaxHp: this.boss?.maxHp ?? 1,
      skills, potionCd: this.potionCd, dashCd: this.dashCd, auto: this.profile.autoCombat, cp: combatPower(this.stats),
    };
  }

  // ========================================================
  //  RENDER
  // ========================================================
  private render() {
    const g = this.grid;
    g.clear();
    const info = this.world.regionAtCol(Math.round(this.worldCol));
    const p = info.region.palette;

    // sky gradient (canvas-level)
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grad.addColorStop(0, p.sky1);
    grad.addColorStop(1, p.sky2);
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawStars(p);
    this.drawFar(p);
    this.drawMid(p);
    this.drawTerrain(p, info.region);
    this.drawPlatforms(p);
    this.drawSpikes();
    this.drawPickups();
    this.drawNpcs();
    this.drawEnemies();
    this.drawBoss();
    this.drawProjectiles();
    this.drawPlayer();
    this.drawParticles();
    this.drawDmgNums();
    this.drawFloats();
    this.drawHud(p);

    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;
    g.flush(this.ctx, sx, sy);

    // flash overlay
    if (this.flash > 0.01) {
      this.ctx.fillStyle = `rgba(255,240,210,${this.flash * 0.4})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    // low-hp vignette
    if (this.hp / this.maxHp < 0.3) {
      this.ctx.fillStyle = `rgba(180,0,0,${(0.3 - this.hp / this.maxHp) * 0.6})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private sx(worldCol: number) { return Math.round(worldCol - this.cameraX); }

  private drawStars(p: { star: string }) {
    for (let y = 1; y < 9; y++) {
      for (let x = 0; x < COLS; x += 2) {
        const wc = Math.floor(this.cameraX * 0.12 + x);
        const h = (wc * 9301 + y * 49297) % 233280;
        if (h % 100 < 7) this.grid.set(x, y, this.t % 2 < 1 ? p.star : "·", darken(p.star, 0.7));
      }
    }
  }

  private drawFar(p: { fog: string; accent: string }) {
    const props = this.world.farProps(this.cameraX);
    const fog = darken(p.fog, 0.6);
    for (const pr of props) {
      if (pr.kind === "mountain") {
        const h = 5 + (pr.row % 3);
        for (let i = 0; i < h; i++) {
          const w = i;
          this.grid.set(pr.sx - w, pr.row + h - i, "/", fog);
          this.grid.set(pr.sx + w, pr.row + h - i, "\\", fog);
        }
        this.grid.set(pr.sx, pr.row + h, "^", fog);
      } else if (pr.kind === "tower") {
        this.grid.text(pr.sx, pr.row, "|+|", fog);
        this.grid.text(pr.sx, pr.row + 1, "|[]|", fog);
        this.grid.text(pr.sx, pr.row + 2, "|[]|", fog);
        this.grid.text(pr.sx, pr.row + 3, "/__\\", fog);
      } else {
        this.grid.text(pr.sx, pr.row, "( . . )", darken(p.fog, 0.5));
      }
    }
  }

  private drawMid(p: { ground: string }) {
    const props = this.world.midProps(this.cameraX);
    for (const pr of props) {
      const art = MID_ART[pr.kind];
      if (art) this.grid.blit(art, pr.sx, pr.row, darken(p.ground, 0.55));
    }
  }

  private drawTerrain(p: { ground: string; ground2: string; fog: string }, region: { groundChar: string; fogChar: string; mid: string }) {
    for (let x = 0; x < COLS; x++) {
      const col = Math.round(this.cameraX + x);
      const surface = this.world.groundAt(col);
      const chasm = this.world.isChasm(col);
      if (chasm) {
        for (let y = surface; y < ROWS; y++) {
          if (y > surface + 1) this.grid.set(x, y, region.fogChar, darken(p.fog, 0.3));
        }
        continue;
      }
      this.grid.set(x, surface, region.groundChar, p.ground);
      this.grid.set(x, surface, region.groundChar, p.ground);
      for (let y = surface + 1; y < ROWS; y++) {
        const ch = y % 2 ? region.groundChar : "▒";
        this.grid.set(x, y, ch, darken(p.ground2, 0.5 + (y - surface) * 0.04));
      }
    }
  }

  private drawPlatforms(p: { accent: string }) {
    for (const pf of this.platforms) {
      const sx = this.sx(pf.x);
      if (sx + pf.w < 0 || sx > COLS) continue;
      for (let i = 0; i < pf.w; i++) {
        this.grid.set(sx + i, pf.topRow, "═", p.accent);
        this.grid.set(sx + i, pf.topRow + 1, "▓", darken(p.accent, 0.4));
      }
    }
  }

  private drawSpikes() {
    for (const s of this.spikes) {
      const sx = this.sx(s.x);
      for (let i = 0; i < s.w; i++) {
        this.grid.set(sx + i, s.row, "^", "#ff7a5a");
        this.grid.set(sx + i, s.row + 1, "|", darken("#ff7a5a", 0.5));
      }
    }
  }

  private drawPickups() {
    for (const pk of this.pickups) {
      const sx = this.sx(pk.x);
      if (sx < -3 || sx > COLS + 3) continue;
      const yo = Math.round(Math.sin(pk.bob) * 0.5);
      if (pk.kind === "chest") {
        this.grid.blit(["+----+", "|[][]|", "|$$$$|", "+----+"], sx - 2, pk.row - 3 + yo, "#ffd24b");
        this.grid.set(sx, pk.row - 4 + yo, "✦", "#ffd24b");
      } else {
        this.grid.blit(["  *  ", " /|\\ ", "< $ >", " \\|/ "], sx - 2, pk.row - 3 + yo, "#5fd17a");
      }
    }
  }

  private drawNpcs() {
    for (const n of this.npcs) {
      const sx = this.sx(n.x);
      if (sx < -3 || sx > COLS + 3) continue;
      const yo = Math.round(Math.sin(n.bob) * 0.3);
      this.grid.blit(["  O  ", " /|\\ ", " / \\ "], sx - 2, n.row - 2 + yo, "#bfe0ff");
      this.grid.text(sx - Math.ceil(n.npc.length / 2), n.row - 4, `[${n.npc.toUpperCase()}]`, "#9fd0ff");
    }
  }

  private drawEnemies() {
    const pf = this.playerFeetRow;
    for (const e of this.enemies) {
      const sx = this.sx(e.x);
      if (sx < -6 || sx > COLS + 6) continue;
      const art = enemyFrames(e);
      const w = art[0].length;
      const h = art.length;
      const x0 = sx - Math.floor(w / 2);
      const y0 = e.feetRow - h;
      const col = e.hurtT > 0 ? "#ffffff" : e.color;
      if (e.elite) {
        for (let i = -1; i <= w; i++) { this.grid.set(x0 + i, y0 - 1, "*", "#ffd24b"); }
        this.grid.text(x0, y0 - 2, "ELITE", "#ffd24b");
      }
      this.grid.blit(art, x0, y0, col);
      if (e.hp < e.maxHp) {
        const bw = Math.max(4, w);
        const pct = e.hp / e.maxHp;
        const gpct = Math.max(pct, e.ghostHp / e.maxHp);
        const brow = y0 - 1 - (e.elite ? 1 : 0);
        for (let i = 0; i < bw; i++) {
          const f = i / bw;
          if (f < pct) this.grid.set(x0 + i, brow, "█", "#ff6a4a");
          else if (f < gpct) this.grid.set(x0 + i, brow, "█", e.hurtT > 0 ? "#ffffff" : "#ffd7c0"); // damage chip
          else this.grid.set(x0 + i, brow, "░", "#553333");
        }
      }
      void pf;
    }
  }

  private drawBoss() {
    const b = this.boss;
    if (!b) return;
    const sx = this.sx(b.x);
    const art = bossFrames(b);
    const w = art[0].length;
    const h = art.length;
    const x0 = sx - Math.floor(w / 2);
    const y0 = b.feetRow - h;
    const enraged = bossPhase(b) >= 3;
    const col = b.hurtT > 0 ? "#ffffff" : enraged ? "#ff5d5d" : b.color;
    this.grid.blit(art, x0, y0, col);
    // boss warning banner handled in HUD
  }

  private drawProjectiles() {
    for (const p of this.projectiles) {
      const sx = this.sx(p.x);
      if (sx < -2 || sx > COLS + 2) continue;
      const trail = p.fromPlayer ? "·" : "·";
      this.grid.set(sx - Math.sign(p.vx), Math.round(p.y), trail, darken(p.color, 0.5));
      this.grid.set(sx, Math.round(p.y), p.symbol, p.color);
    }
  }

  private drawPlayer() {
    const cls = CLASSES[this.profile.classId];
    let state = this.state;
    if (this.dead) state = "dead";
    else if (this.hurtT > 0.05) state = "hurt";
    else if (this.castTimer > 0) state = "cast";
    else if (this.attackTimer > 0) state = "attack";
    else if (!this.onGround) state = this.vy >= 0 ? "fall" : "jump";
    else state = "run";

    const frames = PLAYER_FRAMES[state] ?? PLAYER_FRAMES.idle;
    const fi = state === "run" ? Math.floor(this.animT * 9) % frames.length : this.attackTimer > 0 ? Math.floor((0.16 - this.attackTimer) * 30) % frames.length : 0;
    const art = frames[fi] ?? frames[0];

    const head = cls.headGlyph;
    const body = cls.bodyGlyph;
    const headColor = this.profile.equipment.helmet ? RARITY_COLOR[this.profile.equipment.helmet.rarity] : cls.color;
    const bodyColor = this.profile.equipment.chest ? RARITY_COLOR[this.profile.equipment.chest.rarity] : cls.color;
    const wpn = this.profile.equipment.weapon;
    const wpnColor = wpn ? RARITY_COLOR[wpn.rarity] : cls.color;

    const sx = PLAYER_COL;
    const feetRow = this.playerFeetRow;
    const h = art.length;
    const y0 = feetRow - h;

    const tint: Record<string, string> = { [head]: headColor, [body]: bodyColor };
    this.grid.blitTinted(art, sx - 2, y0, cls.color, tint);

    // weapon overlay — drawn at hand level (the "/B\" row) where it was originally
    if (wpn && !this.dead) {
      const wy = y0 + 1;
      if (state === "attack") this.grid.text(sx + 2, wy, "====>", wpnColor);
      else this.grid.text(sx + 2, wy, cls.weaponGlyph, wpnColor);
    }
    // buff aura
    if (this.buffTimer > 0) {
      this.grid.set(sx - 3, y0, ">", "#ff5d5d");
      this.grid.set(sx + 3, y0, "<", "#ff5d5d");
    }
    // dash trail
    if (this.dashT > 0) this.grid.text(sx - 5, y0 + 1, ">>", darken(cls.color, 0.5));
  }

  private drawParticles() {
    for (const p of this.particles) {
      const sx = this.sx(p.x);
      if (sx < -2 || sx > COLS + 2) continue;
      const a = p.life / p.max;
      this.grid.set(sx, Math.round(p.y), p.ch, a > 0.5 ? p.color : darken(p.color, 0.5));
    }
  }

  private drawDmgNums() {
    for (const d of this.dmgNums) {
      const sx = this.sx(d.x);
      if (sx < -4 || sx > COLS + 4) continue;
      const label = d.text;
      const x = sx - Math.floor(label.length / 2);
      const col = d.life > 0.4 ? d.color : darken(d.color, 0.6);
      this.grid.text(x, Math.round(d.y), label, col);
    }
  }

  private drawFloats() {
    for (const f of this.floats) {
      const sx = this.sx(f.x);
      if (sx < -6 || sx > COLS + 6) continue;
      const x = sx - Math.floor(f.text.length / 2);
      const col = f.life > 0.5 ? f.color : darken(f.color, 0.6);
      this.grid.text(clampX(x), Math.round(f.y), f.text, col);
    }
  }

  private drawHud(p: { accent: string; ground: string }) {
    const g = this.grid;
    const h = this.hp / this.maxHp;
    const m = this.mp / this.maxMp;
    const expPct = this.profile.exp / expForLevel(this.profile.level);
    const cls = CLASSES[this.profile.classId];
    // top panel
    g.box(0, 0, 46, 5, "#7f8c9b", `LV ${this.profile.level} ${this.profile.name}`);
    g.text(2, 1, `${cls.name} · ${this.profile.activeTitle}`, cls.color);
    g.text(2, 2, "HP", "#ff6a4a");
    g.bar(6, 2, 32, h, "#ff6a4a", "#3a1a16");
    g.text(39, 2, `${Math.max(0, Math.round(this.hp))}`, "#ffb0a0");
    g.text(2, 3, "MP", "#49b6ff");
    g.bar(6, 3, 32, m, "#49b6ff", "#16243a");
    g.text(39, 3, `${Math.round(this.mp)}`, "#9fd0ff");
    g.bar(6, 4, 32, expPct, "#9fd17a", "#1c2a18");
    g.text(2, 4, "XP", "#9fd17a");

    // right panel: distance / region / cp
    g.box(58, 0, COLS - 58, 5, "#7f8c9b", "JOURNEY");
    g.text(60, 1, `REGION: ${REGIONS[this.run.regionIdx]?.name ?? "?"}`, p.accent);
    g.text(60, 2, `DIST:   ${this.run.distance.toLocaleString("en-US")}m`, "#cfe0ff");
    g.text(60, 3, `KILLS:  ${this.run.kills}   CP ${combatPower(this.stats)}`, "#cfe0ff");
    g.text(60, 4, `GOLD ${this.profile.gold}  ◆${this.profile.crystals}`, "#ffd24b");

    // target enemy health — color-coded border indicates monster type
    if (!this.boss) {
      const tgt = this.displayTarget();
      if (tgt) {
        const pw = COLS - 58;
        // normal = gray, elite = gold pop, demon/ice/frost types get their own border color
        const borderCol = tgt.elite ? "#ffd24b" : (tgt.color === "#ff6a3a" ? "#d13f2a" : (tgt.color === "#9fe0ff" ? "#5fb0d6" : "#6a7888"));
        g.box(58, 5, pw, 4, borderCol, "TARGET");
        const tname = `${tgt.elite ? "★ " : ""}${tgt.name}`.slice(0, pw - 10);
        g.text(60, 6, tname, tgt.elite ? "#ffd24b" : tgt.color);
        g.text(58 + pw - 7, 6, `Lv${tgt.level}`, "#9fb0c0");
        const bw = pw - 4;
        g.barDamage(60, 7, bw, Math.max(0, tgt.hp / tgt.maxHp), Math.max(0, tgt.ghostHp / tgt.maxHp), tgt.hurtT > 0 ? "#ffffff" : "#ff6a4a", "#ffd7c0", "#3a1a16");
        const hpTxt = `${Math.max(0, Math.round(tgt.hp)).toLocaleString("en-US")}/${tgt.maxHp.toLocaleString("en-US")}`;
        g.text(58 + Math.floor((pw - hpTxt.length) / 2), 8, hpTxt, "#ffb0a0");
      }
    }

    // combo & auto — centered in the top gap between character and JOURNEY panels
    const statusCenter = 52;
    if (this.profile.autoCombat) {
      const autoStr = "[AUTO]";
      g.text(statusCenter - Math.floor(autoStr.length / 2), 1, autoStr, "#5fd17a");
    }
    if (this.combo > 1) {
      const c = this.combo >= 25 ? "#ffd24b" : this.combo >= 10 ? "#ff8a4a" : "#ffffff";
      const comboLabel = "COMBO";
      g.text(statusCenter - Math.floor(comboLabel.length / 2), 2, comboLabel, c);
      const comboStr = `x${this.combo}`;
      g.text(statusCenter - Math.floor(comboStr.length / 2), 3, comboStr, c);
    }

    // boss bar — gold border with health bar perfectly centered inside
    if (this.boss) {
      const b = this.boss;
      const bw = 62;
      const bx = Math.floor((COLS - bw) / 2);
      const by = 7;
      // gold-bordered box, 5 rows tall so name / bar / hp all sit centered inside
      g.box(bx, by - 1, bw, 5, "#ffd24b", `⚠ BOSS · ${b.title}`);
      const nameStr = b.name;
      g.text(bx + Math.floor((bw - nameStr.length) / 2), by, nameStr, b.color);
      // bar centered horizontally inside the box (2-cell padding on each side)
      const barW = bw - 4;
      g.barDamage(bx + 2, by + 1, barW, b.hp / b.maxHp, b.ghostHp / b.maxHp, bossPhase(b) >= 3 ? "#ff5d5d" : "#c0392b", "#ffd24b", "#1a0a05");
      const hpStr = `${Math.max(0, Math.round(b.hp)).toLocaleString("en-US")}/${b.maxHp.toLocaleString("en-US")}`;
      g.text(bx + Math.floor((bw - hpStr.length) / 2), by + 2, hpStr, "#ffd24b");
      if (b.action && !b.action.fired)
        g.text(bx + Math.floor((bw - (`! ${b.action.kind.toUpperCase()} INCOMING !`.length)) / 2), by + 4, `! ${b.action.kind.toUpperCase()} INCOMING !`, "#ff5d5d");
    }

    // skill bar (bottom)
    const skills = cls.skills;
    const slotW = 12;
    const total = skills.length * slotW + 3 * slotW; // skills + jump/dash/potion
    let bx = Math.floor((COLS - total) / 2);
    const by = ROWS - 3;
    const skillKeys = ["K", "L", "U", "I", "O"];
    skills.forEach((id, i) => {
      const def = SKILLS[id];
      const cd = this.skillCd[id] ?? 0;
      const ult = !!def.ultimate;
      const col = ult ? "#ffd24b" : def.kind === "buff" || def.kind === "heal" ? "#5fd17a" : "#9fd0ff";
      g.box(bx, by, slotW, 3, ult ? "#caa040" : "#566270");
      g.text(bx + 1, by, skillKeys[i] ?? "?", col);
      g.text(bx + 1, by + 1, def.name.slice(0, 7), "#dfe8f2");
      if (cd > 0) g.bar(bx + 1, by + 2, slotW - 2, 1 - clamp(cd / def.cd, 0, 1), "#223040", "#0a0f16", "▒", "▓");
      else g.bar(bx + 1, by + 2, slotW - 2, 1, ult ? "#2a2410" : "#1c2a18", "#0a0f16");
      bx += slotW;
    });
    // utility buttons
    const utils: Array<[string, string, number]> = [
      ["SPC", "JUMP", 0],
      ["SFT", "DASH", this.dashCd],
      ["H", "POTION", this.potionCd],
    ];
    for (const [key, name, cd] of utils) {
      g.box(bx, by, slotW, 3, "#566270");
      g.text(bx + 1, by, key, "#cfe0ff");
      g.text(bx + 1, by + 1, name, "#dfe8f2");
      if (cd > 0) g.bar(bx + 1, by + 2, slotW - 2, 1 - clamp(cd / 10, 0, 1), "#223040", "#0a0f16", "▒", "▓");
      else g.bar(bx + 1, by + 2, slotW - 2, 1, "#2a2030", "#0a0f16");
      bx += slotW;
    }
  }
}

function clampX(x: number) { return Math.max(0, Math.min(COLS - 1, x)); }
