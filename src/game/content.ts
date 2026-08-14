// ============================================================
//  Game content: ASCII art, classes, skills, enemies, regions
//  (All original assets — inspired by the genre, not copied.)
// ============================================================
import {
  type Achievement,
  type BossDef,
  type ClassDef,
  type EnemyDef,
  type Palette,
  type PetDef,
  type Rarity,
  type RegionDef,
  type SkillDef,
  type Stats,
  emptyStats,
} from "./types";

// ----------------------------------------------------------
//  Rarity color mapping
// ----------------------------------------------------------
export const RARITY_COLOR: Record<string, string> = {
  COMMON: "#9aa7b8",
  UNCOMMON: "#5fd17a",
  RARE: "#49b6ff",
  EPIC: "#b98bff",
  LEGENDARY: "#ffc24b",
  MYTHIC: "#ff6fb0",
  ANCIENT: "#ff7d52",
};

export const RARITY_WEIGHT: Record<string, number> = {
  COMMON: 100,
  UNCOMMON: 55,
  RARE: 24,
  EPIC: 9,
  LEGENDARY: 2.4,
  MYTHIC: 0.5,
  ANCIENT: 0.08,
};

// ----------------------------------------------------------
//  HERO ASCII skeleton — markers 'H' (head) & 'B' (body)
//  get replaced per-class; weapon drawn as separate overlay.
// ----------------------------------------------------------
export const PLAYER_FRAMES: Record<string, string[][]> = {
  idle: [["  H  ", " /B\\ ", "  |  ", " / \\ "]],
  run: [
    ["  H  ", " /B\\ ", "  |  ", " /   "],
    ["  H  ", " /B\\ ", "  |  ", "   \\ "],
    ["  H  ", " /B\\ ", "  |  ", " /   "],
    ["  H  ", " /B\\ ", "  |  ", "  |  "],
  ],
  // jump: arm raised beside the head, only the left foot visible tucked up
  jump: [["  H\\ ", "  B  ", "  |  ", " /   "]],
  // fall: body back to the original neutral stance, still only the left foot showing
  fall: [["  H  ", " /B\\ ", "  |  ", " /   "]],
  attack: [
    ["  H  ", " /B\\ ", "  |  ", " / \\ "],
    ["  H  ", " /B\\ ", "  |  ", " / \\ "],
  ],
  cast: [["  H  ", " *B* ", "  |  ", " / \\ "]],
  hurt: [["  H  ", " xBx ", "  |  ", " / \\ "]],
  dead: [["     ", "  ~  ", " H|| ", " /\\  "]],
};

// ----------------------------------------------------------
//  Enemy ASCII art library (frames optional for animation)
// ----------------------------------------------------------
export const ENEMY_ART: Record<string, string[][]> = {
  boar: [
    ["  __ ", "(OO)>", "||  ||"],
    ["  __ ", "(OO)>", "||  ||"],
  ],
  wolf: [
    [" /\\___", "(o o )", " > ^ <"],
    [" /\\___", "(o o )", " >^ < "],
  ],
  goblin: [
    ["  g ", " /|\\", " >  "],
    ["  g ", " /|\\", "  < "],
  ],
  bandit: [
    ["  o  ", " /|\\ ", " /|\\ "],
    ["  o  ", " /|\\ ", " |\\ "],
  ],
  beast: [
    [" /\\_/\\", "( > <)", "  ~~ "],
    [" /\\_/\\", "( > <)", "  ~  "],
  ],
  treant: [
    [" YYY ", "(|Y|)", "  |  "],
    [" YYY ", "(|Y|)", "  |  "],
  ],
  skeleton: [
    ["  ø  ", " /|\\ ", " / X "],
    ["  ø  ", " /|\\ ", " X \\ "],
  ],
  knight: [
    [" [o] ", "/|T|\\", " | | "],
    [" [o] ", "/|T|\\", " | | "],
  ],
  dread_knight: [
    [
      "  [0] /===>",
      " /(T)\\===",
      "  (/=\\)",
      "  // \\\\"
    ],
    [
      "  [0] /===>",
      " /(T)\\===",
      "  (/=\\)",
      "  \\\\ //"
    ]
  ],
  construct: [
    [" [O] ", "{|||}", " [ ] "],
    [" [O] ", "{|||}", " [ ] "],
  ],
  icewolf: [
    [" /\\___", "(❄ ❄)", " > ^ <"],
    [" /\\___", "(❄ ❄)", " >^ < "],
  ],
  icegolem: [
    [" /‾‾\\", "| ❄ |", "|[]|", " \\__/ "],
    [" /‾‾\\", "| ❄ |", "|[]|", " \\__/ "],
  ],
  demon: [
    [" /\\_/\\", "( * *)", "  v  ", " /||\\"],
    [" /\\_/\\", "( * *)", "  v  ", "/||\\ "],
  ],
  hellbeast: [
    [" ,,,, ", "(\\\\//)", "(O  O)", "  vv "],
    [" ,,,, ", "(\\\\//)", "(O  O)", " vv  "],
  ],
  mage: [
    ["  ✦  ", " /|\\ ", " <✦> "],
    ["  ✶  ", " /|\\ ", " <✦> "],
  ],
  skybeast: [
    ["  /\\  ", " (~~) ", "/(oo)\\", "  ~~  "],
    ["  /\\  ", " (~~) ", "/(oo)\\", " ~~   "],
  ],
  floatguard: [
    [" ◇◇◇ ", "[ O ]", " / \\ "],
    [" ◇◇◇ ", "[ O ]", " / \\ "],
  ],
};

