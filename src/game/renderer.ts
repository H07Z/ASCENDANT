// ============================================================
//  Renderer: a character-grid buffer flushed to <canvas>
// ============================================================
import { CELL_H, CELL_W, COLS, ROWS } from "./types";

const SPACE = " ";

export class Grid {
  readonly cols = COLS;
  readonly rows = ROWS;
  readonly ch: string[];
  readonly fg: string[];
  readonly bg: (string | null)[];

  constructor() {
    const n = COLS * ROWS;
    this.ch = new Array(n).fill(SPACE);
    this.fg = new Array(n).fill("#ffffff");
    this.bg = new Array(n).fill(null);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS;
  }

  clear() {
    const n = this.ch.length;
    for (let i = 0; i < n; i++) {
      this.ch[i] = SPACE;
      this.bg[i] = null;
    }
  }

  set(x: number, y: number, ch: string, fg = "#ffffff", bg: string | null = null) {
    // Grid cells are integer-indexed; fractional world coords must snap or the
    // computed index falls between slots and the glyph silently disappears.
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    const i = y * COLS + x;
    if (ch && ch !== SPACE) {
      this.ch[i] = ch;
      this.fg[i] = fg;
    }
    if (bg !== null) this.bg[i] = bg;
  }

  setBg(x: number, y: number, bg: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    this.bg[y * COLS + x] = bg;
  }

  text(x: number, y: number, str: string, fg = "#ffffff", bg: string | null = null) {
    for (let i = 0; i < str.length; i++) {
      this.set(x + i, y, str[i], fg, bg);
    }
  }

  rect(x: number, y: number, w: number, h: number, bg: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.setBg(x + i, y + j, bg);
  }

  box(x: number, y: number, w: number, h: number, fg = "#9fb0c0", title?: string) {
    const tlr = "┌";
    const trr = "┐";
    const blr = "└";
    const brr = "┘";
    this.set(x, y, tlr, fg);
    this.set(x + w - 1, y, trr, fg);
    this.set(x, y + h - 1, blr, fg);
    this.set(x + w - 1, y + h - 1, brr, fg);
    for (let i = 1; i < w - 1; i++) {
      this.set(x + i, y, "─", fg);
      this.set(x + i, y + h - 1, "─", fg);
    }
    for (let j = 1; j < h - 1; j++) {
      this.set(x, y + j, "│", fg);
      this.set(x + w - 1, y + j, "│", fg);
    }
    if (title) {
      const label = ` ${title} `;
      this.text(x + 2, y, label, fg);
    }
  }

  bar(x: number, y: number, w: number, pct: number, fg: string, bg: string, fill = "█", empty = "░") {
    const filled = Math.max(0, Math.min(w, Math.round(pct * w)));
    for (let i = 0; i < w; i++) {
      this.set(x + i, y, i < filled ? fill : empty, i < filled ? fg : bg);
    }
  }

  // Health bar with an animated "chip" trail: `ghost` lags behind `pct` and is
  // drawn in `ghostColor` (usually a flashing white/pink) to show recent damage.
  barDamage(
    x: number,
    y: number,
    w: number,
    pct: number,
    ghost: number,
    fg: string,
    ghostColor: string,
    bg: string,
    fill = "█",
    empty = "░"
  ) {
    const filled = Math.max(0, Math.min(w, Math.round(pct * w)));
    const ghostFilled = Math.max(filled, Math.min(w, Math.round(ghost * w)));
    for (let i = 0; i < w; i++) {
      if (i < filled) this.set(x + i, y, fill, fg);
      else if (i < ghostFilled) this.set(x + i, y, fill, ghostColor); // damage chip trail
      else this.set(x + i, y, empty, bg);
    }
  }

  // Draw multiline ASCII art; spaces are transparent.
  blit(art: string[], x: number, y: number, fg: string) {
    x = Math.round(x);
    y = Math.round(y);
    for (let r = 0; r < art.length; r++) {
      const line = art[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch !== SPACE) this.set(x + c, y + r, ch, fg);
      }
    }
  }

  // Blit with per-character tint overrides (map char -> color).
  blitTinted(art: string[], x: number, y: number, base: string, tint: Record<string, string>) {
    x = Math.round(x);
    y = Math.round(y);
    for (let r = 0; r < art.length; r++) {
      const line = art[r];
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch !== SPACE) this.set(x + c, y + r, ch, tint[ch] ?? base);
      }
    }
  }

  flush(ctx: CanvasRenderingContext2D, shakeX = 0, shakeY = 0) {
    ctx.save();
    ctx.translate(shakeX, shakeY);
    // backgrounds
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const b = this.bg[i];
        if (b) {
          ctx.fillStyle = b;
          ctx.fillRect(x * CELL_W, y * CELL_H, CELL_W + 1, CELL_H + 1);
        }
      }
    }
    // characters
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let lastFg = "";
    for (let y = 0; y < ROWS; y++) {
      const py = y * CELL_H + CELL_H / 2;
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const ch = this.ch[i];
        if (ch === SPACE) continue;
        const fg = this.fg[i];
        if (fg !== lastFg) {
          ctx.fillStyle = fg;
          lastFg = fg;
        }
        ctx.fillText(ch, x * CELL_W + CELL_W / 2, py);
      }
    }
    ctx.restore();
  }
}
