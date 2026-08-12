import { useEffect, useState } from "react";
import { CLASS_LIST, CLASSES, PLAYER_FRAMES, SKILLS } from "./game/content";
import { combatPower, newProfile, totalStats } from "./game/profile";
import { MAX_CHARACTERS, deleteProfile, listProfiles, saveProfile } from "./game/save";
import { type Profile, STAT_LABEL, STAT_ORDER } from "./game/types";
import { difficultyTier } from "./game/world";
import GameView from "./components/GameView";

type Screen = "menu" | "create" | "play";

export default function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roster, setRoster] = useState<Profile[]>([]);

  const refreshRoster = () => setRoster(listProfiles());

  useEffect(() => {
    refreshRoster();
  }, []);

  const startNew = (p: Profile) => {
    saveProfile(p); // adds a new slot; existing characters untouched
    setProfile(p);
    setScreen("play");
  };
  const playCharacter = (p: Profile) => {
    setProfile(p);
    setScreen("play");
  };
  const quitToMenu = () => {
    if (profile) saveProfile(profile);
    refreshRoster();
    setScreen("menu");
  };
  const removeCharacter = (id: string) => {
    deleteProfile(id);
    refreshRoster();
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
      roster={roster}
      onNew={() => setScreen("create")}
      onPlay={playCharacter}
      onDelete={removeCharacter}
    />
  );
}

// ---------------- MENU / CHARACTER ROSTER ----------------
function MenuScreen({
  roster,
  onNew,
  onPlay,
  onDelete,
}: {
  roster: Profile[];
  onNew: () => void;
  onPlay: (p: Profile) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const full = roster.length >= MAX_CHARACTERS;
  const pending = roster.find((p) => p.id === confirmId) ?? null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05060a] text-cyan-100">
      <Backdrop />
      <div className="term-scroll relative z-10 flex h-full flex-col items-center overflow-y-auto px-4 py-6">
        <pre className="mb-1 text-center text-[9px] leading-none text-cyan-400/70 sm:text-sm">
{`   █████╗ ███████╗██████╗ ███╗   ██╗███████╗██╗████████╗
  ██╔══██╗╚══███╔╝██╔══██╗████╗  ██║██╔════╝██║╚══██╔══╝
  ███████║  ███╔╝ ██████╔╝██╔██╗ ██║█████╗  ██║   ██║   
  ██╔══██║ ███╔╝  ██╔══██╗██║╚██╗██║██╔══╝  ██║   ██║   
  ██║  ██║███████╗██║  ██║██║ ╚████║███████╗██║   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝   ╚═╝   `}
        </pre>
        <div className="mb-4 text-center text-[11px] tracking-[0.4em] text-amber-300/80 glow">
          ASCII MMORPG · ENDLESS RUNNER · v0.1
        </div>

        {/* character roster */}
        <div className="w-full max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>▮ Characters ({roster.length}/{MAX_CHARACTERS})</span>
            {full && <span className="text-rose-400">roster full — delete a hero to create another</span>}
          </div>

          {roster.length === 0 && (
            <div className="mb-3 border border-white/10 bg-black/40 px-4 py-6 text-center text-xs text-slate-500">
              No heroes yet. Forge your first ascendant below.
            </div>
          )}

          <div className="mb-3 flex flex-col gap-1.5">
            {roster.map((p) => {
              const cls = CLASSES[p.classId];
              const tier = difficultyTier(p.bestDistance);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border border-white/10 bg-black/40 px-3 py-2 transition-colors hover:border-cyan-700/50"
                >
                  <span className="text-lg" style={{ color: cls?.color ?? "#fff" }}>
                    {cls?.headGlyph ?? "O"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm glow" style={{ color: cls?.color ?? "#fff" }}>{p.name}</span>
                      <span className="text-[10px] text-slate-500">
                        Lv{p.level} {cls?.name ?? "?"} · "{p.activeTitle}"
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      best {p.bestDistance.toLocaleString()}m
                      <span className="ml-1" style={{ color: tier.color }}>[{tier.name}]</span>
                      <span className="ml-2 text-amber-300/80">{p.gold.toLocaleString()}g</span>
                      <span className="ml-2 text-slate-500">{p.totalKills.toLocaleString()} kills</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onPlay(p)}
                    className="border border-emerald-500/50 px-3 py-1.5 text-[11px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-500/10"
                  >
                    ▶ play
                  </button>
                  <button
                    onClick={() => setConfirmId(p.id)}
                    className="border border-rose-500/30 px-2 py-1.5 text-[11px] text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-300"
                    title="Delete character"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <BigBtn color="#7fd0ff" onClick={onNew} disabled={full}>
            ✦ new ascension {full ? `(max ${MAX_CHARACTERS})` : ""}
          </BigBtn>
        </div>

        <div className="mt-6 max-w-lg text-center text-[11px] leading-relaxed text-slate-400">
          An infinite world rendered entirely in <span className="text-cyan-300">letters, symbols &amp; glyphs</span>.
          Run forever through six shifting regions. Slay, loot, level, and fell towering bosses —
          all inside a living terminal.
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 pb-4 text-[10px] text-slate-500">
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

      {/* delete confirmation */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm border border-rose-700/60 bg-black/95 p-5 text-center" style={{ boxShadow: "0 0 40px #ff000022" }}>
            <div className="text-sm tracking-[0.25em] text-rose-400 glow">⚠ DELETE HERO</div>
            <div className="mt-3 text-xs text-slate-300">
              Are you sure you want to delete
              <span className="mx-1 text-amber-300">{pending.name}</span>
              (Lv{pending.level} {CLASSES[pending.classId]?.name})?
            </div>
            <div className="mt-1 text-[10px] text-rose-400/80">
              This cannot be undone. All progress, gear and pets will be lost.
            </div>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => { onDelete(pending.id); setConfirmId(null); }}
                className="border border-rose-500/60 px-4 py-2 text-xs uppercase tracking-wider text-rose-300 hover:bg-rose-500/10"
              >
                ✕ yes, delete
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="border border-slate-500/40 px-4 py-2 text-xs uppercase tracking-wider text-slate-300 hover:bg-white/5"
              >
                ‹ keep hero
              </button>
            </div>
          </div>
        </div>
      )}
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