// ----------------------------------------------------------
//  Boss ASCII art library
// ----------------------------------------------------------
export const BOSS_ART: Record<string, string[][]> = {
  brute: [
    [
      "     ███████████     ",
      "    ██  @   @  ██    ",
      "    ██   ___   ██    ",
      "   ███████████████   ",
      "   ██   ████   ██    ",
      "    ██       ██      ",
      "   /  \\     /  \\     ",
      "  /    \\   /    \\    ",
    ],
    [
      "     ███████████     ",
      "    ██  @   @  ██    ",
      "    ██   ---   ██    ",
      "   ███████████████   ",
      "   ██   ████   ██    ",
      "    ██       ██      ",
      "  \\  /       \\  \\    ",
      "   |  \\     /  |     ",
    ],
  ],
  wraith: [
    [
      "      .ooooo.       ",
      "     o O O O o      ",
      "    o  \\___/  o     ",
      "     \\  ***  /      ",
      "      \\     /       ",
      "       |   |        ",
      "      /     \\       ",
      "     ~~~   ~~~      ",
    ],
    [
      "      .ooooo.       ",
      "     o * O * o      ",
      "    o  \\___/  o     ",
      "     \\  ***  /      ",
      "      \\ ~~~ /       ",
      "       | | |        ",
      "      / ~ ~ \\       ",
      "     ~~~   ~~~      ",
    ],
  ],
  behemoth: [
    [
      "      /\\____/\\      ",
      "     (  O  O  )     ",
      "    ==(  __  )==    ",
      "      \\  xx  /      ",
      "       ------       ",
      "      /|    |\\      ",
      "     / |    | \\     ",
      "       ^^   ^^      ",
    ],
    [
      "      /\\____/\\      ",
      "     (  O  O  )     ",
      "    ==(  --  )==    ",
      "      \\  xx  /      ",
      "       ------       ",
      "     \\|    |/       ",
      "      |    |        ",
      "      ^^    ^^      ",
    ],
  ],
  sovereign: [
    [
      "       /\\_*/\\       ",
      "      |o o o|       ",
      "      |_____|       ",
      "     /\\| | |/\\     ",
      "    /  |   |  \\     ",
      "   /___|___|___\\    ",
      "     |  | |  |      ",
      "     ^  ^ ^  ^      ",
    ],
    [
      "       /\\_*/\\       ",
      "      |* o *|       ",
      "      |_____|       ",
      "    \\/\\| | |/\\/    ",
      "     / |   | \\      ",
      "    /___|___|___\\   ",
      "      |  | |  |     ",
      "      ^  ^ ^  ^     ",
    ],
  ],
};

