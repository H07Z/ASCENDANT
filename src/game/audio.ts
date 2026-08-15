// ============================================================
//  Web Audio API Sound Engine — Procedural SFX & Music (BGM)
//  Requires zero external assets; works 100% offline & singlefile.
// ============================================================

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private currentTrack: string | null = null;
  private enabled = true;
  private bgmVolume = 0.28;
  private sfxVolume = 0.45;
  private step = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this.bgmVolume;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    } catch {
      /* Web Audio not supported */
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    } else if (this.currentTrack) {
      this.playBgm(this.currentTrack);
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // ----------------------------------------------------------
  //  SOUND EFFECTS (SFX)
  // ----------------------------------------------------------

  public hit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public crit() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Low punch
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(160, now);
    osc1.frequency.exponentialRampToValueAtTime(30, now + 0.18);
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    // High crunch
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(480, now);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.14);
    gain2.gain.setValueAtTime(0.4, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc1.connect(gain1); gain1.connect(this.sfxGain);
    osc2.connect(gain2); gain2.connect(this.sfxGain);

    osc1.start(now); osc1.stop(now + 0.18);
    osc2.start(now); osc2.stop(now + 0.14);
  }

  public shoot() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.10);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.10);
  }

  public jump() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public dash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public coin() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [987.77, 1318.51]; // B5 -> E6 double chime
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  public goldSplash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const freqs = [1046.50, 1318.51, 1567.98, 1760.00, 2093.00];
    for (let i = 0; i < 6; i++) {
      const freq = freqs[i % freqs.length];
      const t = now + Math.random() * 0.18;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.08);
    }
  }

  public characterCreate() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [293.66, 369.99, 440.00, 587.33];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.005, t + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  public levelUp() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Heroic fanfare (C4, E4, G4, C5)
    const freqs = [261.63, 329.63, 392.00, 523.25];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  public skill(kind: string) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    if (kind === "heal" || kind === "buff") {
      // Upward arpeggio
      [349.23, 440.00, 523.25, 698.46].forEach((f, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const t = now + i * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.25);
      });
    } else if (kind === "bard") {
      // Strummed acoustic chord (A major triad)
      [220.00, 277.18, 329.63, 440.00, 554.37].forEach((f, i) => {
        if (!this.ctx || !this.sfxGain) return;
        const t = now + i * 0.03;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(t); osc.stop(t + 0.45);
      });
    } else if (kind === "explosion" || kind === "cleave" || kind === "ultimate") {
      // Big bass shockwave
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(25, now + 0.35);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(now); osc.stop(now + 0.35);
    } else {
      // Standard magic burst
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(700, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(now); osc.stop(now + 0.15);
    }
  }

  public bossAppear() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.4);
    osc.frequency.linearRampToValueAtTime(60, now + 0.8);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.8);
  }

  public bossDie() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const t = now + i * 0.1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  public playerHurt() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  public death() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.6);
  }

  public click() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.03);
  }

  // ----------------------------------------------------------
  //  PROCEDURAL BACKGROUND MUSIC (BGM)
  // ----------------------------------------------------------

  public playBgm(track: string) {
    if (this.currentTrack === track && this.bgmInterval !== null) return;
    this.stopBgm();
    this.currentTrack = track;
    if (!this.enabled) return;

    this.init();
    if (!this.ctx) return;

    this.step = 0;
    const bpm = track === "boss" ? 140 : track === "town" ? 95 : 115;
    const stepTime = 60 / bpm / 2; // 8th note interval in seconds

    this.bgmInterval = window.setInterval(() => {
      this.tickBgmStep();
    }, stepTime * 1000);
  }

  public stopBgm() {
    if (this.bgmInterval !== null) {
      window.clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  private tickBgmStep() {
    if (!this.enabled || !this.ctx || !this.bgmGain || !this.currentTrack) return;

    const now = this.ctx.currentTime;
    const track = this.currentTrack;
    this.step = (this.step + 1) % 16;

    // Melody scale frequencies
    const C4 = 261.63, E4 = 329.63, G4 = 392.00, A4 = 440.00, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, Eb5 = 622.25, F5 = 698.46;
    const Eb4 = 311.13, F4 = 349.23, Bb4 = 466.16; // Minor notes for Boss/Demon

    let bassFreq = 0;
    let leadFreq = 0;

    if (track === "title") {
      // Heroic Title / Main Menu Theme
      const bassPattern = [C4 / 2, 0, G4 / 2, 0, F4 / 2, 0, G4 / 2, 0];
      const leadPattern = [G4, C5, E5, 783.99, E5, C5, G4, C5, A4, C5, F5, 880, F5, C5, A4, G4];
      bassFreq = bassPattern[this.step % 8] || 0;
      leadFreq = leadPattern[this.step % 16] || 0;
    } else if (track === "boss") {
      // Intense Boss Battle
      const bassPattern = [C4 / 2, C4 / 2, Eb4 / 2, C4 / 2, F4 / 2, Eb4 / 2, C4 / 2, G4 / 2];
      const leadPattern = [C5, 0, Eb5, D5, C5, 0, Bb4, C5, C5, Eb5, F5, 0, Eb5, D5, C5, 0];
      bassFreq = bassPattern[this.step % 8] || 0;
      leadFreq = leadPattern[this.step % 16] || 0;
    } else if (track === "town") {
      // Peaceful Town
      const bassPattern = [C4 / 2, 0, G4 / 2, 0, A4 / 2, 0, F4 / 2, 0];
      const leadPattern = [C4, E4, G4, C5, E5, C5, G4, E4, A4, C5, E5, A4, F4, A4, C5, G4];
      bassFreq = bassPattern[this.step % 8] || 0;
      leadFreq = leadPattern[this.step % 16] || 0;
    } else if (track === "demon_lands" || track === "ancient_ruins") {
      // Dark / Mysterious
      const bassPattern = [A4 / 2, 0, C4 / 2, 0, F4 / 2, 0, E4 / 2, 0];
      const leadPattern = [A4, 0, C5, A4, Eb4, 0, F4, E4, A4, C5, E5, 0, D5, C5, B4, A4];
      bassFreq = bassPattern[this.step % 8] || 0;
      leadFreq = leadPattern[this.step % 16] || 0;
    } else {
      // Plains / Forest / Default Adventure
      const bassPattern = [C4 / 2, 0, G4 / 2, 0, A4 / 2, 0, E4 / 2, 0];
      const leadPattern = [C4, E4, G4, E4, A4, C5, A4, G4, E4, G4, C5, D5, E5, D5, C5, G4];
      bassFreq = bassPattern[this.step % 8] || 0;
      leadFreq = leadPattern[this.step % 16] || 0;
    }

    // Play Bass Note
    if (bassFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = track === "boss" ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(bassFreq, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.connect(gain); gain.connect(this.bgmGain);
      osc.start(now); osc.stop(now + 0.15);
    }

    // Play Lead Note
    if (leadFreq > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(leadFreq, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.005, now + 0.12);
      osc.connect(gain); gain.connect(this.bgmGain);
      osc.start(now); osc.stop(now + 0.12);
    }
  }
}

export const sound = new SoundEngine();
