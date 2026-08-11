import { useEffect, useState } from "react";
import { CLASS_LIST, CLASSES, PLAYER_FRAMES, SKILLS } from "./game/content";
import { combatPower, newProfile, totalStats } from "./game/profile";
import { clearSave, hasSave, loadProfile, saveProfile } from "./game/save";
import { type Profile, STAT_LABEL, STAT_ORDER } from "./game/types";
import GameView from "./components/GameView";

type Screen = "menu" | "create" | "play";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    setHasSaved(hasSave());
  }, []);

  const startNew = (p: Profile) => {
    saveProfile(p);
    setProfile(p);
    setScreen("play");
  };
  const continueGame = () => {
    const p = loadProfile();
    if (p) {
      setProfile(p);
      setScreen("play");
    }
  };
  const quitToMenu = () => {
    if (profile) saveProfile(profile);
    setHasSaved(hasSave());
    setScreen("menu");
  };

  if (screen === "play" && profile) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#05060a]">
        <GameView profile={profile} onQuit={quitToMenu} />
      </div>
    );
  }
  if (screen === "create") {
    return <CreateScreen onBack={() => setScreen("menu")} onCreate={startNew} />;
  }
  return (
    <MenuScreen
      hasSaved={hasSaved}
      onNew={() => setScreen("create")}
      onContinue={continueGame}
      onWipe={() => {
        clearSave();
        setHasSaved(false);
      }}
    />
  );
}

// ---------------- MENU ----------------
function MenuScreen({
  hasSaved,
  onNew,
  onContinue,
  onWipe,
}: {
  hasSaved: boolean;
  onNew: () => void;
  onContinue: () => void;
  onWipe: () => void;
}) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05060a] text-cyan-100">
      <Backdrop />
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
        <pre className="mb-1 text-center text-[10px] leading-none text-cyan-400/70 sm:text-sm">
{`   █████╗ ███████╗██████╗ ███╗   ██╗███████╗██╗████████╗
  ██╔══██╗╚══███╔╝██╔══██╗████╗  ██║██╔════╝██║╚══██╔══╝
  ███████║  ███╔╝ ██████╔╝██╔██╗ ██║█████╗  ██║   ██║   
  ██╔══██║ ███╔╝  ██╔══██╗██║╚██╗██║██╔══╝  ██║   ██║   
  ██║  ██║███████╗██║  ██║██║ ╚████║███████╗██║   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝   `}
        </pre>
        <div className="mb-6 text-center text-[11px] tracking-[0.4em] text-amber-300/80 glow">
          ASCII MMORPG · ENDLESS RUNNER · v0.1
        </div>

        <div className="flex w-full max-w-md flex-col gap-2">
          {hasSaved && (
            <BigBtn color="#5fd17a" onClick={onContinue}>
              ▶ continue saga
            </BigBtn>
          )}
          <BigBtn color="#7fd0ff" onClick={onNew}>
            ✦ new ascension
          </BigBtn>
          {hasSaved && (
            <button
              onClick={onWipe}
              className="mt-1 text-[10px] uppercase tracking-widest text-slate-600 hover:text-rose-400"
            >
              ✕ erase saved hero
            </button>
          )}
        </div>

        <div className="mt-8 max-w-lg text-center text-[11px] leading-relaxed text-slate-400">
          An infinite world rendered entirely in <span className="text-cyan-300">letters, symbols &amp; glyphs</span>.
          Run forever through six shifting regions. Slay, loot, level, and fell towering bosses —
          all inside a living terminal.
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
          <span>[SPC] jump</span>
          <span>[J] attack</span>
          <span>[K/L/U/I] skills</span>
          <span>[O] ultimate</span>
          <span>[SFT] dash</span>
          <span>[H] potion</span>
          <span>[ESC] menu</span>
          <span>[Q] auto-combat</span>
        </div>
      </div>
    </div>
  );
}

function Backdrop() {
  // simple animated ASCII starfield via CSS
  return (
    <div className="pointer-events-none absolute inset-0 opacity-40">
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className="absolute crt-flicker"
          style={{
            left: `${(i * 53) % 100}%`,
            top: `${(i * 37) % 100}%`,
            color: i % 3 ? "#2a4a5a" : "#3a5a7a",
            animationDelay: `${(i % 7) * 0.3}s`,
          }}
        >
          {i % 4 === 0 ? "✦" : i % 3 === 0 ? "+" : "·"}
        </span>
      ))}
    </div>
  );
}