// ----------------------------------------------------------
//  Skill definitions
// ----------------------------------------------------------
export const SKILLS: Record<string, SkillDef> = {
  power_strike: {
    id: "power_strike",
    name: "Power Strike",
    kind: "strike",
    desc: "A focused heavy blow on the nearest foe.",
    mana: 12,
    cd: 2.6,
    mult: 2.2,
    range: 3,
    symbol: ">",
  },
  cleave: {
    id: "cleave",
    name: "Cleave",
    kind: "cleave",
    desc: "Sweeping arc hitting all foes in range.",
    mana: 18,
    cd: 4,
    mult: 1.4,
    radius: 4,
    symbol: "<>",
  },
  whirlwind: {
    id: "whirlwind",
    name: "Whirlwind",
    kind: "aoe",
    desc: "Spin, striking every nearby enemy.",
    mana: 30,
    cd: 7,
    mult: 1.9,
    radius: 5,
    symbol: "@",
  },
  warcry: {
    id: "warcry",
    name: "War Cry",
    kind: "buff",
    desc: "Roar, boosting ATK for a time.",
    mana: 25,
    cd: 18,
    mult: 0,
    symbol: "!",
  },
  smite: {
    id: "smite",
    name: "Smite",
    kind: "aoe",
    desc: "Divine burst around the target.",
    mana: 24,
    cd: 6,
    mult: 2.0,
    radius: 4,
    symbol: "+",
  },
  heal: {
    id: "heal",
    name: "Mend",
    kind: "heal",
    desc: "Channel light to restore HP.",
    mana: 30,
    cd: 14,
    mult: 0,
    symbol: "♥",
  },
  backstab: {
    id: "backstab",
    name: "Backstab",
    kind: "strike",
    desc: "Lethal strike with huge crit chance.",
    mana: 22,
    cd: 5.5,
    mult: 3.0,
    range: 3,
    symbol: "X",
  },
  venom_strike: {
    id: "venom_strike",
    name: "Venom Strike",
    kind: "strike",
    desc: "Poisoned blade that lingers.",
    mana: 20,
    cd: 5,
    mult: 2.0,
    range: 3,
    symbol: "v",
  },
  shadow_dash: {
    id: "shadow_dash",
    name: "Shadow Dash",
    kind: "dash",
    desc: "Phase forward, slicing through foes.",
    mana: 18,
    cd: 5,
    mult: 1.8,
    range: 8,
    symbol: ">>",
  },
  piercing_shot: {
    id: "piercing_shot",
    name: "Piercing Shot",
    kind: "projectile",
    desc: "A bolt that punches through armor.",
    mana: 14,
    cd: 2.8,
    mult: 2.0,
    range: 24,
    symbol: "->",
  },
  multi_shot: {
    id: "multi_shot",
    name: "Volley",
    kind: "projectile",
    desc: "Loose a spread of three arrows.",
    mana: 20,
    cd: 5,
    mult: 1.3,
    range: 22,
    symbol: ">>>",
  },
  rapid_fire: {
    id: "rapid_fire",
    name: "Rapid Fire",
    kind: "projectile",
    desc: "Lock in place and release a quick 2-3 shot burst.",
    mana: 16,
    cd: 3.6,
    mult: 1.2,
    range: 24,
    symbol: ".>",
  },
  fireball: {
    id: "fireball",
    name: "Fireball",
    kind: "projectile",
    desc: "Hurl flame that explodes on impact.",
    mana: 28,
    cd: 6,
    mult: 2.6,
    range: 14,
    radius: 3,
    symbol: "*",
  },
  arcane_burst: {
    id: "arcane_burst",
    name: "Arcane Burst",
    kind: "aoe",
    desc: "Detonate raw magic around you.",
    mana: 35,
    cd: 8,
    mult: 2.2,
    radius: 6,
    symbol: "✦",
  },
  blood_rage: {
    id: "blood_rage",
    name: "Blood Rage",
    kind: "buff",
    desc: "Fury that massively raises ATK & CRIT.",
    mana: 30,
    cd: 20,
    mult: 0,
    symbol: "!!!",
  },
  bombard: {
    id: "bombard",
    name: "Bombard",
    kind: "projectile",
    desc: "Launch an explosive shell.",
    mana: 30,
    cd: 7,
    mult: 2.5,
    range: 14,
    radius: 3,
    symbol: "[]",
  },
  // ---- Ultimates ----
  rampage: {
    id: "rampage",
    name: "Rampage",
    kind: "ultimate",
    desc: "Unleash a storm of crushing blows.",
    mana: 60,
    cd: 30,
    mult: 5,
    radius: 7,
    symbol: "###",
    ultimate: true,
  },
  fortress_break: {
    id: "fortress_break",
    name: "Fortress Break",
    kind: "ultimate",
    desc: "Shatter the earth in a colossal slam.",
    mana: 60,
    cd: 30,
    mult: 5,
    radius: 7,
    symbol: "##",
    ultimate: true,
  },
  death_dance: {
    id: "death_dance",
    name: "Death Dance",
    kind: "ultimate",
    desc: "Blink between foes, reaping all.",
    mana: 60,
    cd: 28,
    mult: 5,
    radius: 8,
    symbol: "XXX",
    ultimate: true,
  },
  arrow_storm: {
    id: "arrow_storm",
    name: "Arrow Storm",
    kind: "ultimate",
    desc: "Rain destruction from above.",
    mana: 60,
    cd: 30,
    mult: 5,
    radius: 12,
    symbol: "vvv",
    ultimate: true,
  },
  meteor: {
    id: "meteor",
    name: "Meteor",
    kind: "ultimate",
    desc: "Call down a cataclysm of fire.",
    mana: 70,
    cd: 32,
    mult: 5.5,
    radius: 8,
    symbol: "***",
    ultimate: true,
  },
  frenzy: {
    id: "frenzy",
    name: "Frenzy",
    kind: "ultimate",
    desc: "Enter a killing trance.",
    mana: 60,
    cd: 28,
    mult: 5,
    radius: 7,
    symbol: "!!!",
    ultimate: true,
  },
  overdrive: {
    id: "overdrive",
    name: "Overdrive",
    kind: "ultimate",
    desc: "Overload weaponry for annihilation.",
    mana: 60,
    cd: 30,
    mult: 5,
    radius: 8,
    symbol: "[**]",
    ultimate: true,
  },
  melody_slash: {
    id: "melody_slash",
    name: "Melody Slash",
    kind: "projectile",
    desc: "Unleash a sonic shockwave that slices through foes.",
    mana: 14,
    cd: 2.8,
    mult: 1.8,
    range: 14,
    symbol: "♬",
  },
  dissonant_chord: {
    id: "dissonant_chord",
    name: "Dissonant Chord",
    kind: "aoe",
    desc: "Pluck a discordant string, stunning and blasting nearby foes.",
    mana: 22,
    cd: 5,
    mult: 1.9,
    radius: 5,
    symbol: "♫",
  },
  symphony_of_might: {
    id: "symphony_of_might",
    name: "Symphony of Might",
    kind: "buff",
    desc: "A powerful melody that temporarily boosts ATK and Critical Rate.",
    mana: 26,
    cd: 18,
    mult: 0,
    symbol: "♩",
  },
  hymn_of_serenity: {
    id: "hymn_of_serenity",
    name: "Hymn of Serenity",
    kind: "heal",
    desc: "A soothing hymn that heals both HP and restores MP.",
    mana: 12,
    cd: 15,
    mult: 0,
    symbol: "♥",
  },
  calamity_requiem: {
    id: "calamity_requiem",
    name: "Calamity Requiem",
    kind: "ultimate",
    desc: "Call down a cataclysmic sonic collapse that obliterates all waves.",
    mana: 65,
    cd: 32,
    mult: 5.6,
    radius: 9,
    symbol: "☼",
    ultimate: true,
  },
};

// ----------------------------------------------------------
//  Classes
// ----------------------------------------------------------
function st(s: Partial<Stats>): Stats {
  return { ...emptyStats(), ...s };
}

