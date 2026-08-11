import { useState } from "react";
import { ACHIEVEMENTS, CLASSES, PLAYER_FRAMES, RARITY_COLOR, SKILLS } from "../game/content";
import { combatPower, expForLevel, totalStats } from "../game/profile";
import {
  BANNERS,
  PETS,
  PET_LIST,
  PET_MAX_LEVEL,
  PET_UNLOCK_LEVEL,
  PITY_EPIC,
  PITY_LEGENDARY,
  type Banner,
  type BannerId,
  type PullResult,
  levelUpCost as petLevelUpCost,
  petAtkFraction,
  petBonusStats,
} from "../game/pets";
import {
  type Item,
  type Profile,
  type Slot,
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
    <div className="safe-area fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-2 backdrop-blur-sm sm:p-3">
      <div
        className={`relative w-full ${width} flex max-h-[95dvh] flex-col overflow-hidden border bg-[#070b12]/95 shadow-2xl`}
        style={{ borderColor: accent + "55", boxShadow: `0 0 40px ${accent}22` }}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 sm:px-4 sm:py-2"
          style={{ borderColor: accent + "33", background: accent + "0d" }}
        >
          <span className="truncate text-xs tracking-[0.2em] glow sm:text-sm sm:tracking-[0.25em]" style={{ color: accent }}>
            ▌ {title}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 text-[10px] uppercase tracking-wider text-slate-400 hover:text-white sm:text-xs"
            >
              close ✕
            </button>
          )}
        </div>
        <div className="term-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
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