function BigBtn({
  children,
  color,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full overflow-hidden border px-6 py-3 text-sm uppercase tracking-[0.25em] transition-all ${
        disabled ? "cursor-not-allowed opacity-40" : "hover:tracking-[0.35em]"
      }`}
      style={{ borderColor: color + (disabled ? "22" : "55"), color, background: color + "0d" }}
    >
      <span className={disabled ? "" : "glow"}>{children}</span>
    </button>
  );
}

// ---------------- CREATE ----------------
function CreateScreen({ onCreate, onBack }: { onCreate: (p: Profile) => void; onBack: () => void }) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState(CLASS_LIST[0].id);

  return (
    <div className="relative h-screen w-screen overflow-y-auto bg-[#05060a] text-cyan-100">
      <Backdrop />
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg tracking-[0.3em] text-amber-300 glow">▌ FORGE YOUR HERO</h1>
          <button onClick={onBack} className="text-xs uppercase tracking-widest text-slate-400 hover:text-white">
            ‹ back
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 border border-white/10 bg-black/40 px-3 py-2">
          <span className="text-xs uppercase tracking-widest text-slate-400">Name</span>
          <input
            value={name}
            maxLength={14}
            onChange={(e) => setName(e.target.value)}
            placeholder="enter a name..."
            className="flex-1 border-b border-cyan-700/40 bg-transparent px-2 py-1 text-sm text-cyan-200 outline-none placeholder:text-slate-600 focus:border-amber-400"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CLASS_LIST.map((c) => (
            <ClassCard key={c.id} def={c} active={classId === c.id} onSelect={() => setClassId(c.id)} />
          ))}
        </div>

        <div className="mt-5 flex flex-col items-center gap-2">
          <BigBtn
            color="#ffd24b"
            disabled={!name.trim()}
            onClick={() => {
              const nm = name.trim();
              if (!nm) return;
              onCreate(newProfile(nm, classId));
            }}
          >
            ▶ begin ascension
          </BigBtn>
          {!name.trim() && (
            <div className="text-[10px] uppercase tracking-widest text-rose-400/80">
              ✕ enter a hero name to continue
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassCard({
  def,
  active,
  onSelect,
}: {
  def: (typeof CLASS_LIST)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const stats = totalStats(newProfile("x", def.id));
  const art = PLAYER_FRAMES.idle[0];
  return (
    <button
      onClick={onSelect}
      className="border bg-black/40 p-3 text-left transition-all"
      style={{ borderColor: active ? def.color : "#1e2a36", boxShadow: active ? `0 0 22px ${def.color}44` : "none" }}
    >
      <div className="flex items-start gap-3">
        <pre className="leading-none text-[9px]" style={{ color: def.color }}>
          {art.map((l) => l.replace(/H/g, def.headGlyph).replace(/B/g, def.bodyGlyph)).join("\n")}
        </pre>
        <div className="flex-1">
          <div className="text-sm glow" style={{ color: def.color }}>
            {def.name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">{def.role}</div>
        </div>
        {active && <span style={{ color: def.color }}>◆</span>}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-400">{def.desc}</p>
      <div className="mt-2 grid grid-cols-2 gap-x-3 text-[10px]">
        <Mini label="HP" v={Math.round(stats.hp)} />
        <Mini label="ATK" v={Math.round(stats.atk)} />
        <Mini label="DEF" v={Math.round(stats.def)} />
        <Mini label="CRIT" v={`${stats.crit.toFixed(0)}%`} />
        <Mini label="CP" v={combatPower(stats).toLocaleString()} />
        <Mini label="MP" v={Math.round(stats.mp)} />
      </div>
      <div className="mt-2 border-t border-white/5 pt-1 text-[9px] text-slate-500">
        {def.skills.map((id) => SKILLS[id].name).join(" · ")}
      </div>
    </button>
  );
}

function Mini({ label, v }: { label: string; v: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300">{v}</span>
    </div>
  );
}

// touch STAT imports so the linter keeps them in the bundle surface
void STAT_LABEL;
void STAT_ORDER;
void CLASSES;