export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: "warrior",
    name: "Warrior",
    role: "Bruiser",
    desc: "Sturdy melee fighter with balanced power and resilience.",
    color: "#ff8c42",
    headGlyph: "O",
    bodyGlyph: "#",
    weaponGlyph: "[===>",
    base: st({ hp: 520, mp: 80, atk: 42, def: 30, acc: 90, eva: 8, crit: 9, critdmg: 150, atkspd: 1.0, mvspd: 1.0 }),
    growth: st({ hp: 42, mp: 6, atk: 4.2, def: 3.0, acc: 0.6, eva: 0.2, crit: 0.12, critdmg: 1.2, atkspd: 0.01, mvspd: 0 }),
    skills: ["power_strike", "cleave", "whirlwind", "warcry", "rampage"],
  },
  knight: {
    id: "knight",
    name: "Knight",
    role: "Tank",
    desc: "Heavily armored bulwark that shrugs off blows.",
    color: "#5fd0ff",
    headGlyph: "[0]",
    bodyGlyph: "T",
    weaponGlyph: "[====>",
    base: st({ hp: 660, mp: 70, atk: 34, def: 42, acc: 85, eva: 6, crit: 6, critdmg: 140, atkspd: 0.9, mvspd: 0.96 }),
    growth: st({ hp: 52, mp: 5, atk: 3.4, def: 4.0, acc: 0.5, eva: 0.15, crit: 0.08, critdmg: 1.0, atkspd: 0.008, mvspd: 0 }),
    skills: ["smite", "cleave", "warcry", "heal", "fortress_break"],
  },
  assassin: {
    id: "assassin",
    name: "Assassin",
    role: "Burst",
    desc: "Fragile killer with devastating critical strikes.",
    color: "#a98bff",
    headGlyph: "@",
    bodyGlyph: "|",
    weaponGlyph: "/\\/",
    base: st({ hp: 360, mp: 90, atk: 50, def: 16, acc: 95, eva: 22, crit: 24, critdmg: 200, atkspd: 1.25, mvspd: 1.2 }),
    growth: st({ hp: 26, mp: 7, atk: 5.0, def: 1.6, acc: 0.7, eva: 0.4, crit: 0.3, critdmg: 1.8, atkspd: 0.012, mvspd: 0.002 }),
    skills: ["backstab", "shadow_dash", "venom_strike", "whirlwind", "death_dance"],
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    role: "Marksman",
    desc: "Precise archer striking foes from afar.",
    color: "#5fd17a",
    headGlyph: "A",
    bodyGlyph: ")",
    weaponGlyph: "-->",
    base: st({ hp: 420, mp: 90, atk: 44, def: 20, acc: 96, eva: 16, crit: 17, critdmg: 172, atkspd: 1.3, mvspd: 1.1 }),
    growth: st({ hp: 32, mp: 7, atk: 4.4, def: 2.0, acc: 0.6, eva: 0.3, crit: 0.22, critdmg: 1.5, atkspd: 0.012, mvspd: 0.001 }),
    skills: ["piercing_shot", "multi_shot", "rapid_fire", "shadow_dash", "arrow_storm"],
  },
  mage: {
    id: "mage",
    name: "Mage",
    role: "Caster",
    desc: "Glass cannon of arcane devastation.",
    color: "#49b6ff",
    headGlyph: "*",
    bodyGlyph: "}",
    weaponGlyph: "{*}",
    base: st({ hp: 340, mp: 170, atk: 30, def: 14, acc: 92, eva: 12, crit: 14, critdmg: 176, atkspd: 1.0, mvspd: 1.0, skilldmg: 45 }),
    growth: st({ hp: 24, mp: 14, atk: 3.0, def: 1.4, acc: 0.6, eva: 0.25, crit: 0.18, critdmg: 1.5, atkspd: 0.01, mvspd: 0, skilldmg: 4 }),
    skills: ["fireball", "arcane_burst", "heal", "multi_shot", "meteor"],
  },
  berserker: {
    id: "berserker",
    name: "Berserker",
    role: "DPS",
    desc: "Reckless ravager trading safety for raw carnage.",
    color: "#ff5d5d",
    headGlyph: "X",
    bodyGlyph: "#",
    weaponGlyph: "[==>",
    base: st({ hp: 480, mp: 60, atk: 58, def: 14, acc: 88, eva: 10, crit: 18, critdmg: 212, atkspd: 1.15, mvspd: 1.15 }),
    growth: st({ hp: 38, mp: 4, atk: 5.6, def: 1.4, acc: 0.5, eva: 0.2, crit: 0.24, critdmg: 2.0, atkspd: 0.013, mvspd: 0.002 }),
    skills: ["power_strike", "whirlwind", "blood_rage", "cleave", "frenzy"],
  },
  gunner: {
    id: "gunner",
    name: "Gunner",
    role: "Tech",
    desc: "Futuristic gunslinger of relentless firepower.",
    color: "#ffd24b",
    headGlyph: "8",
    bodyGlyph: "]",
    weaponGlyph: "==D",
    base: st({ hp: 440, mp: 100, atk: 46, def: 18, acc: 94, eva: 14, crit: 15, critdmg: 166, atkspd: 1.36, mvspd: 1.05 }),
    growth: st({ hp: 34, mp: 8, atk: 4.6, def: 1.8, acc: 0.6, eva: 0.28, crit: 0.2, critdmg: 1.4, atkspd: 0.014, mvspd: 0.001 }),
    skills: ["rapid_fire", "bombard", "piercing_shot", "arcane_burst", "overdrive"],
  },
  bard: {
    id: "bard",
    name: "Bard",
    role: "Support",
    desc: "Melodic support caster utilizing sonic waves and symphonies.",
    color: "#ff6fb0",
    headGlyph: "♫",
    bodyGlyph: "Y",
    weaponGlyph: "~♬~",
    base: st({ hp: 400, mp: 150, atk: 36, def: 20, acc: 93, eva: 15, crit: 12, critdmg: 160, atkspd: 1.1, mvspd: 1.05, skilldmg: 25 }),
    growth: st({ hp: 30, mp: 11, atk: 3.6, def: 2.0, acc: 0.55, eva: 0.3, crit: 0.16, critdmg: 1.2, atkspd: 0.01, mvspd: 0, skilldmg: 2 }),
    skills: ["melody_slash", "dissonant_chord", "symphony_of_might", "hymn_of_serenity", "calamity_requiem"],
  },
};