// ---------- Pets / Gacha ----------
export function PetPanel({
  profile,
  onPull,
  onEquip,
  onLevelUp,
  onClose,
  results,
  msg,
}: {
  profile: Profile;
  onPull: (banner: BannerId, count: number) => void;
  onEquip: (uid: string | null) => void;
  onLevelUp: (uid: string) => void;
  onClose: () => void;
  results: PullResult[] | null;
  msg: string;
}) {
  const [tab, setTab] = useState<"summon" | "collection">("summon");
  const locked = profile.level < PET_UNLOCK_LEVEL;

  if (locked) {
    return (
      <Panel title="COMPANIONS — LOCKED" onClose={onClose} accent="#8b6a6a">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <pre className="text-[10px] leading-none text-slate-600">
{`   .--.
  ( ?? )
   '--'`}
          </pre>
          <div className="text-sm tracking-widest text-rose-300">✕ REQUIRES LEVEL {PET_UNLOCK_LEVEL}</div>
          <div className="text-[11px] text-slate-500">
            You are level {profile.level}. Reach level {PET_UNLOCK_LEVEL} to bind your first companion.
          </div>
          <div className="mt-2 h-2 w-64 border border-white/10 bg-black/40">
            <div className="h-full bg-amber-500/60" style={{ width: `${Math.min(100, (profile.level / PET_UNLOCK_LEVEL) * 100)}%` }} />
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="COMPANIONS" onClose={onClose} accent="#b98bff" width="max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center gap-3 border border-white/10 bg-black/40 px-3 py-2 text-xs">
        <span className="text-amber-300">{profile.gold.toLocaleString()} G</span>
        <span className="text-fuchsia-300">{profile.crystals} ◆</span>
        <span className="text-slate-500">| Pulls: {profile.totalPulls}</span>
        <span className="text-slate-500">
          Pity — EPIC in {Math.max(0, PITY_EPIC - profile.gachaPity.epic)} · LEG in{" "}
          {Math.max(0, PITY_LEGENDARY - profile.gachaPity.legendary)}
        </span>
      </div>

      <div className="mb-3 flex gap-2">
        {(["summon", "collection"] as const).map((t) => (
          <Btn key={t} color={tab === t ? "#b98bff" : "#6a7a8a"} onClick={() => setTab(t)}>
            {t === "summon" ? "✦ Summon" : `❖ Collection (${profile.pets.length}/${PET_LIST.length})`}
          </Btn>
        ))}
      </div>

      {msg && <div className="mb-2 border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-1 text-xs text-fuchsia-200">{msg}</div>}

      {tab === "summon" && (
        <div className="space-y-3">
          {results && results.length > 0 && (
            <div className="border border-amber-500/40 bg-black/60 p-3">
              <div className="mb-2 text-[11px] tracking-widest text-amber-300">▮ SUMMON RESULT</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center border bg-black/50 p-2 text-center"
                    style={{ borderColor: rarityColor(r.def.rarity) + "88", boxShadow: `0 0 14px ${rarityColor(r.def.rarity)}33` }}
                  >
                    <pre className="text-[9px] leading-none" style={{ color: r.def.color }}>
                      {r.def.frames[0].join("\n")}
                    </pre>
                    <div className="mt-1 text-[9px] tracking-wider" style={{ color: rarityColor(r.def.rarity) }}>
                      {r.def.rarity}
                    </div>
                    <div className="text-[10px] text-slate-200">{r.def.name}</div>
                    {r.duplicate ? (
                      <div className="text-[9px] text-slate-500">dup · +{r.shards} shard</div>
                    ) : (
                      <div className="text-[9px] text-emerald-400">NEW!</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.values(BANNERS) as Banner[]).map((b) => {
              const bal = b.currency === "gold" ? profile.gold : profile.crystals;
              const sym = b.currency === "gold" ? "g" : "◆";
              return (
                <div key={b.id} className="border bg-black/30 p-3" style={{ borderColor: b.color + "55" }}>
                  <div className="text-sm glow" style={{ color: b.color }}>{b.name}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{b.desc}</div>
                  <div className="mt-2 space-y-0.5 text-[10px] text-slate-500">
                    {RARITY_ORDER.slice().reverse().map((r) => (
                      <div key={r} className="flex justify-between">
                        <span style={{ color: rarityColor(r) }}>{r}</span>
                        <span>{b.rates[r]}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Btn color={b.color} disabled={bal < b.cost} onClick={() => onPull(b.id, 1)}>
                      x1 · {b.cost}{sym}
                    </Btn>
                    <Btn color={b.color} disabled={bal < b.cost10} onClick={() => onPull(b.id, 10)}>
                      x10 · {b.cost10}{sym}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "collection" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-400">Equip a companion to fight beside you.</div>
            {profile.activePet && (
              <Btn color="#8b6a6a" onClick={() => onEquip(null)}>unequip</Btn>
            )}
          </div>
          {profile.pets.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-600">No companions yet. Summon one!</div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {profile.pets.map((owned) => {
              const def = PETS[owned.defId];
              if (!def) return null;
              const active = profile.activePet === owned.uid;
              const cost = petLevelUpCost(owned.level);
              const maxed = owned.level >= PET_MAX_LEVEL;
              const bonus = petBonusStats(def, owned.level);
              return (
                <div
                  key={owned.uid}
                  className="border bg-black/30 p-2"
                  style={{
                    borderColor: active ? rarityColor(def.rarity) : rarityColor(def.rarity) + "44",
                    boxShadow: active ? `0 0 18px ${rarityColor(def.rarity)}33` : "none",
                  }}
                >
                  <div className="flex gap-2">
                    <pre className="text-[9px] leading-none" style={{ color: def.color }}>
                      {def.frames[0].join("\n")}
                    </pre>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs" style={{ color: rarityColor(def.rarity) }}>
                        {def.name} {active && <span className="text-emerald-400">◆</span>}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-500">
                        {def.rarity} · Lv {owned.level}/{PET_MAX_LEVEL}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        DMG {(petAtkFraction(def, owned.level) * 100).toFixed(0)}% ATK · {def.cd}s
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400">
                    {Object.entries(bonus).map(([k, v]) => `${STAT_LABEL[k as keyof typeof STAT_LABEL]}+${v}`).join("  ")}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-slate-500">shards {owned.shards}</span>
                    <div className="flex gap-1">
                      <Btn
                        color="#b98bff"
                        disabled={maxed || owned.shards < cost}
                        onClick={() => onLevelUp(owned.uid)}
                      >
                        {maxed ? "MAX" : `+1 (${cost}◈)`}
                      </Btn>
                      <Btn color={rarityColor(def.rarity)} disabled={active} onClick={() => onEquip(owned.uid)}>
                        {active ? "active" : "equip"}
                      </Btn>
                    </div>
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
    <div className="safe-area fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-red-950/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="my-auto w-full max-w-md border border-red-700/50 bg-black/90 p-4 text-center sm:p-6" style={{ boxShadow: "0 0 60px #ff000022" }}>
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
    <div className="safe-area fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <div className="my-auto w-full max-w-sm border border-cyan-700/50 bg-black/90 p-4 sm:p-6">
        <div className="mb-3 text-center text-base tracking-[0.3em] text-cyan-300 glow sm:mb-4 sm:text-lg">⏸ PAUSED</div>
        <div className="flex flex-col gap-1.5 sm:gap-2">
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
