// ============================================================
//  Seeded RNG + value noise (deterministic procedural gen)
// ============================================================

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  private r: () => number;
  constructor(seed: number | string) {
    this.r = mulberry32(typeof seed === "string" ? hashStr(seed) : seed);
  }
  next(): number {
    return this.r();
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.r();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)];
  }
  chance(p: number): boolean {
    return this.r() < p;
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  weighted<T>(items: readonly T[], weights: number[]): T {
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = this.r() * total;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

// Smooth 1D value noise in [0,1].
function hash2(i: number, seed: number): number {
  let h = (Math.imul(i, 374761393) + Math.imul(seed, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h & 0xffffff) / 0xffffff;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function noise1D(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(i, seed);
  const b = hash2(i + 1, seed);
  return a + (b - a) * smooth(f);
}

// Fractal brownian 1D — layered noise for natural terrain.
export function fbm1D(x: number, seed: number, octaves = 3): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise1D(x * freq, seed + o * 1013);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
    octaves; // keep
  }
  return sum / norm;
}