export const CLASS_LIST: ClassDef[] = Object.values(CLASSES);

// ----------------------------------------------------------
//  Enemy definitions (base values; scaled at spawn time)
// ----------------------------------------------------------
export const ENEMIES: Record<string, EnemyDef> = {
  // Ashen Plains
  boar: { id: "boar", name: "Tusk Boar", artKey: "boar", color: "#c98a5a", ai: "charger", hp: 70, atk: 12, def: 4, xp: 18, gold: 2, size: [5, 3] },
  plains_wolf: { id: "plains_wolf", name: "Dust Wolf", artKey: "wolf", color: "#b9a98c", ai: "walker", hp: 60, atk: 14, def: 3, xp: 20, gold: 3, size: [6, 3] },
  goblin: { id: "goblin", name: "Scrap Goblin", artKey: "goblin", color: "#8fd17a", ai: "walker", hp: 52, atk: 11, def: 2, xp: 16, gold: 2, size: [4, 3] },
  bandit: { id: "bandit", name: "Road Bandit", artKey: "bandit", color: "#cda3a3", ai: "walker", hp: 80, atk: 16, def: 5, xp: 26, gold: 4, size: [5, 3] },
  // Dark Forest
  forest_beast: { id: "forest_beast", name: "Thicket Beast", artKey: "beast", color: "#6fbf6f", ai: "charger", hp: 110, atk: 18, def: 5, xp: 30, gold: 4, size: [6, 3] },
  treant: { id: "treant", name: "Grove Treant", artKey: "treant", color: "#5a9d5a", ai: "turret", hp: 180, atk: 16, def: 12, xp: 40, gold: 5, size: [5, 3] },
  dark_elf: { id: "dark_elf", name: "Dusk Elf", artKey: "mage", color: "#9b6bff", ai: "flyer", hp: 90, atk: 22, def: 4, xp: 34, gold: 6, size: [5, 3], ranged: true },
  shadow_wolf: { id: "shadow_wolf", name: "Shadow Wolf", artKey: "wolf", color: "#7a6cff", ai: "walker", hp: 96, atk: 24, def: 4, xp: 32, gold: 5, size: [6, 3] },
  // Ancient Ruins
  skeleton: { id: "skeleton", name: "Bone Sentinel", artKey: "skeleton", color: "#d8d2b8", ai: "walker", hp: 120, atk: 24, def: 6, xp: 38, gold: 6, size: [5, 3] },
  ruin_guard: { id: "ruin_guard", name: "Ruin Guardian", artKey: "knight", color: "#c9b483", ai: "walker", hp: 200, atk: 26, def: 16, xp: 52, gold: 8, size: [5, 3] },
  ancient_knight: { id: "ancient_knight", name: "Ancient Knight", artKey: "knight", color: "#e0c870", ai: "charger", hp: 240, atk: 32, def: 18, xp: 64, gold: 10, size: [5, 3] },
  construct: { id: "construct", name: "Ruin Construct", artKey: "construct", color: "#b0a0c8", ai: "turret", hp: 300, atk: 28, def: 22, xp: 70, gold: 9, size: [5, 4], ranged: true },
  // Frozen Wastes
  ice_wolf: { id: "ice_wolf", name: "Frost Wolf", artKey: "icewolf", color: "#9fe0ff", ai: "walker", hp: 150, atk: 30, def: 8, xp: 46, gold: 8, size: [6, 3] },
  frost_goblin: { id: "frost_goblin", name: "Frost Goblin", artKey: "goblin", color: "#a0e8ff", ai: "walker", hp: 130, atk: 28, def: 6, xp: 44, gold: 7, size: [4, 3] },
  ice_golem: { id: "ice_golem", name: "Ice Golem", artKey: "icegolem", color: "#bfeeff", ai: "turret", hp: 420, atk: 34, def: 28, xp: 90, gold: 12, size: [6, 4] },
  frost_knight: { id: "frost_knight", name: "Frost Knight", artKey: "knight", color: "#cfeaff", ai: "charger", hp: 320, atk: 40, def: 24, xp: 84, gold: 11, size: [5, 3] },
  // Demon Lands
  demon_soldier: { id: "demon_soldier", name: "Demon Soldier", artKey: "demon", color: "#ff7a5a", ai: "walker", hp: 220, atk: 42, def: 14, xp: 70, gold: 12, size: [6, 4] },
  hell_beast: { id: "hell_beast", name: "Hell Beast", artKey: "hellbeast", color: "#ff5a3a", ai: "charger", hp: 300, atk: 48, def: 12, xp: 92, gold: 14, size: [6, 4] },
  demon_knight: { id: "demon_knight", name: "Demon Knight", artKey: "knight", color: "#ff8a4a", ai: "charger", hp: 380, atk: 54, def: 26, xp: 110, gold: 16, size: [5, 3] },
  abyss_mage: { id: "abyss_mage", name: "Abyssal Mage", artKey: "mage", color: "#c44bff", ai: "flyer", hp: 240, atk: 60, def: 10, xp: 96, gold: 15, size: [5, 3], ranged: true },
  // Floating Realm
  sky_beast: { id: "sky_beast", name: "Sky Beast", artKey: "skybeast", color: "#bfe0ff", ai: "flyer", hp: 300, atk: 52, def: 16, xp: 100, gold: 15, size: [7, 4], ranged: true },
  float_guard: { id: "float_guard", name: "Floating Guardian", artKey: "floatguard", color: "#d0c4ff", ai: "flyer", hp: 360, atk: 50, def: 30, xp: 120, gold: 16, size: [5, 3] },
  arcane_construct: { id: "arcane_construct", name: "Arcane Construct", artKey: "construct", color: "#9ad8ff", ai: "turret", hp: 520, atk: 56, def: 38, xp: 150, gold: 18, size: [5, 4], ranged: true },
  celestial_knight: { id: "celestial_knight", name: "Celestial Knight", artKey: "knight", color: "#fff0b0", ai: "charger", hp: 460, atk: 64, def: 34, xp: 160, gold: 20, size: [5, 3] },
  // Rare Rear Ambush Monster (HARD+ difficulty)
  dread_knight: { id: "dread_knight", name: "Dread Knight", artKey: "dread_knight", color: "#ffd24b", ai: "charger", hp: 480, atk: 56, def: 26, xp: 140, gold: 22, size: [11, 4] },
};

