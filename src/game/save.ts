// ============================================================
//  Local persistence (localStorage)
// ============================================================
import type { Profile } from "./types";

const KEY = "ascendant_save_v1";

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage may be unavailable; ignore */
  }
}

export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Profile;
    if (!obj || typeof obj.level !== "number") return null;
    // ---- forward-compatible migrations ----
    if (!Array.isArray(obj.pets)) obj.pets = [];
    if (obj.activePet === undefined) obj.activePet = null;
    if (!obj.gachaPity || typeof obj.gachaPity.epic !== "number") obj.gachaPity = { epic: 0, legendary: 0 };
    if (typeof obj.totalPulls !== "number") obj.totalPulls = 0;
    return obj;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
