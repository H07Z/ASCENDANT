import { useEffect, useRef, useState } from "react";
import { Game, type HudSnapshot } from "../game/engine";
import { CLASSES, SKILLS } from "../game/content";
import { generateItem } from "../game/profile";
import { RNG } from "../game/rng";
import { saveProfile } from "../game/save";
import { type Item, type Profile, type Slot, SLOT_ORDER, type RunStats } from "../game/types";
import {
  Btn,
  CharacterPanel,
  DeathPanel,
  InventoryPanel,
  PausePanel,
  PetPanel,
  SkillsPanel,
  TownPanel,
  skillCost,
} from "./panels";
import {
  BANNERS,
  PETS,
  PET_MAX_LEVEL,
  PET_UNLOCK_LEVEL,
  type BannerId,
  type PullResult,
  levelUpCost as petLevelUpCost,
  pullOnce,
} from "../game/pets";

type Overlay = "none" | "pause" | "char" | "inv" | "skills" | "town" | "pets";

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
  const [toast, setToast] = useState("");
  const [, bump] = useState(0);
  const deathTown = useRef(false);
  const [pullResults, setPullResults] = useState<PullResult[] | null>(null);
  const [petMsg, setPetMsg] = useState("");

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
        if (lvl === PET_UNLOCK_LEVEL) flash(`❖ COMPANION SYSTEM UNLOCKED! Open [pets] to summon.`);
        else flash(`LEVEL UP! → ${lvl}`);
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

  // ---- pet gacha ----
  const doPull = (bannerId: BannerId, count: number) => {
    if (profile.level < PET_UNLOCK_LEVEL) return;
    const banner = BANNERS[bannerId];
    const cost = count === 10 ? banner.cost10 : banner.cost * count;
    const bal = banner.currency === "gold" ? profile.gold : profile.crystals;
    if (bal < cost) {
      setPetMsg("Not enough resources.");
      return;
    }
    if (banner.currency === "gold") profile.gold -= cost;
    else profile.crystals -= cost;

    const rng = new RNG(Date.now() ^ (profile.totalPulls * 2654435761));
    const out: PullResult[] = [];
    for (let i = 0; i < count; i++) {
      out.push(pullOnce(rng, banner, profile.gachaPity, profile.pets));
      profile.totalPulls++;
    }
    // auto-equip the very first companion obtained
    if (!profile.activePet && profile.pets.length > 0) profile.activePet = profile.pets[0].uid;

    setPullResults(out);
    const best = out.reduce((a, b) => (a && a.def.rarity ? a : b));
    setPetMsg(`Summoned ${count}× — highest: ${best.def.name}`);
    refresh();
  };

  const equipPet = (uid: string | null) => {
    profile.activePet = uid;
    refresh();
    setPetMsg(uid ? `Companion equipped.` : "Companion dismissed.");
  };

  const levelUpPet = (uid: string) => {
    const owned = profile.pets.find((p) => p.uid === uid);
    if (!owned || owned.level >= PET_MAX_LEVEL) return;
    const cost = petLevelUpCost(owned.level);
    if (owned.shards < cost) {
      setPetMsg("Not enough shards.");
      return;
    }
    owned.shards -= cost;
    owned.level++;
    refresh();
    setPetMsg(`${PETS[owned.defId]?.name ?? "Pet"} → Lv ${owned.level}!`);
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
    <div className="safe-area fixed inset-0 flex flex-col gap-1 overflow-hidden p-1 sm:gap-2 sm:p-2">
      {/* rotate-to-landscape prompt (small screens held upright) */}
      <div className="rotate-prompt fixed inset-0 z-[100] flex-col items-center justify-center gap-3 bg-[#05060a] text-center">
        <div className="text-4xl text-amber-300 glow">⟳</div>
        <div className="text-sm tracking-[0.3em] text-amber-300 glow">ROTATE YOUR DEVICE</div>
        <div className="text-[11px] text-slate-500">ASCENDANT is best played in landscape</div>
      </div>

      {/* top toolbar */}
      <div className="flex w-full shrink-0 items-center justify-between gap-2 text-[10px] sm:text-[11px]">
        <div className="flex min-w-0 items-baseline gap-2 truncate">
          <span className="glow shrink-0 text-amber-300">▌ ASCENDANT</span>
          <span className="truncate text-slate-500">
            {profile.name} · {cls.name} · Lv{profile.level}
          </span>
        </div>
        <div className="flex shrink-0 gap-1">
          <Btn color="#7fd0ff" onClick={() => setOverlay("char")}>
            ▤<span className="hidden sm:inline"> char</span>
          </Btn>
          <Btn color="#9fd17a" onClick={() => setOverlay("inv")}>
            ⚷<span className="hidden sm:inline"> bag</span>
          </Btn>
          <Btn color="#b98bff" onClick={() => setOverlay("skills")}>
            ✦<span className="hidden sm:inline"> skills</span>
          </Btn>
          <Btn
            color={profile.level >= PET_UNLOCK_LEVEL ? "#ff6fb0" : "#4a5560"}
            onClick={() => setOverlay("pets")}
          >
            ❖<span className="hidden sm:inline"> pets</span>
          </Btn>
          <Btn color="#ffd24b" onClick={() => setOverlay("pause")}>
            ⏸<span className="hidden sm:inline"> menu</span>
          </Btn>
        </div>
      </div>

      {/* canvas — scales to fill remaining space while keeping aspect ratio */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div
          className="scanlines relative flex max-h-full min-h-0 max-w-full"
          style={{ boxShadow: "0 0 50px #08222c55" }}
        >
          <canvas
            ref={canvasRef}
            className="block border border-cyan-900/40 bg-black"
            style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto" }}
          />
        </div>

        {/* toast */}
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-30 max-w-[90%] -translate-x-1/2 truncate border border-amber-500/40 bg-black/80 px-3 py-1 text-[10px] tracking-wider text-amber-200 glow sm:text-xs">
            {toast}
          </div>
        )}
      </div>

      {/* control bar */}
      <div className="flex w-full shrink-0 items-stretch justify-center gap-1 sm:gap-1.5">
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
      {overlay === "pets" && (
        <PetPanel
          profile={profile}
          onPull={doPull}
          onEquip={equipPet}
          onLevelUp={levelUpPet}
          results={pullResults}
          msg={petMsg}
          onClose={() => {
            setOverlay("none");
            setPullResults(null);
            setPetMsg("");
          }}
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
      // pointerdown fires immediately on touch (no 300ms tap delay)
      onPointerDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="relative min-w-0 flex-1 touch-manipulation select-none overflow-hidden border px-1 py-1 text-center leading-tight transition-colors hover:bg-white/5 active:bg-white/20 sm:px-2 sm:py-2"
      style={{ borderColor: color + (onCd || locked ? "33" : "77"), color: onCd || locked ? "#5a6675" : color }}
    >
      <div className="truncate text-[9px] uppercase tracking-wide sm:text-[10px] sm:tracking-wider">{label}</div>
      <div className="hidden text-[9px] opacity-60 sm:block">[{keyhint}]</div>
      {locked && <div className="text-[8px] text-rose-400 sm:text-[9px]">LOCK</div>}
      {onCd && (
        <>
          <div className="absolute inset-x-0 bottom-0 bg-white/10" style={{ height: `${pct * 100}%` }} />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/80 sm:text-sm">
            {cd.toFixed(1)}
          </div>
        </>
      )}
    </button>
  );
}