// ----------------------------------------------------------
//  Boss definitions
// ----------------------------------------------------------
export const BOSSES: Record<string, BossDef> = {
  ashen_behemoth: {
    id: "ashen_behemoth", name: "GRAKK", title: "The Ashen Maw", artKey: "behemoth", color: "#c89060",
    hp: 4200, atk: 60, def: 24, xp: 1200, gold: 600, tokens: 8, size: [20, 8],
    attacks: [{ kind: "slam", windup: 1.1, dmgMult: 1.2 }, { kind: "charge", windup: 1.3, dmgMult: 1.5 }],
  },
  forest_wraith: {
    id: "forest_wraith", name: "SYLVANE", title: "Whisper of the Wood", artKey: "wraith", color: "#6fd98a",
    hp: 6000, atk: 70, def: 22, xp: 1900, gold: 850, tokens: 12, size: [19, 8],
    attacks: [{ kind: "wave", windup: 1.2, dmgMult: 1.1 }, { kind: "rain", windup: 1.4, dmgMult: 1.3 }],
  },
  ruin_sovereign: {
    id: "ruin_sovereign", name: "KAELDROS", title: "Warden of Dust", artKey: "sovereign", color: "#e0c870",
    hp: 9000, atk: 88, def: 40, xp: 3000, gold: 1300, tokens: 18, size: [19, 8],
    attacks: [{ kind: "slam", windup: 1.0, dmgMult: 1.3 }, { kind: "wave", windup: 1.3, dmgMult: 1.2 }, { kind: "charge", windup: 1.2, dmgMult: 1.6 }],
  },
  frost_colossus: {
    id: "frost_colossus", name: "GLACIAR", title: "The Eternal Cold", artKey: "brute", color: "#9fe0ff",
    hp: 13000, atk: 100, def: 60, xp: 4400, gold: 1900, tokens: 26, size: [21, 8],
    attacks: [{ kind: "slam", windup: 1.2, dmgMult: 1.4 }, { kind: "rain", windup: 1.5, dmgMult: 1.3 }],
  },
  demon_brute: {
    id: "demon_brute", name: "MALPHAZ", title: "Lord of Cinder", artKey: "brute", color: "#ff6a3a",
    hp: 18000, atk: 124, def: 56, xp: 6500, gold: 2700, tokens: 38, size: [21, 8],
    attacks: [{ kind: "slam", windup: 0.9, dmgMult: 1.5 }, { kind: "charge", windup: 1.1, dmgMult: 1.8 }, { kind: "rain", windup: 1.3, dmgMult: 1.4 }],
  },
  sky_sovereign: {
    id: "sky_sovereign", name: "AURELYN", title: "Sovereign of the Void", artKey: "sovereign", color: "#ffe9a0",
    hp: 26000, atk: 150, def: 80, xp: 10000, gold: 4200, tokens: 60, size: [19, 8],
    attacks: [{ kind: "wave", windup: 1.0, dmgMult: 1.4 }, { kind: "rain", windup: 1.2, dmgMult: 1.5 }, { kind: "slam", windup: 1.1, dmgMult: 1.6 }],
  },
};

// ----------------------------------------------------------
//  Regions
// ----------------------------------------------------------
function pal(sky1: string, sky2: string, ground: string, ground2: string, fog: string, accent: string, star: string): Palette {
  return { sky1, sky2, ground, ground2, fog, accent, star };
}

export const REGIONS: RegionDef[] = [
  {
    idx: 0, id: "ashen_plains", name: "ASHEN PLAINS", mid: "plain", groundChar: "▓", fogChar: "░",
    palette: pal("#1a1410", "#3a2a1c", "#6b4a2a", "#4a2f18", "#5a4632", "#ffae5a", "#ffd9a0"),
    enemies: ["boar", "plains_wolf", "goblin", "bandit"], boss: "ashen_behemoth", lengthM: 1500,
  },
  {
    idx: 1, id: "dark_forest", name: "DARK FOREST", mid: "forest", groundChar: "▒", fogChar: "░",
    palette: pal("#0a140c", "#13261a", "#2e5a36", "#1c3a22", "#2a4a30", "#6fe07a", "#bfffd0"),
    enemies: ["forest_beast", "treant", "dark_elf", "shadow_wolf"], boss: "forest_wraith", lengthM: 1600,
  },
  {
    idx: 2, id: "ancient_ruins", name: "ANCIENT RUINS", mid: "ruin", groundChar: "▓", fogChar: "░",
    palette: pal("#171208", "#2e2410", "#7a6638", "#52431f", "#5a4a2a", "#e0c870", "#fff0b0"),
    enemies: ["skeleton", "ruin_guard", "ancient_knight", "construct"], boss: "ruin_sovereign", lengthM: 1700,
  },
  {
    idx: 3, id: "frozen_wastes", name: "FROZEN WASTES", mid: "ice", groundChar: "▓", fogChar: "·",
    palette: pal("#0a1622", "#162a40", "#7fb0d8", "#4a7aa0", "#6a90b0", "#bfeeff", "#ffffff"),
    enemies: ["ice_wolf", "frost_goblin", "ice_golem", "frost_knight"], boss: "frost_colossus", lengthM: 1800,
  },
  {
    idx: 4, id: "demon_lands", name: "DEMON LANDS", mid: "demon", groundChar: "▓", fogChar: "░",
    palette: pal("#160606", "#330c0c", "#7a2a1a", "#4a160e", "#5a1e12", "#ff6a3a", "#ffae5a"),
    enemies: ["demon_soldier", "hell_beast", "demon_knight", "abyss_mage"], boss: "demon_brute", lengthM: 1900,
  },
  {
    idx: 5, id: "floating_realm", name: "FLOATING REALM", mid: "sky", groundChar: "▓", fogChar: "✦",
    palette: pal("#0c0a1c", "#1c1838", "#5a6ad8", "#3a3a7a", "#4a4a8a", "#ffe9a0", "#ffffff"),
    enemies: ["sky_beast", "float_guard", "arcane_construct", "celestial_knight"], boss: "sky_sovereign", lengthM: 2000,
  },
];

