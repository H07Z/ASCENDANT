import { useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  CLASSES,
  PETS,
  PET_GACHA_RATES,
  PET_LIST,
  PET_MAX_STAR,
  PET_PITY,
  PET_PULL10_COST,
  PET_PULL_COST,
  PLAYER_FRAMES,
  RARITY_COLOR,
  SKILLS,
  petStarMult,
} from "../game/content";
import { type PullResult, combatPower, expForLevel, starUpCost, totalStats } from "../game/profile";
import {
  type Item,
  type Profile,
  type Slot,
  PET_UNLOCK_LEVEL,
  RARITY_ORDER,
  SLOT_LABEL,
  SLOT_ORDER,
  STAT_LABEL,
  STAT_ORDER,
} from "../game/types";

const rarityColor = (r: string) => RARITY_COLOR[r] ?? "#9aa7b8";

// ---------- shared primitives ----------
export function Btn({
  children,
  onClick,
  disabled,
  color = "#9fd0ff",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`term-scroll px-2 py-1 text-xs uppercase tracking-wider border transition-colors ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/5 active:bg-white/10"
      } ${className}`}
      style={{ borderColor: color + "66", color }}
    >
      {children}
    </button>
  );
}

export function Panel({
  title,
  onClose,
  children,
  width = "max-w-3xl",
  accent = "#7fd0ff",
}: {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
  width?: string;
  accent?: string;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div
        className={`relative w-full ${width} max-h-[92vh] overflow-hidden border bg-[#070b12]/95 shadow-2xl`}
        style={{ borderColor: accent + "55", boxShadow: `0 0 40px ${accent}22` }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{ borderColor: accent + "33", background: accent + "0d" }}
        >
          <span className="text-sm tracking-[0.25em] glow" style={{ color: accent }}>
            ▌ {title}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs uppercase tracking-wider text-slate-400 hover:text-white"
            >
              [esc] close ✕
            </button>
          )}
        </div>
        <div className="term-scroll max-h-[80vh] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function StatRow({ label, value, color = "#cfe0f0" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-0.5 text-xs">
      <span className="text-slate-400">{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function heroArt(profile: Profile) {
  const cls = CLASSES[profile.classId];
  const art = PLAYER_FRAMES.idle[0];
  const headColor = profile.equipment.helmet ? rarityColor(profile.equipment.helmet.rarity) : cls.color;
  const bodyColor = profile.equipment.chest ? rarityColor(profile.equipment.chest.rarity) : cls.color;
  return (
    <pre className="leading-none text-[10px]">
      {art.map((line, i) => (
        <div key={i}>
          {line.split("").map((ch, j) => {
            if (ch === cls.headGlyph) return <span key={j} style={{ color: headColor }}>{ch}</span>;
            if (ch === cls.bodyGlyph) return <span key={j} style={{ color: bodyColor }}>{ch}</span>;
            return <span key={j} style={{ color: cls.color }}>{ch}</span>;
          })}
        </div>
      ))}
    </pre>
  );
}

function itemLine(it: Item | null) {
  if (!it) return <span className="text-slate-600">— empty —</span>;
  return (
    <span style={{ color: rarityColor(it.rarity) }} className="glow">
      [{it.rarity[0]}] {it.name} +{it.enhance}
    </span>
  );
}

// ---------- Character ----------
export function CharacterPanel({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const stats = totalStats(profile);
  const cls = CLASSES[profile.classId];
  const need = expForLevel(profile.level);
  return (
    <Panel title="CHARACTER" onClose={onClose} accent="#7fd0ff">
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-2 border border-white/10 bg-black/40 p-3">
          {heroArt(profile)}
          <div className="mt-1 text-center">
            <div className="text-base glow" style={{ color: cls.color }}>
              {profile.name}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400">
              Lv {profile.level} {cls.name}
            </div>
            <div className="text-[10px] text-amber-300">"{profile.activeTitle}"</div>
          </div>
          <div className="mt-2 w-full text-center">
            <div className="text-[10px] text-slate-500">COMBAT POWER</div>
            <div className="text-xl font-bold text-amber-300 glow-strong">{combatPower(stats).toLocaleString()}</div>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs tracking-widest text-slate-400">▮ ATTRIBUTES</div>
          <div className="grid grid-cols-2 gap-x-6">
            {STAT_ORDER.map((k) => (
              <StatRow
                key={k}
                label={STAT_LABEL[k]}
                value={fmtStat(k, stats[k])}
                color={k === "hp" ? "#ff8a6a" : k === "mp" ? "#5fb0ff" : "#cfe0f0"}
              />
            ))}
          </div>
          <div className="mt-3 mb-1 text-xs tracking-widest text-slate-400">▮ EXPERIENCE</div>
          <div className="h-3 w-full border border-white/10 bg-black/40">
            <div
              className="h-full bg-emerald-500/70"
              style={{ width: `${Math.min(100, (profile.exp / need) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">
            {profile.exp.toLocaleString()} / {need.toLocaleString()} XP
          </div>
        </div>
      </div>
    </Panel>
  );
}

function fmtStat(k: string, v: number): string {
  if (k === "crit" || k === "eva" || k === "acc" || k === "critdmg" || k === "skilldmg") return v.toFixed(0) + "%";
  if (k === "atkspd" || k === "mvspd") return v.toFixed(2) + "x";
  return Math.round(v).toLocaleString();
}

// ---------- Inventory / Equipment ----------
export function InventoryPanel({
  profile,
  onEquip,
  onSell,
  onClose,
}: {
  profile: Profile;
  onEquip: (it: Item) => void;
  onSell?: (it: Item) => void;
  onClose: () => void;
}) {
  const stats = totalStats(profile);
  return (
    <Panel title="EQUIPMENT & INVENTORY" onClose={onClose} accent="#9fd17a">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs tracking-widest text-slate-400">▮ EQUIPPED</div>
          <div className="space-y-1">
            {SLOT_ORDER.map((slot) => (
              <div key={slot} className="flex items-center justify-between border border-white/5 bg-black/30 px-2 py-1 text-xs">
                <span className="w-20 text-slate-500">{SLOT_LABEL[slot]}</span>
                {itemLine(profile.equipment[slot])}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-400">
            Derived CP: <span className="text-amber-300">{combatPower(stats).toLocaleString()}</span>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs tracking-widest text-slate-400">▮ BAG ({profile.inventory.length})</div>
          <div className="term-scroll max-h-[46vh] space-y-1 overflow-y-auto pr-1">
            {profile.inventory.length === 0 && (
              <div className="text-xs text-slate-600">Your bag is empty. Defeat enemies to find loot!</div>
            )}
            {profile.inventory.map((it) => (
              <div key={it.uid} className="border border-white/5 bg-black/30 px-2 py-1 text-xs">
                <div className="flex items-center justify-between">
                  <span style={{ color: rarityColor(it.rarity) }} className="glow">
                    {it.name} +{it.enhance}
                  </span>
                  <Btn color={rarityColor(it.rarity)} onClick={() => onEquip(it)}>
                    equip
                  </Btn>
                  <Btn color="#f5a623" onClick={() => { onSell && onSell(it); }}>
                    sell
                  </Btn>
                </div>
                <div className="text-[10px] text-slate-400">
                  {SLOT_LABEL[it.slot]} · iLv{it.ilvl} ·{" "}
                  {Object.entries(it.stats)
                    .map(([k, v]) => `${STAT_LABEL[k as keyof typeof STAT_LABEL]}+${fmtStat(k, v as number)}`)
                    .join("  ")}
                  {it.special ? `  · ${it.special}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ---------- Skills ----------
export function SkillsPanel({
  profile,
  onUpgrade,
  onClose,
}: {
  profile: Profile;
  onUpgrade: (id: string) => void;
  onClose: () => void;
}) {
  const cls = CLASSES[profile.classId];
  return (
    <Panel title="SKILL TREE" onClose={onClose} accent="#b98bff">
      <div className="space-y-2">
        {cls.skills.map((id, i) => {
          const def = SKILLS[id];
          const lvl = profile.skills[id] ?? 0;
          const cost = skillCost(lvl);
          const maxed = lvl >= 10;
          return (
            <div key={id} className="border border-white/10 bg-black/30 p-2">
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ color: def.ultimate ? "#ffd24b" : "#cfe0f0" }} className="text-sm glow">
                    {def.symbol} {def.name}
                  </span>
                  <span className="ml-2 text-[10px] uppercase text-slate-500">
                    {def.ultimate ? "ULTIMATE" : `SKILL ${i}`} · Lv {lvl}
                  </span>
                </div>
                <Btn
                  color="#b98bff"
                  disabled={maxed || profile.gold < cost.gold || profile.crystals < cost.crystal}
                  onClick={() => onUpgrade(id)}
                >
                  {maxed ? "MAX" : `upgrade ${cost.gold}g${cost.crystal ? ` ${cost.crystal}◆` : ""}`}
                </Btn>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{def.desc}</div>
              <div className="text-[10px] text-slate-500">
                MP {def.mana} · CD {def.cd}s · MULT x{(def.mult * (1 + lvl * 0.18)).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function skillCost(level: number): { gold: number; crystal: number } {
  return { gold: 80 + level * 90, crystal: level >= 3 ? Math.floor(level / 2) : 0 };
}

// ---------- Gacha summon animation ----------
const RITUAL_FRAMES = [
  ["    .    ", "   ...   ", "  .....  ", "   ...   ", "    .    "],
  ["    +    ", "  + . +  ", " .. o .. ", "  + . +  ", "    +    "],
  ["  \\  |  / ", "   \\ | /  ", "-- (o) --", "   / | \\  ", "  /  |  \\ "],
  [" \\\\ \\|/ // ", "  \\\\ | //  ", "== ((O)) ==", "  // | \\\\  ", " // /|\\ \\\\ "],
  ["\\\\\\ \\|/ ///", " \\\\\\|///  ", "===(( ✦ ))===", " ///|\\\\\\  ", "/// /|\\ \\\\\\"],
];

const RARITY_FLAIR: Record<string, { rings: string; shout: string }> = {
  COMMON: { rings: "· · ·", shout: "A spirit answers." },
  UNCOMMON: { rings: "+ + +", shout: "A spirit answers!" },
  RARE: { rings: "✧ ✧ ✧", shout: "RARE RESONANCE!" },
  EPIC: { rings: "◆ ◆ ◆", shout: "EPIC SURGE!" },
  LEGENDARY: { rings: "✦ ✦ ✦", shout: "LEGENDARY AWAKENING!" },
  MYTHIC: { rings: "✶ ✶ ✶", shout: "MYTHIC CONVERGENCE!!" },
  ANCIENT: { rings: "☼ ☼ ☼", shout: "★ ANCIENT DESCENT ★" },
};

export function SummonAnimation({
  results,
  onDone,
}: {
  results: PullResult[];
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"charge" | "burst" | "reveal">("charge");
  const [tick, setTick] = useState(0);
  const [shown, setShown] = useState(0);

  // best rarity drives the intensity of the ritual
  const best = results.reduce(
    (a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a),
    results[0]
  );
  const bestIdx = RARITY_ORDER.indexOf(best.rarity);
  const bestColor = rarityColor(best.rarity);
  const flair = RARITY_FLAIR[best.rarity];
  // rarer pulls charge longer for extra tension
  const chargeMs = 900 + bestIdx * 180;

  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 90);
    const t1 = window.setTimeout(() => setPhase("burst"), chargeMs);
    const t2 = window.setTimeout(() => setPhase("reveal"), chargeMs + 420);
    return () => {
      window.clearInterval(iv);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [chargeMs]);

  // stagger the card reveals
  useEffect(() => {
    if (phase !== "reveal") return;
    if (shown >= results.length) return;
    const t = window.setTimeout(() => setShown((s) => s + 1), 110);
    return () => window.clearTimeout(t);
  }, [phase, shown, results.length]);

  const frameIdx = Math.min(
    RITUAL_FRAMES.length - 1,
    Math.floor((tick / (chargeMs / 90)) * RITUAL_FRAMES.length)
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: phase === "burst" ? `${bestColor}22` : "rgba(0,0,0,0.88)" }}
    >
      <div className="w-full max-w-3xl text-center">
        {phase !== "reveal" && (
          <div>
            <pre
              className="mx-auto block w-fit text-[10px] leading-none sm:text-[13px] sm:leading-tight md:text-lg"
              style={{
                color: phase === "burst" ? "#ffffff" : bestColor,
                textShadow: `0 0 ${phase === "burst" ? 30 : 10 + bestIdx * 4}px ${bestColor}`,
                transform: phase === "burst" ? "scale(1.35)" : `scale(${1 + frameIdx * 0.05})`,
                transition: "transform 160ms ease-out",
              }}
            >
              {(phase === "burst" ? RITUAL_FRAMES[RITUAL_FRAMES.length - 1] : RITUAL_FRAMES[frameIdx]).join("\n")}
            </pre>
            <div
              className="mt-4 text-xs tracking-[0.45em]"
              style={{ color: bestColor, opacity: tick % 2 ? 1 : 0.45 }}
            >
              {phase === "burst" ? flair.shout : "SUMMONING"}
            </div>
            <div className="mt-2 text-[11px] tracking-[0.3em] text-slate-600">
              {flair.rings.repeat(1 + bestIdx)}
            </div>
          </div>
        )}

        {phase === "reveal" && (
          <div>
            <div
              className="mb-3 text-sm tracking-[0.35em] glow"
              style={{ color: bestColor }}
            >
              {flair.shout}
            </div>
            <div
              className={`mx-auto flex flex-wrap justify-center gap-2 ${
                results.length === 1 ? "items-center" : "max-w-4xl"
              }`}
            >
              {results.slice(0, shown).map((r, i) => {
                const def = PETS[r.petId];
                const rc = rarityColor(r.rarity);
                const hi = RARITY_ORDER.indexOf(r.rarity) >= 4;
                return (
                  <div
                    key={i}
                    className="flex min-w-[140px] flex-col items-center justify-center border bg-black/70 p-2 text-center"
                    style={{
                      borderColor: rc,
                      boxShadow: hi ? `0 0 22px ${rc}88` : `0 0 8px ${rc}44`,
                      animation: "popIn 260ms ease-out",
                    }}
                  >
                    <pre className="text-[8px] leading-none" style={{ color: def.color }}>
                      {def.art.join("\n")}
                    </pre>
                    <div className="mt-1 text-[10px] glow" style={{ color: rc }}>
                      {def.name}
                    </div>
                    <div className="text-[9px]" style={{ color: rc }}>{r.rarity}</div>
                    <div className="text-[9px] text-slate-500">
                      {r.duplicate ? `DUPE ★${r.star} +${r.shards}✧` : "✦ NEW ✦"}
                    </div>
                  </div>
                );
              })}
            </div>
            {shown >= results.length && (
              <div className="mt-5">
                <Btn color={bestColor} onClick={onDone}>
                  ▶ continue
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Pets / Gacha ----------
export function PetPanel({
  profile,
  results,
  onPull,
  onEquip,
  onStarUp,
  onClose,
  msg,
}: {
  profile: Profile;
  results: PullResult[];
  onPull: (count: number) => void;
  onEquip: (id: string | null) => void;
  onStarUp: (id: string) => void;
  onClose: () => void;
  msg: string;
}) {
  const [tab, setTab] = useState<"summon" | "collection">("summon");
  const locked = profile.level < PET_UNLOCK_LEVEL;

  if (locked) {
    return (
      <Panel title="COMPANION SANCTUM" onClose={onClose} accent="#ff6fb0">
        <div className="py-8 text-center">
          <pre className="mb-3 text-[10px] leading-none text-fuchsia-400/60">
{`   .-"""-.
  /  o o  \\
 |    ^    |
  \\  '-'  /
   '-----'`}
          </pre>
          <div className="text-sm tracking-widest text-rose-300">✕ SANCTUM SEALED</div>
          <div className="mt-2 text-xs text-slate-400">
            Reach <span className="text-amber-300">Level {PET_UNLOCK_LEVEL}</span> to bind your first companion.
          </div>
          <div className="mt-1 text-[11px] text-slate-500">Current level: {profile.level}</div>
          <div className="mx-auto mt-3 h-2 w-56 border border-white/10 bg-black/40">
            <div
              className="h-full bg-fuchsia-500/60"
              style={{ width: `${Math.min(100, (profile.level / PET_UNLOCK_LEVEL) * 100)}%` }}
            />
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="COMPANION SANCTUM" onClose={onClose} accent="#ff6fb0" width="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-3 border border-white/10 bg-black/40 px-3 py-2 text-xs">
        <span className="text-orange-300">{profile.spiritOrbs ?? 0} ❂ spirit orbs</span>
        <span className="text-cyan-300">{profile.petShards} ✧ shards</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-300">Owned: {profile.pets.length}/{PET_LIST.length}</span>
        <span className="text-slate-400">|</span>
        <span className="text-amber-300">Pity {profile.petPity}/{PET_PITY}</span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["summon", "collection"] as const).map((t) => (
          <Btn key={t} color={tab === t ? "#ff6fb0" : "#6a7a8a"} onClick={() => setTab(t)}>
            {t === "summon" ? "✦ Summon" : "❖ Collection"}
          </Btn>
        ))}
      </div>

      {msg && <div className="mb-2 border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-200">{msg}</div>}

      {tab === "summon" && (
        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-fuchsia-500/30 bg-black/30 p-3">
              <div className="text-sm glow text-fuchsia-300">Single Summon</div>
              <div className="mt-1 text-[11px] text-slate-400">Bind one companion from the aether.</div>
              <div className="mt-2">
                <Btn color="#ff6fb0" disabled={(profile.spiritOrbs ?? 0) < PET_PULL_COST} onClick={() => onPull(1)}>
                  summon · {PET_PULL_COST} ❂
                </Btn>
              </div>
            </div>
            <div className="border border-amber-500/40 bg-black/30 p-3">
              <div className="text-sm glow text-amber-300">Ten Summon</div>
              <div className="mt-1 text-[11px] text-slate-400">Discounted ×10 ritual. Better odds overall.</div>
              <div className="mt-2">
                <Btn color="#ffd24b" disabled={(profile.spiritOrbs ?? 0) < PET_PULL10_COST} onClick={() => onPull(10)}>
                  summon ×10 · {PET_PULL10_COST} ❂
                </Btn>
              </div>
            </div>
          </div>

          {/* rates */}
          <div className="mt-3 border border-white/10 bg-black/30 p-2">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">▮ Summon Rates</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              {RARITY_ORDER.map((r) => (
                <span key={r} style={{ color: rarityColor(r) }}>
                  {r} {PET_GACHA_RATES[r]}%
                </span>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              Guaranteed LEGENDARY or better within {PET_PITY} summons. Duplicates raise ★ (max {PET_MAX_STAR}) and grant shards.
            </div>
          </div>

          {/* last results */}
          {results.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-500">▮ Summon Results</div>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
                {results.map((r, i) => {
                  const def = PETS[r.petId];
                  return (
                    <div
                      key={i}
                      className="border bg-black/40 p-2 text-center"
                      style={{ borderColor: rarityColor(r.rarity) + "77" }}
                    >
                      <pre className="text-[8px] leading-none" style={{ color: def.color }}>
                        {def.art.join("\n")}
                      </pre>
                      <div className="mt-1 text-[10px] glow" style={{ color: rarityColor(r.rarity) }}>
                        {def.name}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        {r.duplicate ? `DUPE ★${r.star} +${r.shards}✧` : "NEW!"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "collection" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">Equip a companion to fight beside you.</div>
            {profile.activePet && (
              <Btn color="#8a94a0" onClick={() => onEquip(null)}>
                unequip
              </Btn>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.pets.length === 0 && (
              <div className="text-xs text-slate-600">No companions bound yet. Try a summon!</div>
            )}
            {profile.pets.map((op) => {
              const def = PETS[op.id];
              if (!def) return null;
              const active = profile.activePet === op.id;
              const cost = starUpCost(op.star);
              const mult = petStarMult(op.star);
              return (
                <div
                  key={op.id}
                  className="border bg-black/30 p-2"
                  style={{
                    borderColor: active ? def.color : rarityColor(def.rarity) + "44",
                    boxShadow: active ? `0 0 18px ${def.color}33` : "none",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <pre className="text-[8px] leading-none" style={{ color: def.color }}>
                      {def.art.join("\n")}
                    </pre>
                    <div className="flex-1">
                      <div className="text-xs glow" style={{ color: rarityColor(def.rarity) }}>
                        {def.name}
                      </div>
                      <div className="text-[9px] uppercase tracking-widest text-slate-500">
                        {def.rarity} · {def.element}
                      </div>
                      <div className="text-[10px] text-amber-300">{"★".repeat(op.star)}<span className="text-slate-700">{"★".repeat(PET_MAX_STAR - op.star)}</span></div>
                    </div>
                  </div>
                  <div className="mt-1 text-[10px] text-slate-400">{def.desc}</div>
                  <div className="mt-1 text-[10px] text-slate-300">
                    DMG {(def.atkMult * mult * 100).toFixed(0)}% ATK · CD {def.cd.toFixed(1)}s · RNG {def.range}
                  </div>
                  <div className="text-[10px] text-emerald-300">
                    {Object.entries(def.bonus)
                      .map(([k, v]) => `${STAT_LABEL[k as keyof typeof STAT_LABEL]}+${fmtStat(k, (v as number) * mult)}`)
                      .join("  ")}
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Btn color={active ? "#5fd17a" : def.color} disabled={active} onClick={() => onEquip(op.id)}>
                      {active ? "equipped" : "equip"}
                    </Btn>
                    <Btn
                      color="#7fd0ff"
                      disabled={op.star >= PET_MAX_STAR || profile.petShards < cost}
                      onClick={() => onStarUp(op.id)}
                    >
                      {op.star >= PET_MAX_STAR ? "max ★" : `★ up · ${cost}✧`}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------- Town ----------
export function TownPanel({
  profile,
  regionIdx,
  onEnhance,
  onBuyGear,
  onBuyMats,
  onEquip,
  onUpgrade,
  onLeave,
  onInventory,
  msg,
}: {
  profile: Profile;
  regionIdx: number;
  onEnhance: (slot: Slot) => void;
  onBuyGear: (rarity?: string) => void;
  onBuyMats: () => void;
  onEquip: (it: Item) => void;
  onUpgrade: (id: string) => void;
  onLeave: () => void;
  onInventory: () => void;
  msg: string;
}) {
  const [tab, setTab] = useState<"smith" | "merchant" | "trainer" | "titles">("smith");
  const enhanceCost = (slot: Slot) => {
    const it = profile.equipment[slot];
    if (!it) return 0;
    return 40 + it.enhance * 35 + it.ilvl * 4;
  };
  return (
    <Panel title={`◈ TOWN — SAFE HAVEN (Region ${regionIdx + 1} cleared)`} onClose={onLeave} accent="#ffd24b" width="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-3 border border-white/10 bg-black/40 px-3 py-2 text-xs">
        <span className="text-amber-300">{profile.gold.toLocaleString()} G</span>
        <span className="text-fuchsia-300">{profile.crystals} ◆</span>
        <span className="text-rose-300">{profile.tokens} ✦ tokens</span>
        <span className="text-slate-400">| Mats:</span>
        <span className="text-slate-300">
          {Object.entries(profile.materials)
            .map(([k, v]) => `${k}:${v}`)
            .join("  ")}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["smith", "merchant", "trainer", "titles"] as const).map((t) => (
          <Btn key={t} color={tab === t ? "#ffd24b" : "#6a7a8a"} onClick={() => setTab(t)}>
            {t === "smith" ? "⚒ Blacksmith" : t === "merchant" ? "$ Merchant" : t === "trainer" ? "✦ Trainer" : "❖ Titles"}
          </Btn>
        ))}
        <Btn color="#9fd17a" onClick={onInventory}>
          ⚷ Bag / Equip
        </Btn>
        <div className="ml-auto" />
        <Btn color="#ff8a4a" onClick={onLeave}>
          ▶ Leave Town
        </Btn>
      </div>

      {msg && <div className="mb-2 border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">{msg}</div>}

      {tab === "smith" && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">
            Enhance equipped gear with gold. Higher enhance = stronger stats (perishable risk omitted in v0.1).
          </div>
          {SLOT_ORDER.map((slot) => {
            const it = profile.equipment[slot];
            const cost = enhanceCost(slot);
            return (
              <div key={slot} className="flex items-center justify-between border border-white/5 bg-black/30 px-2 py-1 text-xs">
                <span className="w-24 text-slate-500">{SLOT_LABEL[slot]}</span>
                <span className="flex-1">{itemLine(it)}</span>
                {it ? (
                  <Btn color="#ffd24b" disabled={profile.gold < cost} onClick={() => onEnhance(slot)}>
                    +1 ({cost}g)
                  </Btn>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "merchant" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <MerchantCard title="Mystery Gear" desc="Random equipment, region-tier." cost={200} color="#9fd17a" onBuy={() => onBuyGear()} gold={profile.gold} />
          <MerchantCard title="Rare Cache" desc="Guaranteed RARE+ gear." cost={650} color="#49b6ff" onBuy={() => onBuyGear("RARE")} gold={profile.gold} />
          <MerchantCard title="Epic Relic" desc="Guaranteed EPIC+ gear." cost={1800} color="#b98bff" onBuy={() => onBuyGear("EPIC")} gold={profile.gold} />
          <MerchantCard title="Material Bundle" desc="+5 of each material." cost={300} color="#ffd24b" onBuy={onBuyMats} gold={profile.gold} />
          
          <div className="col-span-1 sm:col-span-2 mt-1 border border-orange-500/30 bg-orange-500/10 p-3">
            <div className="text-sm glow text-orange-400">Sell Items</div>
            <div className="mt-1 text-[11px] text-slate-400">Open your Bag / Equip panel to sell unneeded gear for gold.</div>
            <div className="mt-2">
              <Btn color="#f5a623" onClick={onInventory}>open bag to sell</Btn>
            </div>
          </div>
        </div>
      )}

      {tab === "trainer" && (
        <div className="space-y-1">
          <div className="text-[11px] text-slate-400">Spend gold & crystals to raise skill levels.</div>
          {CLASSES[profile.classId].skills.map((id) => {
            const def = SKILLS[id];
            const lvl = profile.skills[id] ?? 0;
            const c = skillCost(lvl);
            return (
              <div key={id} className="flex items-center justify-between border border-white/5 bg-black/30 px-2 py-1 text-xs">
                <span style={{ color: def.ultimate ? "#ffd24b" : "#cfe0f0" }}>
                  {def.name} <span className="text-slate-500">Lv {lvl}</span>
                </span>
                <Btn color="#b98bff" disabled={lvl >= 10 || profile.gold < c.gold || profile.crystals < c.crystal} onClick={() => onUpgrade(id)}>
                  {lvl >= 10 ? "MAX" : `+1 (${c.gold}g${c.crystal ? ` ${c.crystal}◆` : ""})`}
                </Btn>
              </div>
            );
          })}
        </div>
      )}

      {tab === "titles" && (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs tracking-widest text-slate-400">▮ TITLES</div>
            <div className="flex flex-wrap gap-2">
              {profile.titles.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    profile.activeTitle = t;
                  }}
                  className={`border px-2 py-1 text-xs ${profile.activeTitle === t ? "bg-amber-500/20" : ""}`}
                  style={{ borderColor: profile.activeTitle === t ? "#ffd24b" : "#334155", color: profile.activeTitle === t ? "#ffd24b" : "#94a3b8" }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs tracking-widest text-slate-400">▮ ACHIEVEMENTS</div>
            <div className="grid gap-1 sm:grid-cols-2">
              {ACHIEVEMENTS.map((a) => {
                const rec = profile.achievements[a.id] ?? { p: 0, c: false };
                return (
                  <div key={a.id} className="border border-white/5 bg-black/30 px-2 py-1 text-[11px]">
                    <span style={{ color: rec.c ? "#ffd24b" : "#94a3b8" }}>
                      {rec.c ? "✓" : "○"} {a.name}
                    </span>
                    <div className="text-slate-500">
                      {a.desc} ({Math.min(rec.p, a.goal)}/{a.goal})
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* equip handler kept for nested inventory use */}
      <span className="hidden">{typeof onEquip}</span>
    </Panel>
  );
}

function MerchantCard({
  title,
  desc,
  cost,
  color,
  onBuy,
  gold,
}: {
  title: string;
  desc: string;
  cost: number;
  color: string;
  onBuy: () => void;
  gold: number;
}) {
  return (
    <div className="border bg-black/30 p-3" style={{ borderColor: color + "44" }}>
      <div className="text-sm glow" style={{ color }}>
        {title}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{desc}</div>
      <div className="mt-2">
        <Btn color={color} disabled={gold < cost} onClick={onBuy}>
          buy · {cost}g
        </Btn>
      </div>
    </div>
  );
}

// ---------- Wallet ----------
export function CurrencyPanel({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const currencies = [
    { icon: "$", name: "Gold", value: profile.gold, use: "Gear, enhancement and skill training", color: "#ffd24b" },
    { icon: "◆", name: "Crystals", value: profile.crystals, use: "Skill upgrades and advanced enhancement", color: "#d58cff" },
    { icon: "❂", name: "Spirit Orbs", value: profile.spiritOrbs ?? 0, use: "Pet summoning at the Companion Sanctum", color: "#ffa14b" },
    { icon: "✦", name: "Boss Tokens", value: profile.tokens, use: "Rare boss equipment and future exchanges", color: "#ff7d52" },
    { icon: "✧", name: "Pet Shards", value: profile.petShards ?? 0, use: "Raise companion star levels", color: "#76dfff" },
    { icon: "+", name: "Stat Points", value: profile.statPoints, use: "Permanent character development", color: "#80e39b" },
  ];

  const materials = [
    { id: "iron", icon: "Fe", use: "Weapon and armor enhancement" },
    { id: "leather", icon: "Lt", use: "Light equipment crafting" },
    { id: "crystal_shard", icon: "Cr", use: "Arcane enhancement material" },
    { id: "essence", icon: "Es", use: "High-region equipment crafting" },
  ];

  return (
    <Panel title="WALLET & MATERIALS" onClose={onClose} accent="#ffd24b" width="max-w-2xl">
      <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">Core currencies</div>
      <div className="divide-y divide-white/5 border border-white/10 bg-black/30">
        {currencies.map((c) => (
          <div key={c.name} className="grid grid-cols-[34px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-center text-sm glow" style={{ color: c.color }}>{c.icon}</span>
            <div>
              <div className="text-xs" style={{ color: c.color }}>{c.name}</div>
              <div className="text-[10px] text-slate-500">{c.use}</div>
            </div>
            <span className="text-sm tabular-nums text-slate-100">{c.value.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mb-2 mt-4 text-[10px] uppercase tracking-[0.2em] text-slate-500">Crafting materials</div>
      <div className="divide-y divide-white/5 border border-white/10 bg-black/30">
        {materials.map((m) => (
          <div key={m.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-[10px] text-cyan-300">[{m.icon}]</span>
            <div>
              <div className="text-xs capitalize text-slate-200">{m.id.replace(/_/g, " ")}</div>
              <div className="text-[10px] text-slate-500">{m.use}</div>
            </div>
            <span className="text-sm tabular-nums text-cyan-200">{(profile.materials[m.id] ?? 0).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-slate-400">
        Gold and loot persist after defeat. Crystals are primarily earned from world loot, bosses and long-term progression.
      </div>
    </Panel>
  );
}

// ---------- Guide ----------
export function GuidePanel({ onClose }: { onClose: () => void }) {
  const [section, setSection] = useState<"start" | "combat" | "progress" | "pets">("start");

  const guide: Record<typeof section, Array<{ title: string; lines: string[] }>> = {
    start: [
      { title: "THE RUN", lines: ["The hero travels automatically from left to right.", "Each encounter is resolved 1v1 before the journey continues.", "Jump over spikes and pits; use Dash for temporary invulnerability."] },
      { title: "CONTROLS", lines: ["[SPACE / W] Jump", "[J] Attack   [SHIFT / S] Dash   [H] Potion", "[K L U I] Skills   [O] Ultimate   [Q] Auto-combat"] },
      { title: "YOUR GOAL", lines: ["Defeat enemies, collect loot and gain experience.", "Reach each region boss, defeat it, then visit town.", "There is no final endpoint: regions and difficulty scale forever."] },
    ],
    combat: [
      { title: "BASIC COMBAT", lines: ["Basic attacks trigger automatically when a target enters range.", "Manual skills deal more damage and improve survival.", "The TARGET panel shows enemy rarity, level and animated health."] },
      { title: "SURVIVAL", lines: ["Dash during boss warnings to avoid incoming damage.", "Jumping clears ground hazards but not every boss attack.", "Use a potion below 40% HP; its cooldown is shown on the control bar."] },
      { title: "BOSSES", lines: ["Gold-bordered health bars identify bosses.", "SLAM threatens nearby heroes; WAVE fires projectiles.", "RAIN targets your position; CHARGE closes distance quickly."] },
    ],
    progress: [
      { title: "EQUIPMENT", lines: ["Gear drops in seven rarities from COMMON to ANCIENT.", "Equip stronger items from the Bag panel.", "Use the town Blacksmith to enhance equipped gear with gold."] },
      { title: "SKILLS & STATS", lines: ["Spend Gold and Crystals to level class skills.", "Crystals are for skills only and are never spent on pets.", "Leveling increases class stats and grants stat points."] },
      { title: "CURRENCIES", lines: ["Gold: gear, enhancement and skill training.", "Crystals ◆: class skill upgrades and enhancement.", "Spirit Orbs ❂: pet summoning only.", "Pet Shards ✧: raising companion star levels.", "Boss Tokens ✦: rare boss equipment."] },
      { title: "ECONOMY", lines: ["Open Wallet to inspect every currency and material.", "Sell unwanted gear from the Bag for gold.", "Skill and pet economies are fully separate."] },
    ],
    pets: [
      { title: "UNLOCK", lines: ["The Companion Sanctum unlocks at Level 10.", "A Dust Sprite is granted and equipped automatically.", "Your active pet floats behind you and attacks targets in range."] },
      { title: "SUMMONING", lines: ["Summoning uses Spirit Orbs ❂, not Crystals.", "Single summon costs 30 ❂; ten summons cost 270 ❂.", "Spirit Orbs drop from enemies, chests and bosses.", "A LEGENDARY-or-better pet is guaranteed within 60 pulls."] },
      { title: "STARS & BONUSES", lines: ["Duplicate pets raise star level and grant Pet Shards.", "Use shards to star-up companions directly.", "Higher stars increase pet attack damage and owner stat bonuses."] },
    ],
  };

  return (
    <Panel title="ADVENTURER GUIDE" onClose={onClose} accent="#7fd0ff" width="max-w-3xl">
      <div className="mb-3 flex flex-wrap gap-1">
        {(["start", "combat", "progress", "pets"] as const).map((s) => (
          <Btn key={s} color={section === s ? "#7fd0ff" : "#657282"} onClick={() => setSection(s)}>
            {s}
          </Btn>
        ))}
      </div>
      <div className="divide-y divide-white/5 border border-white/10 bg-black/30">
        {guide[section].map((group) => (
          <div key={group.title} className="p-3">
            <div className="mb-1 text-xs tracking-[0.16em] text-cyan-300">▌ {group.title}</div>
            {group.lines.map((line) => (
              <div key={line} className="py-0.5 text-[11px] leading-relaxed text-slate-400">
                <span className="mr-2 text-cyan-700">&gt;</span>{line}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 text-center text-[10px] tracking-wider text-slate-600">
        Progress is saved automatically in this browser.
      </div>
    </Panel>
  );
}

// ---------- Death ----------
export function DeathPanel({
  run,
  best,
  onRevive,
  onTown,
}: {
  run: { distance: number; kills: number; bosses: number; goldEarned: number; maxCombo: number };
  best: number;
  onRevive: () => void;
  onTown: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-red-700/50 bg-black/90 p-6 text-center" style={{ boxShadow: "0 0 60px #ff000022" }}>
        <pre className="mb-2 text-xs leading-tight text-red-500 glow-strong">
{`   ██████╗ ██╗   ██╗███████╗
  ██╔═══██╗██║   ██║██╔════╝
  ██║   ██║██║   ██║█████╗  
  ██║   ██║╚██╗ ██╔╝██╔══╝  
  ╚██████╔╝ ╚████╔╝ ███████╗
   ╚═════╝   ╚═══╝  ╚══════╝`}
        </pre>
        <div className="mb-4 text-sm tracking-[0.3em] text-red-300">YOU HAVE FALLEN</div>
        <div className="space-y-1 text-xs text-slate-300">
          <Row label="Distance" value={`${run.distance.toLocaleString()}m`} />
          <Row label="Enemies Slain" value={run.kills.toLocaleString()} />
          <Row label="Bosses Felled" value={run.bosses.toLocaleString()} />
          <Row label="Best Combo" value={`x${run.maxCombo}`} />
          <Row label="Gold Earned" value={run.goldEarned.toLocaleString()} />
          <Row label="Best Distance Ever" value={`${best.toLocaleString()}m`} highlight />
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <Btn color="#5fd17a" onClick={onRevive}>
            ↻ revive (continue)
          </Btn>
          <Btn color="#ffd24b" onClick={onTown}>
            ⌂ return to town
          </Btn>
        </div>
        <div className="mt-3 text-[10px] text-slate-500">Permanent progression is always retained.</div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 py-1">
      <span className="text-slate-500">{label}</span>
      <span className={highlight ? "text-amber-300" : ""}>{value}</span>
    </div>
  );
}

// ---------- Pause ----------
export function PausePanel({
  profile,
  onResume,
  onChar,
  onInv,
  onSkills,
  onQuit,
  onToggleAuto,
}: {
  profile: Profile;
  onResume: () => void;
  onChar: () => void;
  onInv: () => void;
  onSkills: () => void;
  onQuit: () => void;
  onToggleAuto: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm border border-cyan-700/50 bg-black/90 p-6">
        <div className="mb-4 text-center text-lg tracking-[0.3em] text-cyan-300 glow">⏸ PAUSED</div>
        <div className="flex flex-col gap-2">
          <Btn color="#7fd0ff" onClick={onResume}>▶ resume</Btn>
          <Btn color="#9fd17a" onClick={onChar}>▤ character</Btn>
          <Btn color="#9fd17a" onClick={onInv}>▤ equipment</Btn>
          <Btn color="#b98bff" onClick={onSkills}>✦ skills</Btn>
          <Btn color={profile.autoCombat ? "#ffd24b" : "#6a7a8a"} onClick={onToggleAuto}>
            {profile.autoCombat ? "⚙ auto-combat: ON" : "⚙ auto-combat: OFF"}
          </Btn>
          <Btn color="#ff6a6a" onClick={onQuit}>✕ abandon run</Btn>
        </div>
      </div>
    </div>
  );
}
