import { useEffect, useRef, useState } from "react";
import { Game, type HudSnapshot } from "../game/engine";
import { CLASSES, PETS, PET_MAX_STAR, PET_PULL10_COST, PET_PULL_COST, SKILLS } from "../game/content";
import { type PullResult, generateItem, pullPetMany, starUpCost } from "../game/profile";
import { RNG } from "../game/rng";
import { saveProfile } from "../game/save";
import { type Item, type Profile, type Slot, RARITY_ORDER, SLOT_ORDER, type RunStats } from "../game/types";

const RARITY_RANK: Record<string, number> = Object.fromEntries(RARITY_ORDER.map((r, i) => [r, i]));
import {
  Btn,
  CharacterPanel,
  CurrencyPanel,
  DeathPanel,
  GuidePanel,
  InventoryPanel,
  PausePanel,
  PetPanel,
  SkillsPanel,
  TownPanel,
  skillCost,
} from "./panels";

type Overlay = "none" | "pause" | "char" | "inv" | "skills" | "town" | "pets" | "wallet" | "guide";

export default function GameView({
  profile,
  onQuit,
}: {
  profile: Profile;
  onQuit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [death, setDeath] = useState<RunStats | null>(null);
  const [townRegion, setTownRegion] = useState(0);
  const [townMsg, setTownMsg] = useState("");
  const [petMsg, setPetMsg] = useState("");
  const [pullResults, setPullResults] = useState<PullResult[]>([]);
  const [toast, setToast] = useState("");
  const [, bump] = useState(0);
  const deathTown = useRef(false);

  const persist = () => saveProfile(profile);
  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2200);
  };

  // create game once
  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current, profile, {
      onHud: (s) => setHud(s),
      onDeath: (r) => {
        persist();
        setDeath(r);
      },
      onTown: (regionIdx) => {
        setTownRegion(regionIdx);
        deathTown.current = false;
        setOverlay("town");
      },
      onLoot: (it: Item) => {
        profile.inventory.push(it);
        persist();
        bump((n) => n + 1);
      },
      onLevelUp: (lvl) => {
        persist();
        flash(`LEVEL UP! → ${lvl}`);
      },
      onBoss: (name) => flash(`⚠ BOSS: ${name}`),
      onDirty: () => persist(),
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pause / resume driven by overlay + death
  useEffect(() => {
    const g = gameRef.current;
    if (!g) return;
    if (overlay !== "none" || death) g.pause();
    else g.resume();
  }, [overlay, death]);

  // escape to toggle pause
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (overlay === "town" || death) return;
        if (overlay === "pause") setOverlay("none");
        else if (overlay === "none") setOverlay("pause");
        else setOverlay("pause");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay, death]);

  const g = () => gameRef.current!;
  const refresh = () => {
    g().applyProfile();
    persist();
    bump((n) => n + 1);
  };

  // profile mutations
  const equip = (it: Item) => {
    const cur = profile.equipment[it.slot];
    profile.equipment[it.slot] = it;
    profile.inventory = profile.inventory.filter((x) => x.uid !== it.uid);
    if (cur) profile.inventory.push(cur);
    refresh();
    flash(`Equipped ${it.name}`);
  };
  const enhance = (slot: Slot) => {
    const it = profile.equipment[slot];
    if (!it) return;
    const cost = 40 + it.enhance * 35 + it.ilvl * 4;
    if (profile.gold < cost) {
      setTownMsg("Not enough gold.");
      return;
    }
    profile.gold -= cost;
    it.enhance += 1;
    refresh();
    setTownMsg(`${it.name} enhanced to +${it.enhance}!`);
  };
  const buyGear = (rarity?: string) => {
    const cost = rarity === "EPIC" ? 1800 : rarity === "RARE" ? 650 : 200;
    if (profile.gold < cost) {
      setTownMsg("Not enough gold.");
      return;
    }
    profile.gold -= cost;
    const rng = new RNG(Date.now() + profile.inventory.length);
    const regionIdx = hud?.regionIdx ?? 0;
    const ilvl = Math.max(1, Math.round((hud?.distance ?? 0) / 55));
    const it = generateItem(rng, SLOT_ORDER[Math.floor(rng.next() * SLOT_ORDER.length)], ilvl, regionIdx, rarity as never);
    profile.inventory.push(it);
    persist();
    bump((n) => n + 1);
    setTownMsg(`Acquired ${it.name}!`);
  };
  const buyMats = () => {
    if (profile.gold < 300) {
      setTownMsg("Not enough gold.");
      return;
    }
    profile.gold -= 300;
    ["iron", "leather", "crystal_shard", "essence"].forEach((m) => {
      profile.materials[m] = (profile.materials[m] ?? 0) + 5;
    });
    persist();
    bump((n) => n + 1);
    setTownMsg("Materials +5 each.");
  };
  const upgradeSkill = (id: string) => {
    const lvl = profile.skills[id] ?? 0;
    if (lvl >= 10) return;
    const c = skillCost(lvl);
    if (profile.gold < c.gold || profile.crystals < c.crystal) {
      setTownMsg("Not enough resources.");
      return;
    }
    profile.gold -= c.gold;
    profile.crystals -= c.crystal;
    profile.skills[id] = lvl + 1;
    refresh();
    setTownMsg(`${SKILLS[id].name} → Lv ${lvl + 1}!`);
  };

  // ---- pet gacha handlers ----
  const doPull = (count: number) => {
    const cost = count === 10 ? PET_PULL10_COST : PET_PULL_COST * count;
    if (profile.crystals < cost) {
      setPetMsg("Not enough crystals.");
      return;
    }
    profile.crystals -= cost;
    const rng = new RNG(Date.now() + profile.petPulls * 7919);
    const res = pullPetMany(profile, rng, count);
    setPullResults(res);
    const best = res.reduce((a, b) => (RARITY_RANK[b.rarity] > RARITY_RANK[a.rarity] ? b : a));
    setPetMsg(`Summoned! Best: ${PETS[best.petId].name} (${best.rarity})`);
    refresh();
  };
  const equipPet = (id: string | null) => {
    profile.activePet = id;
    refresh();
    setPetMsg(id ? `${PETS[id].name} now fights beside you.` : "Companion dismissed.");
  };
  const starUpPet = (id: string) => {
    const op = profile.pets.find((p) => p.id === id);
    if (!op || op.star >= PET_MAX_STAR) return;
    const cost = starUpCost(op.star);
    if (profile.petShards < cost) {
      setPetMsg("Not enough shards.");
      return;
    }
    profile.petShards -= cost;
    op.star += 1;
    refresh();
    setPetMsg(`${PETS[id].name} ascended to ★${op.star}!`);
  };

  const leaveTown = () => {
    if (deathTown.current) {
      deathTown.current = false;
      setOverlay("none");
      g().start();
    } else {
      refresh();
      setOverlay("none");
    }
    setTownMsg("");
  };

  const cls = CLASSES[profile.classId];
  const skillKeys = ["K", "L", "U", "I", "O"];

  const act = (a: string) => g().input(a);

  return (
    <div className="game-shell flex h-full w-full min-h-0 flex-col items-center justify-center gap-1 p-1.5 sm:gap-2 sm:p-2">
      {/* top toolbar */}
      <div className="game-toolbar flex w-full max-w-[1100px] items-center justify-between text-[10px] sm:text-[11px]">
        <div className="flex gap-2">
          <span className="glow text-amber-300">▌ ASCENDANT</span>
          <span className="text-slate-500">
            {profile.name} · {cls.name} · Lv{profile.level}
          </span>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          <Btn color="#7fd0ff" onClick={() => setOverlay("char")}>
            ▤ char
          </Btn>
          <Btn color="#9fd17a" onClick={() => setOverlay("inv")}>
            ⚷ bag
          </Btn>
          <Btn color="#b98bff" onClick={() => setOverlay("skills")}>
            ✦ skills
          </Btn>
          <Btn color="#ff6fb0" onClick={() => setOverlay("pets")}>
            ❖ pets
          </Btn>
          <Btn color="#ffd24b" onClick={() => setOverlay("wallet")}>
            $ wallet
          </Btn>
          <Btn color="#7fd0ff" onClick={() => setOverlay("guide")}>
            ? guide
          </Btn>
          <Btn color="#ffd24b" onClick={() => setOverlay("pause")}>
            ⏸ menu
          </Btn>
        </div>
      </div>

      {/* canvas */}
      <div className="game-stage relative w-full max-w-[1100px] overflow-hidden border border-cyan-900/40 bg-black scanlines aspect-[1040/544]" style={{ boxShadow: "0 0 50px #08222c55" }}>
        <canvas ref={canvasRef} className="block h-full w-full" />

        {/* toast */}
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 border border-amber-500/40 bg-black/80 px-4 py-1 text-xs tracking-wider text-amber-200 glow">
            {toast}
          </div>
        )}
      </div>

      {/* control bar */}
      <div className="game-controls flex w-full max-w-[1100px] flex-wrap items-stretch justify-center gap-1">
        <CtrlBtn label="JUMP" keyhint="SPC" color="#7fd0ff" onClick={() => act("jump")} />
        <CtrlBtn label="ATK" keyhint="J" color="#ff8a4a" onClick={() => act("attack")} />
        <CtrlBtn label="DASH" keyhint="SFT" color="#9fd0ff" cd={hud?.dashCd ?? 0} cdMax={1.1} onClick={() => act("dash")} />
        <CtrlBtn label="POTION" keyhint="H" color="#5fd17a" cd={hud?.potionCd ?? 0} cdMax={10} onClick={() => act("potion")} />
        {hud?.skills.map((s, i) => (
          <CtrlBtn
            key={s.id}
            label={s.name.split(" ")[0]}
            keyhint={skillKeys[i] ?? "?"}
            color={s.ult ? "#ffd24b" : "#b98bff"}
            cd={s.cd}
            cdMax={s.cdMax}
            locked={s.lvl <= 0 && i > 0}
            onClick={() => act(`skill${i}`)}
          />
        ))}
        <CtrlBtn
          label={hud?.auto ? "AUTO✓" : "AUTO"}
          keyhint="Q"
          color={hud?.auto ? "#5fd17a" : "#6a7a8a"}
          onClick={() => act("toggleAuto")}
        />
      </div>

      {/* overlays */}
      {overlay === "pause" && (
        <PausePanel
          profile={profile}
          onResume={() => setOverlay("none")}
          onChar={() => setOverlay("char")}
          onInv={() => setOverlay("inv")}
          onSkills={() => setOverlay("skills")}
          onToggleAuto={() => {
            profile.autoCombat = !profile.autoCombat;
            persist();
            bump((n) => n + 1);
          }}
          onQuit={onQuit}
        />
      )}
      {overlay === "char" && <CharacterPanel profile={profile} onClose={() => setOverlay("none")} />}
      {overlay === "inv" && <InventoryPanel profile={profile} onEquip={equip} onSell={(it) => { profile.inventory = profile.inventory.filter(x => x.uid !== it.uid); profile.gold += Math.round(it.ilvl * 12 * (it.enhance ? 0.7 : 0.4) + 15); persist(); refresh(); flash(`Sold ${it.name}`); }} onClose={() => setOverlay("none")} />}
      {overlay === "skills" && <SkillsPanel profile={profile} onUpgrade={upgradeSkill} onClose={() => setOverlay("none")} />}
      {overlay === "wallet" && <CurrencyPanel profile={profile} onClose={() => setOverlay("none")} />}
      {overlay === "guide" && <GuidePanel onClose={() => setOverlay("none")} />}
      {overlay === "pets" && (
        <PetPanel
          profile={profile}
          results={pullResults}
          onPull={doPull}
          onEquip={equipPet}
          onStarUp={starUpPet}
          onClose={() => { setOverlay("none"); setPetMsg(""); }}
          msg={petMsg}
        />
      )}
      {overlay === "town" && (
        <TownPanel
          profile={profile}
          regionIdx={townRegion}
          onEnhance={enhance}
          onBuyGear={buyGear}
          onBuyMats={buyMats}
          onEquip={equip}
          onUpgrade={upgradeSkill}
          onLeave={leaveTown}
          onInventory={() => setOverlay("inv")}
          msg={townMsg}
        />
      )}
      {death && (
        <DeathPanel
          run={death}
          best={profile.bestDistance}
          onRevive={() => {
            g().revive();
            setDeath(null);
          }}
          onTown={() => {
            deathTown.current = true;
            setDeath(null);
            setTownRegion(hud?.regionIdx ?? 0);
            setOverlay("town");
          }}
        />
      )}
    </div>
  );
}

function CtrlBtn({
  label,
  keyhint,
  color,
  cd = 0,
  cdMax = 1,
  locked,
  onClick,
}: {
  label: string;
  keyhint: string;
  color: string;
  cd?: number;
  cdMax?: number;
  locked?: boolean;
  onClick: () => void;
}) {
  const onCd = cd > 0;
  const pct = onCd ? Math.min(1, cd / cdMax) : 0;
  return (
    <button
      onClick={onClick}
      className="ctrl-btn relative min-w-[56px] flex-1 overflow-hidden border px-1.5 py-1.5 text-center transition-colors hover:bg-white/5 active:bg-white/10 sm:min-w-[64px] sm:px-2 sm:py-2"
      style={{ borderColor: color + (onCd || locked ? "33" : "77"), color: onCd || locked ? "#5a6675" : color }}
    >
      <div className="text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-[9px] opacity-60">[{keyhint}]</div>
      {locked && <div className="text-[9px] text-rose-400">LOCKED</div>}
      {onCd && (
        <>
          <div className="absolute inset-x-0 bottom-0 bg-white/10" style={{ height: `${pct * 100}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/80">
            {cd.toFixed(1)}
          </div>
        </>
      )}
    </button>
  );
}