// ----------------------------------------------------------
//  PETS — companion gacha roster
//  Floating allies that trail the hero and fire on nearby foes.
// ----------------------------------------------------------
export const PETS: Record<string, PetDef> = {
  dust_sprite: {
    id: "dust_sprite", name: "Dust Sprite", rarity: "COMMON", element: "Earth", color: "#b9a98c",
    desc: "A drifting mote of ashen dust.", symbol: "·", atkMult: 0.28, cd: 2.0, range: 11,
    art: [" .-. ", "( o )", " '-' "],
    bonus: { atk: 4, hp: 40 },
  },
  ember_wisp: {
    id: "ember_wisp", name: "Ember Wisp", rarity: "COMMON", element: "Fire", color: "#ff9a5a",
    desc: "A flickering cinder that never dies.", symbol: "*", atkMult: 0.30, cd: 1.9, range: 11,
    art: ["  ^  ", " (*) ", "  v  "],
    bonus: { atk: 5, crit: 1 },
  },
  thorn_kit: {
    id: "thorn_kit", name: "Thorn Kit", rarity: "UNCOMMON", element: "Nature", color: "#7fd17a",
    desc: "A bramble cub with needle fangs.", symbol: "+", atkMult: 0.38, cd: 1.8, range: 12,
    art: [" /\\_/\\ ", "( >w< )", "  \" \"  "],
    bonus: { atk: 9, hp: 90, eva: 2 },
  },
  gale_finch: {
    id: "gale_finch", name: "Gale Finch", rarity: "UNCOMMON", element: "Wind", color: "#9fe0d0",
    desc: "Rides the updraft, quick as thought.", symbol: "-", atkMult: 0.35, cd: 1.4, range: 13,
    art: [" \\   / ", "  >o<  ", "  ---  "],
    bonus: { atk: 8, atkspd: 0.04, mvspd: 0.02 },
  },
  frost_owl: {
    id: "frost_owl", name: "Frost Owl", rarity: "RARE", element: "Ice", color: "#bfeeff",
    desc: "Silent hunter of the white waste.", symbol: "❄", atkMult: 0.52, cd: 1.7, range: 13,
    art: [" /^_^\\ ", "( O O )", " \\_-_/ "],
    bonus: { atk: 16, hp: 150, crit: 3 },
  },
  cinder_imp: {
    id: "cinder_imp", name: "Cinder Imp", rarity: "RARE", element: "Fire", color: "#ff7a4a",
    desc: "Mischief wrapped in living flame.", symbol: "*", atkMult: 0.58, cd: 1.9, range: 12,
    art: [" \\\\o// ", " ( ~ ) ", "  /_\\  "],
    bonus: { atk: 20, critdmg: 8 },
  },
  storm_drake: {
    id: "storm_drake", name: "Storm Drake", rarity: "EPIC", element: "Storm", color: "#8fb8ff",
    desc: "A whelp wreathed in rolling thunder.", symbol: "≈", atkMult: 0.78, cd: 1.6, range: 14,
    art: ["  /\\~/\\  ", " < (oo) >", "  \\ vv /  "],
    bonus: { atk: 34, hp: 240, crit: 5, skilldmg: 6 },
  },
  abyss_eye: {
    id: "abyss_eye", name: "Abyss Eye", rarity: "EPIC", element: "Void", color: "#b98bff",
    desc: "It watches, and the dark watches with it.", symbol: "◆", atkMult: 0.84, cd: 1.8, range: 15,
    art: [" .---. ", "( (@) )", " '---' "],
    bonus: { atk: 38, mp: 120, critdmg: 14 },
  },
  solar_phoenix: {
    id: "solar_phoenix", name: "Solar Phoenix", rarity: "LEGENDARY", element: "Light", color: "#ffd24b",
    desc: "Reborn from every ash it leaves.", symbol: "✦", atkMult: 1.15, cd: 1.4, range: 16,
    art: [" \\ /^\\ / ", "--( <> )--", " / \\_/ \\ "],
    bonus: { atk: 62, hp: 420, crit: 8, critdmg: 22 },
  },
  void_wyrm: {
    id: "void_wyrm", name: "Void Wyrm", rarity: "LEGENDARY", element: "Void", color: "#c46bff",
    desc: "A coil of hungry nothingness.", symbol: "§", atkMult: 1.22, cd: 1.5, range: 16,
    art: [" ~~@~~ ", "( 0-0 )", " ~~~~~ "],
    bonus: { atk: 68, skilldmg: 18, critdmg: 18 },
  },
  astral_seraph: {
    id: "astral_seraph", name: "Astral Seraph", rarity: "MYTHIC", element: "Astral", color: "#ff6fb0",
    desc: "Sings the song that shatters sieges.", symbol: "✶", atkMult: 1.65, cd: 1.2, range: 17,
    art: ["\\  .*.  /", " >( @ )< ", "/  '*'  \\"],
    bonus: { atk: 110, hp: 700, crit: 12, critdmg: 30, skilldmg: 22 },
  },
  eclipse_sovereign: {
    id: "eclipse_sovereign", name: "Eclipse Sovereign", rarity: "ANCIENT", element: "Eclipse", color: "#ff7d52",
    desc: "The last crown of a devoured sun.", symbol: "☼", atkMult: 2.2, cd: 1.0, range: 18,
    art: ["\\\\ /###\\ //", "==( (@) )==", "// \\###/ \\\\"],
    bonus: { atk: 175, hp: 1100, crit: 16, critdmg: 45, skilldmg: 32, atkspd: 0.08 },
  },
};

