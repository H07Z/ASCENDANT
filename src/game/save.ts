// ============================================================
//  Local persistence — multi-slot character roster
// ============================================================
import type { Profile } from "./types";

const LEGACY_KEY = "ascendant_save_v1";
const ROSTER_KEY = "ascendant_roster_v1";

export const MAX_CHARACTERS = 10;

function migrate(obj: Profile): Profile {
  if (!obj.id) obj.id = "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  if (!Array.isArray(obj.pets)) obj.pets = [];
  if (obj.activePet === undefined) obj.activePet = null;
  if (typeof obj.petShards !== "number") obj.petShards = 0;
  if (typeof obj.spiritOrbs !== "number") obj.spiritOrbs = 60;
  if (typeof obj.petPity !== "number") obj.petPity = 0;
  if (typeof obj.petPulls !== "number") obj.petPulls = 0;
  return obj;
}

function readRoster(): Profile[] {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) {
      const list = JSON.parse(raw) as Profile[];
      if (Array.isArray(list)) return list.map(migrate);
    }
    // migrate a legacy single-slot save into the roster
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const p = migrate(JSON.parse(legacy) as Profile);
      localStorage.removeItem(LEGACY_KEY);
      writeRoster([p]);
      return [p];
    }
  } catch {
    /* corrupted storage — treat as empty */
  }
  return [];
}

function writeRoster(list: Profile[]): void {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export function listProfiles(): Profile[] {
  return readRoster();
}

/** Insert or update a profile by id — never clobbers other characters. */
export function saveProfile(p: Profile): void {
  const roster = readRoster();
  const idx = roster.findIndex((x) => x.id === p.id);
  if (idx >= 0) roster[idx] = p;
  else roster.push(p);
  writeRoster(roster);
}

export function loadProfileById(id: string): Profile | null {
  return readRoster().find((p) => p.id === id) ?? null;
}

export function deleteProfile(id: string): void {
  writeRoster(readRoster().filter((p) => p.id !== id));
}

export function canCreateCharacter(): boolean {
  return readRoster().length < MAX_CHARACTERS;
}

// legacy helpers still referenced elsewhere
export function loadProfile(): Profile | null {
  const list = readRoster();
  return list.length ? list[0] : null;
}

export function hasSave(): boolean {
  return readRoster().length > 0;
}

export function clearSave(): void {
  try {
    localStorage.removeItem(ROSTER_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}