export const PET_LIST: PetDef[] = Object.values(PETS);

// Gacha pull rates (percent). Displayed to the player in the summon UI.
export const PET_GACHA_RATES: Record<Rarity, number> = {
  COMMON: 62.0,
  UNCOMMON: 27.0,
  RARE: 8.0,
  EPIC: 2.3,
  LEGENDARY: 0.6,
  MYTHIC: 0.08,
  ANCIENT: 0.02,
};

export const PET_PULL_COST = 30; // Spirit Orbs per single summon
export const PET_PULL10_COST = 270; // discounted 10x summon (Spirit Orbs)
export const PET_PITY = 60; // guaranteed LEGENDARY+ within this many pulls
export const PET_MAX_STAR = 5;

// Duplicate conversion + star scaling
export const PET_DUPE_SHARDS: Record<Rarity, number> = {
  COMMON: 2, UNCOMMON: 4, RARE: 8, EPIC: 18, LEGENDARY: 45, MYTHIC: 100, ANCIENT: 220,
};

/** Multiplier applied to a pet's bonus stats & damage for its star level. */
export function petStarMult(star: number): number {
  return 1 + (star - 1) * 0.35;
}

// ----------------------------------------------------------
//  Achievements / Titles
// ----------------------------------------------------------
export const ACHIEVEMENTS: Achievement[] = [
  { id: "kill_100", name: "Slayer", desc: "Defeat 100 enemies", goal: 100, rewardTitle: "Slayer", stat: { atk: 5 } },
  { id: "kill_1000", name: "Executioner", desc: "Defeat 1,000 enemies", goal: 1000, rewardTitle: "Executioner", stat: { atk: 12 } },
  { id: "kill_10000", name: "Reaper", desc: "Defeat 10,000 enemies", goal: 10000, rewardTitle: "Reaper", stat: { atk: 30, crit: 5 } },
  { id: "boss_1", name: "Giant Slayer", desc: "Defeat a boss", goal: 1, rewardTitle: "Giant Slayer", stat: { def: 8 } },
  { id: "boss_10", name: "Nightmare Breaker", desc: "Defeat 10 bosses", goal: 10, rewardTitle: "Nightmare Breaker", stat: { def: 20, hp: 200 } },
  { id: "dist_5000", name: "Wayfarer", desc: "Travel 5,000m", goal: 5000, rewardTitle: "Wayfarer", stat: { mvspd: 0.05 } },
  { id: "dist_20000", name: "Trailblazer", desc: "Travel 20,000m", goal: 20000, rewardTitle: "Trailblazer", stat: { mvspd: 0.1, eva: 5 } },
  { id: "combo_50", name: "Combo Master", desc: "Reach a x50 combo", goal: 50, rewardTitle: "Combo Master", stat: { critdmg: 20 } },
  { id: "lvl_25", name: "Veteran", desc: "Reach level 25", goal: 25, rewardTitle: "Veteran", stat: { hp: 300, mp: 60 } },
  { id: "lvl_50", name: "Ascendant", desc: "Reach level 50", goal: 50, rewardTitle: "Ascendant", stat: { atk: 40, def: 40 } },
];

export const STARTING_TITLES = ["Novice"];

export function titleStat(title: string): Partial<Stats> {
  for (const a of ACHIEVEMENTS) if (a.rewardTitle === title) return a.stat || {};
  return {};
}

// ----------------------------------------------------------
//  Midground prop art (decorative, parallax)
// ----------------------------------------------------------
export const MID_ART: Record<string, string[]> = {
  tree: ["   Y   ", "  YYY  ", " YYYYY ", "YYYYYYY", "   |   "],
  pine: ["   ^   ", "  ^^^  ", " ^^^^^ ", "^^^^^^^", "   |   "],
  tower: ["   |+|   ", "  |[] |  ", "  |[] |  ", "  |___|  "],
  ruin: ["  ][  ][ ", "  ||  || ", "  ====== "],
  obelisk: ["   /\\   ", "  /  \\  ", "  |  |  ", "  |  |  "],
  crystal: ["   ◆   ", "  ◆◆◆  ", "   ◆   "],
  pillar: ["  ███  ", "  █ █  ", "  █ █  ", "  ███  "],
  hut: ["   /\\   ", "  /[]\\  ", "  |  |  "],
  cloud: ["  .--.   ", " (    )  ", "  '--'   "],
};

// starting inventory seed
export const START_GOLD = 120;
