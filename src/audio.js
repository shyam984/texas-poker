// Sound effects and background music, all synthesised with the Web Audio API
// (no audio files to download).
//
// Signal chain:  sfx voices ─► sfxBus ─┐
//                music (pre-recorded songs) ─► musicBus ─┴─► compressor ─► speakers
//
// Browsers only allow audio after the player taps or presses a key, so the
// AudioContext is created inside the first input event and never before.

let ctx = null;
let sfxBus = null;
let musicBus = null;
let noise = null;

const vol = { sfxOn: true, musicOn: true, sfx: 0.8, music: 0.5, externalMute: false };

const sfxLevel = () => (vol.sfxOn && !vol.externalMute ? vol.sfx : 0);
const musicLevel = () => (vol.musicOn && !vol.externalMute ? vol.music * 0.8 : 0);

function applyLevels() {
  if (!ctx) return;
  const t = ctx.currentTime;
  sfxBus.gain.setTargetAtTime(sfxLevel(), t, 0.03);
  musicBus.gain.setTargetAtTime(musicLevel(), t, 0.08);
}

export function setSoundEnabled(on) {
  vol.sfxOn = !!on;
  applyLevels();
}

export function setMusicEnabled(on) {
  vol.musicOn = !!on;
  applyLevels();
  applyMusic();
}

/** Volumes from 0 to 1. */
export function setVolumes({ sfx, music }) {
  if (Number.isFinite(sfx)) vol.sfx = Math.max(0, Math.min(1, sfx));
  if (Number.isFinite(music)) vol.music = Math.max(0, Math.min(1, music));
  applyLevels();
  applyMusic();
}

/** Muting requested by the hosting site (e.g. CrazyGames' mute setting). */
export function setExternalMute(m) {
  vol.externalMute = !!m;
  applyLevels();
  applyMusic();
}

/** Browsers only allow sound after a tap/click; this runs on any input. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.gain.value = sfxLevel();
      sfxBus.connect(comp);
      musicBus = ctx.createGain();
      musicBus.gain.value = musicLevel();
      musicBus.connect(comp);
      const len = ctx.sampleRate;
      noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state !== 'running' && !document.hidden) ctx.resume().then(applyMusic, () => {});
    applyMusic();
  } catch {
    ctx = null;
  }
}

for (const t of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
  window.addEventListener(t, unlockAudio, { capture: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else ctx.resume().catch(() => {});
});

const ok = () => ctx && sfxLevel() > 0 && ctx.state === 'running';

function tone(f, dur, { type = 'sine', vol: v = 0.2, delay = 0, f2 = null, attack = 0.005 } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(dur, { vol: v = 0.2, freq = 2000, freq2 = null, q = 1, delay = 0, type = 'bandpass' } = {}) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}

const semi = (base, s) => base * 2 ** (s / 12);

const SFX = {
  click() {
    tone(1100, 0.045, { type: 'triangle', vol: 0.08 });
    tone(700, 0.05, { type: 'sine', vol: 0.05, delay: 0.01 });
  },
  nav() {
    hiss(0.12, { vol: 0.06, freq: 1800, freq2: 4200, q: 0.8 });
    tone(520, 0.08, { type: 'sine', vol: 0.05, f2: 780 });
  },
  deal(i = 0) {
    hiss(0.05, { vol: 0.14, freq: 2800 + (i % 5) * 180, q: 1.1 });
  },
  flip() {
    hiss(0.06, { vol: 0.16, freq: 3600, freq2: 2000, q: 1.2 });
    tone(640, 0.05, { type: 'triangle', vol: 0.05, delay: 0.02 });
  },
  land() {
    tone(150, 0.07, { type: 'sine', vol: 0.12, f2: 80 });
    hiss(0.04, { vol: 0.1, freq: 1500, q: 1 });
  },
  chip(n = 1) {
    // Clay chips clacking together.
    const k = Math.min(5, n);
    for (let i = 0; i < k; i++) {
      tone(2600 + Math.random() * 900, 0.05, { type: 'sine', vol: 0.05, delay: i * 0.045 });
      hiss(0.03, { vol: 0.08, freq: 5200, q: 3, delay: i * 0.045 });
    }
  },
  chipsSlide() {
    hiss(0.3, { vol: 0.12, freq: 2400, freq2: 5200, q: 0.9 });
    for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 1400, 0.05, { type: 'sine', vol: 0.03, delay: 0.1 + i * 0.03 });
  },
  check() {
    // Two knocks on the table.
    tone(180, 0.06, { type: 'sine', vol: 0.22, f2: 110 });
    hiss(0.03, { vol: 0.1, freq: 900, q: 2 });
    tone(180, 0.06, { type: 'sine', vol: 0.2, f2: 110, delay: 0.12 });
    hiss(0.03, { vol: 0.1, freq: 900, q: 2, delay: 0.12 });
  },
  fold() {
    hiss(0.18, { vol: 0.12, freq: 3000, freq2: 900, q: 0.7 });
  },
  call() {
    SFX.chip(2);
  },
  raise() {
    SFX.chip(4);
    tone(660, 0.12, { type: 'triangle', vol: 0.06, delay: 0.1 });
    tone(880, 0.16, { type: 'triangle', vol: 0.06, delay: 0.18 });
  },
  allin() {
    tone(110, 0.5, { type: 'sine', vol: 0.3, f2: 60 });
    [0, 4, 7, 12].forEach((s, i) => tone(semi(330, s), 0.2, { type: 'sawtooth', vol: 0.035, delay: 0.05 + i * 0.06 }));
    hiss(0.5, { vol: 0.14, freq: 600, freq2: 3000, q: 0.6, delay: 0.05 });
    SFX.chip(5);
  },
  turn() {
    tone(660, 0.1, { type: 'sine', vol: 0.09 });
    tone(990, 0.18, { type: 'sine', vol: 0.08, delay: 0.09 });
  },
  tick() {
    tone(1250, 0.035, { type: 'triangle', vol: 0.05 });
  },
  winHand() {
    [0, 4, 7, 12].forEach((s, i) => tone(semi(523, s), 0.22, { type: 'triangle', vol: 0.08, delay: i * 0.07 }));
    SFX.chipsSlide();
  },
  win() {
    [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone(semi(523, s), 0.26, { type: 'triangle', vol: 0.08, delay: i * 0.08 }));
    [0, 4, 7].forEach((s) => tone(semi(262, s), 1.1, { type: 'sine', vol: 0.07, delay: 0.64 }));
  },
  lose() {
    [0, -1, -2, -3].forEach((s, i) => tone(semi(392, s), i === 3 ? 0.8 : 0.28, { type: 'triangle', vol: 0.08, delay: i * 0.3 }));
  },
  coins() {
    for (let i = 0; i < 8; i++) tone(1800 + Math.random() * 1400, 0.1, { type: 'sine', vol: 0.045, delay: i * 0.05 });
  },
  shake() {
    tone(90 + Math.random() * 30, 0.12, { type: 'triangle', vol: 0.14 });
    hiss(0.08, { vol: 0.08, freq: 700, q: 1 });
  },
  chestOpen() {
    tone(200, 0.4, { type: 'sine', vol: 0.2, f2: 90 });
    hiss(0.5, { vol: 0.18, freq: 800, freq2: 5000, q: 0.5 });
    [0, 4, 7, 11, 14].forEach((s, i) => tone(semi(659, s), 0.4, { type: 'triangle', vol: 0.07, delay: 0.15 + i * 0.06 }));
  },
  reward() {
    [0, 7, 12, 16].forEach((s, i) => tone(semi(784, s), 0.3, { type: 'sine', vol: 0.08, delay: i * 0.06 }));
  },
  levelUp() {
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(semi(392, s), 0.24, { type: 'triangle', vol: 0.08, delay: i * 0.06 }));
    tone(semi(392, 24), 0.9, { type: 'sine', vol: 0.07, delay: 0.45 });
  },
  xpTick() {
    tone(1400 + Math.random() * 400, 0.04, { type: 'sine', vol: 0.035 });
  },
  pop() {
    tone(600, 0.09, { type: 'sine', vol: 0.1, f2: 1150 });
  },
  deny() {
    tone(210, 0.12, { type: 'triangle', vol: 0.09 });
    tone(160, 0.14, { type: 'triangle', vol: 0.07, delay: 0.07 });
  },
  join() {
    [0, 7].forEach((s, i) => tone(semi(587, s), 0.16, { type: 'triangle', vol: 0.08, delay: i * 0.08 }));
  },
  leave() {
    [7, 4, 0].forEach((s, i) => tone(semi(440, s), 0.16, { type: 'triangle', vol: 0.07, delay: i * 0.07 }));
  },
};

export function sfx(name, arg) {
  if (!ok() || !SFX[name]) return;
  try {
    SFX[name](arg);
  } catch {
    /* ignore */
  }
}

export function buzz(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ music
// Four relaxing songs, composed here in code and "recorded" once into an
// audio buffer with an OfflineAudioContext. Playing a finished buffer costs
// the phone almost nothing, so the music never stutters while cards and
// chips are flying around.
//
//   menus:  'lofi'    Cosy Corner    – lo-fi keys, brushed beat, vinyl crackle
//           'hammock' Sunny Hammock  – marimba, warm pads, whistled tune
//   table:  'lounge'  Velvet Lounge  – jazzy Rhodes, walking bass, brushes
//           'bossa'   Beach Bossa    – bossa guitar, rim clicks, flute
//
// Each song loops twice, then glides into the next one of its set.

const RATE = 22050; // plenty for soft, mellow music and light on memory
const LOOPS_PER_SONG = 2;
const XFADE = 2.2; // seconds

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
let R = null; // the offline "studio" while a song is being recorded

/** One note. hold: sustain (pads/bass) instead of a plucked decay. */
function mt(f, t, dur, { type = 'sine', v = 0.1, f2 = null, attack = 0.012, hold = false, vib = 0, echo = false, detune = 0, dest = null } = {}) {
  const c = R.c;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (detune) o.detune.value = detune;
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  if (vib) {
    const l = c.createOscillator();
    const lg = c.createGain();
    l.frequency.value = 5;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(f * vib, t + Math.min(0.5, dur * 0.6));
    l.connect(lg);
    lg.connect(o.frequency);
    l.start(t);
    l.stop(t + dur + 0.1);
  }
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  if (hold) {
    g.gain.linearRampToValueAtTime(v * 0.65, t + Math.max(attack + 0.01, dur * 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(dest || R.tone);
  if (echo) g.connect(R.echo);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** A burst of filtered noise: hats, shakers, brushes, rim clicks, crackle.
 *  Hits with the same filter share one filter node, which keeps recording fast. */
function mn(t, v, { type = 'highpass', freq = 7000, dur = 0.05, q = 0.7, attack = 0 } = {}) {
  const c = R.c;
  const key = `${type}${freq}/${q}`;
  let f = R.filters.get(key);
  if (!f) {
    f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.connect(R.drums);
    R.filters.set(key, f);
  }
  const s = c.createBufferSource();
  s.buffer = R.noise;
  const g = c.createGain();
  if (attack) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + attack);
  } else g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(g);
  g.connect(f);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.03);
}

const kick = (t, v = 0.18, f = 90) => mt(f, t, 0.24, { v, f2: 38, attack: 0.004, dest: R.drums });

/** Soft electric piano: sine body plus a quiet octave shimmer. */
function keys(n, t, dur, v, echo = false) {
  mt(midi(n), t, dur, { v, attack: 0.02, echo });
  mt(midi(n + 12), t, dur * 0.45, { type: 'triangle', v: v * 0.16, attack: 0.01 });
}

/** How long a melody note rings: until the next note (max 4 eighths). */
function melLen(row, k) {
  let n = 1;
  while (n < 4 && k + n < row.length && !row[k + n]) n++;
  return n;
}

// ---- Cosy Corner (menus): lo-fi, swung, soft keys, crackle
const LOFI_CH = [
  { root: 41, notes: [57, 60, 64, 69] }, // Fmaj7
  { root: 40, notes: [55, 59, 62, 67] }, // Em7
  { root: 38, notes: [53, 57, 60, 65] }, // Dm7
  { root: 36, notes: [55, 59, 64, 67] }, // Cmaj7
];
const LOFI_MEL = [
  [0, 0, 76, 0, 79, 0, 76, 74], [0, 0, 74, 0, 71, 0, 0, 0], [0, 0, 72, 74, 77, 0, 74, 0], [72, 0, 0, 0, 0, 0, 67, 0],
  [0, 0, 81, 0, 79, 0, 76, 0], [79, 0, 76, 74, 0, 0, 0, 0], [0, 0, 77, 0, 76, 74, 72, 0], [74, 0, 0, 0, 72, 0, 0, 0],
  [0, 0, 72, 0, 74, 0, 76, 0], [79, 0, 0, 0, 76, 0, 74, 0], [0, 0, 77, 0, 76, 0, 74, 72], [71, 0, 0, 0, 67, 0, 0, 0],
  [0, 0, 76, 0, 0, 79, 81, 0], [79, 0, 76, 0, 74, 0, 0, 0], [0, 72, 74, 0, 77, 0, 76, 0], [72, 0, 0, 0, 0, 0, 0, 0],
];
function lofiStep(i, t, S) {
  const bar = Math.floor(i / 16);
  const k = i % 16;
  const ch = LOFI_CH[bar % 4];
  const tt = t + (k % 2 === 1 ? S * 0.22 : 0); // swing
  if (k === 0 || k === 6) ch.notes.forEach((n, j) => keys(n, tt + j * 0.018, k === 0 ? S * 7 : S * 5, k === 0 ? 0.042 : 0.028));
  if (k === 0) mt(midi(ch.root), tt, S * 6, { type: 'triangle', v: 0.16, attack: 0.02, hold: true });
  if (k === 10) mt(midi(ch.root + 7), tt, S * 4, { type: 'triangle', v: 0.11, attack: 0.02, hold: true });
  if (k === 0 || k === 7 || k === 10) kick(tt, 0.19);
  if (k === 4 || k === 12) mn(tt, 0.055, { type: 'bandpass', freq: 1800, dur: 0.08 });
  if (k % 2 === 0 || Math.random() < 0.3) mn(tt, 0.011 + (k % 4 === 2 ? 0.009 : 0), { freq: 8000, dur: 0.04 });
  const row = LOFI_MEL[bar];
  const note = row[k >> 1];
  if (k % 2 === 0 && note) keys(note, tt, S * 2 * melLen(row, k >> 1) + S, 0.05, true);
  if (Math.random() < 0.35) mn(t + Math.random() * S, 0.007 + Math.random() * 0.012, { type: 'bandpass', freq: 3000, dur: 0.012 });
}

// ---- Sunny Hammock (menus): marimba arpeggios, warm pad, whistled tune
const HAM_CH = [
  { root: 36, notes: [55, 59, 62, 64] }, // Cmaj9
  { root: 45, notes: [55, 59, 60, 64] }, // Am9
  { root: 41, notes: [55, 57, 60, 64] }, // Fmaj9
  { root: 43, notes: [55, 59, 62, 64] }, // G6
];
const HAM_CH_B = [HAM_CH[2], HAM_CH[3], { root: 40, notes: [55, 59, 62, 67] }, HAM_CH[1]]; // F G Em Am
const HAM_MEL = [
  [0, 0, 0, 0, 76, 0, 79, 0], [81, 0, 0, 0, 79, 0, 76, 0], [0, 0, 72, 0, 74, 0, 76, 0], [74, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 79, 0, 81, 0], [84, 0, 0, 0, 81, 0, 79, 0], [0, 0, 76, 0, 79, 0, 74, 0], [72, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 72, 0, 76, 0], [79, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 81, 0, 79, 0, 76, 0], [79, 0, 0, 0, 76, 0, 74, 0], [0, 0, 72, 0, 74, 0, 0, 76], [72, 0, 0, 0, 0, 0, 0, 0],
];
const HAM_ARP = [0, 2, 1, 3, 2, 1, 3, 2];
function hammockStep(i, t, S) {
  const bar = Math.floor(i / 16);
  const k = i % 16;
  const ch = (bar >= 8 && bar < 12 ? HAM_CH_B : HAM_CH)[bar % 4];
  if (k === 0) {
    ch.notes.forEach((n) => {
      mt(midi(n), t, S * 17, { v: 0.018, attack: 0.7, hold: true });
      mt(midi(n), t, S * 17, { type: 'triangle', v: 0.01, attack: 0.9, hold: true, detune: 7 });
    });
    mt(midi(ch.root), t, S * 8, { type: 'triangle', v: 0.14, attack: 0.03, hold: true });
  }
  if (k === 8) mt(midi(ch.root + 7), t, S * 7, { type: 'triangle', v: 0.09, attack: 0.03, hold: true });
  if (k % 2 === 0) {
    const n = ch.notes[HAM_ARP[k >> 1]] + 12;
    mt(midi(n), t, 0.45, { v: 0.045, attack: 0.004, echo: k % 4 === 0 });
    mt(midi(n) * 4, t, 0.07, { v: 0.006, attack: 0.002 }); // mallet tick
  }
  if (k === 0 || k === 8) kick(t, 0.14, 80);
  mn(t + (k % 2 ? S * 0.12 : 0), k % 4 === 2 ? 0.016 : 0.008, { freq: 6500, dur: 0.05 });
  const row = HAM_MEL[bar];
  const note = row[k >> 1];
  if (k % 2 === 0 && note) mt(midi(note), t, S * 2 * melLen(row, k >> 1) + S, { v: 0.045, attack: 0.06, vib: 0.008, echo: true });
}

// ---- Velvet Lounge (table): swung Rhodes, walking bass, brushes, vibes
const C = (root, third, notes) => ({ root, third, notes });
const LNG_CH = [
  C(38, 3, [53, 57, 60, 64]), C(43, 4, [53, 59, 64, 69]), C(36, 4, [52, 55, 59, 62]), C(36, 4, [52, 55, 59, 62]), // Dm9 G13 Cmaj9 Cmaj9
  C(41, 4, [52, 57, 60, 64]), C(46, 4, [53, 56, 62, 67]), C(40, 3, [55, 59, 62, 64]), C(45, 4, [55, 61, 64, 66]), // Fmaj7 Bb13 Em7 A7
  C(38, 3, [53, 57, 60, 64]), C(43, 4, [53, 59, 64, 69]), C(36, 4, [52, 55, 59, 62]), C(45, 4, [55, 61, 64, 66]), // Dm9 G13 Cmaj9 A7
  C(38, 3, [53, 57, 60, 64]), C(43, 4, [53, 59, 64, 69]), C(36, 4, [52, 55, 59, 62]), C(36, 4, [52, 55, 59, 62]), // Dm9 G13 Cmaj9 Cmaj9
];
const LNG_MEL = [
  [0, 0, 69, 72, 76, 0, 74, 0], [71, 0, 0, 0, 0, 0, 0, 0], [0, 0, 67, 71, 74, 0, 76, 0], [79, 0, 0, 0, 76, 0, 0, 0],
  [0, 0, 72, 0, 76, 0, 77, 0], [79, 0, 0, 0, 77, 0, 74, 0], [0, 0, 74, 76, 79, 0, 76, 0], [73, 0, 0, 0, 76, 0, 0, 0],
  [0, 0, 77, 0, 76, 0, 74, 0], [76, 0, 74, 0, 71, 0, 0, 0], [0, 0, 72, 0, 76, 0, 79, 0], [81, 0, 0, 0, 79, 0, 76, 0],
  [0, 0, 74, 0, 77, 0, 81, 0], [79, 0, 0, 0, 77, 0, 76, 0], [74, 0, 0, 0, 72, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0],
];
function loungeStep(i, t, S) {
  const bar = Math.floor(i / 16);
  const k = i % 16;
  const ch = LNG_CH[bar];
  const next = LNG_CH[(bar + 1) % LNG_CH.length];
  const tt = t + (k % 4 === 2 ? S * 0.34 : 0); // swung eighths
  // Rhodes comping
  if (k === 0) ch.notes.forEach((n, j) => keys(n, tt + j * 0.02, S * 6, 0.034));
  if (k === 6 || (k === 14 && bar % 2 === 1)) ch.notes.forEach((n, j) => keys(n, tt + j * 0.015, S * 2.5, 0.024));
  // Walking bass: root, third, fifth, then a step into the next chord
  if (k % 4 === 0) {
    const beat = k / 4;
    const n = [ch.root, ch.root + ch.third, ch.root + 7, next.root + (next.root > ch.root ? -1 : 1)][beat];
    mt(midi(n), t, S * 3.6, { type: 'triangle', v: 0.15, attack: 0.015, hold: true });
    mt(midi(n + 12), t, S * 0.8, { v: 0.02, attack: 0.005 }); // pluck
  }
  // Brushes: ride pattern, swish on 2 and 4, feathered kick
  if (k === 0 || k === 4 || k === 6 || k === 8 || k === 12 || k === 14) mn(tt, k % 4 === 2 ? 0.012 : 0.018, { type: 'bandpass', freq: 7200, q: 1.5, dur: 0.14 });
  if (k === 4 || k === 12) mn(t, 0.03, { type: 'bandpass', freq: 1300, q: 0.6, dur: 0.2, attack: 0.05 });
  if (k === 0 || k === 8) kick(t, 0.09, 70);
  // Vibes melody
  const row = LNG_MEL[bar];
  const note = row[k >> 1];
  if (k % 2 === 0 && note) {
    mt(midi(note), tt, S * 2 * melLen(row, k >> 1) + S * 1.5, { v: 0.05, attack: 0.006, vib: 0.004, echo: true });
    mt(midi(note) * 4, tt, 0.12, { v: 0.006, attack: 0.003 });
  }
}

// ---- Beach Bossa (table): nylon-guitar comping, rim clicks, shaker, flute
const BOS_CH = [
  C(45, 3, [55, 59, 60, 64]), C(38, 4, [54, 57, 60, 64]), C(43, 4, [54, 59, 62, 67]), C(36, 4, [52, 55, 59, 64]), // Am9 D9 Gmaj7 Cmaj7
  C(42, 3, [52, 57, 60, 64]), C(47, 4, [51, 57, 59, 63]), C(40, 3, [55, 59, 62, 66]), C(40, 3, [55, 59, 62, 66]), // F#m7b5 B7 Em9 Em9
];
const BOS_CH_END = [BOS_CH[0], BOS_CH[5]]; // Am9 B7 turnaround on the second pass
const BOS_MEL = [
  [0, 0, 76, 0, 79, 0, 76, 0], [74, 0, 0, 0, 76, 0, 72, 0], [71, 0, 0, 0, 0, 0, 74, 0], [76, 0, 0, 0, 79, 0, 0, 0],
  [0, 0, 81, 0, 79, 0, 76, 0], [75, 0, 0, 0, 78, 0, 0, 0], [79, 0, 0, 0, 78, 0, 76, 0], [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 72, 0, 76, 0, 79, 0], [81, 0, 0, 0, 78, 0, 76, 0], [74, 0, 78, 0, 79, 0, 0, 0], [76, 0, 0, 0, 72, 0, 0, 0],
  [0, 0, 69, 0, 72, 0, 76, 0], [75, 0, 0, 0, 71, 0, 0, 0], [72, 0, 0, 0, 76, 0, 0, 0], [75, 0, 0, 0, 0, 0, 0, 0],
];
const BOS_HITS = [[0, 3, 6, 10, 12], [2, 6, 8, 12, 14]];
function bossaStep(i, t, S) {
  const bar = Math.floor(i / 16);
  const k = i % 16;
  const ch = bar >= 14 ? BOS_CH_END[bar - 14] : BOS_CH[bar % 8];
  // Bass: root and fifth, the classic bossa bounce
  if (k === 0 || k === 8) mt(midi(ch.root), t, S * 5, { type: 'triangle', v: 0.15, attack: 0.012, hold: true });
  if (k === 6 || k === 14) mt(midi(ch.root + 7), t, S * 1.8, { type: 'triangle', v: 0.11, attack: 0.012 });
  // Guitar comping on the syncopations
  if (BOS_HITS[bar % 2].includes(k)) {
    ch.notes.forEach((n, j) => {
      mt(midi(n), t + j * 0.012, 0.34, { type: 'triangle', v: 0.027, attack: 0.004 });
    });
    mn(t, 0.035, { type: 'bandpass', freq: 2300, q: 5, dur: 0.03 }); // rim click
  }
  if (k === 0 || k === 8) kick(t, 0.11, 75);
  mn(t, k % 2 === 0 ? 0.013 : 0.007, { freq: 6000, dur: 0.045, attack: 0.008 }); // shaker
  const row = BOS_MEL[bar];
  const note = row[k >> 1];
  if (k % 2 === 0 && note) mt(midi(note), t, S * 2 * melLen(row, k >> 1) + S, { v: 0.045, attack: 0.05, vib: 0.007, echo: true });
}

const SONGS = {
  lofi: { title: 'Cosy Corner', bpm: 76, bars: 16, cutoff: 2300, fn: lofiStep },
  hammock: { title: 'Sunny Hammock', bpm: 68, bars: 16, cutoff: 3200, fn: hammockStep },
  lounge: { title: 'Velvet Lounge', bpm: 84, bars: 16, cutoff: 3400, fn: loungeStep },
  bossa: { title: 'Beach Bossa', bpm: 88, bars: 16, cutoff: 3600, fn: bossaStep },
};
const SETS = { home: ['lofi', 'hammock'], table: ['lounge', 'bossa'] };

const recorded = new Map(); // song -> Promise<AudioBuffer>

const idleMoment = () =>
  new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 120 }) : setTimeout(r, 0)));

/** Record a song into an audio buffer (once), with seamless looping. */
function record(name) {
  if (recorded.has(name)) return recorded.get(name);
  const p = (async () => {
    const song = SONGS[name];
    const S = 60 / song.bpm / 4;
    const steps = song.bars * 16;
    const loopSec = steps * S;
    const tail = 3.5;
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    let c;
    try {
      c = new OAC(1, Math.ceil((loopSec + tail) * RATE), RATE);
    } catch {
      c = new OAC(1, Math.ceil((loopSec + tail) * 44100), 44100);
    }
    const master = c.createGain();
    master.connect(c.destination);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = song.cutoff;
    lp.Q.value = 0.5;
    lp.connect(master);
    const tone = c.createGain();
    tone.connect(lp);
    const drums = c.createGain();
    drums.connect(master);
    // A soft dotted-eighth echo for a dreamy, spacious feel.
    const echo = c.createGain();
    echo.gain.value = 0.28;
    const dl = c.createDelay(2);
    dl.delayTime.value = S * 3;
    const fbf = c.createBiquadFilter();
    fbf.type = 'lowpass';
    fbf.frequency.value = 2200;
    const fb = c.createGain();
    fb.gain.value = 0.38;
    echo.connect(dl);
    dl.connect(fbf);
    fbf.connect(fb);
    fb.connect(dl);
    fbf.connect(lp);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Write the song a bar at a time in idle moments, so the game never
    // hitches while a song is being prepared.
    const studio = { c, tone, drums, echo, noise: nb, filters: new Map() };
    for (let bar = 0; bar < song.bars; bar++) {
      await idleMoment();
      R = studio;
      try {
        for (let i = bar * 16; i < (bar + 1) * 16; i++) song.fn(i, 0.02 + i * S, S);
      } finally {
        R = null;
      }
    }
    const buf = await new Promise((res, rej) => {
      c.oncomplete = (e) => res(e.renderedBuffer);
      const r = c.startRendering();
      if (r && r.then) r.then(res, rej);
    });
    // Fold the tail (echoes, ringing notes) back onto the start so the loop is seamless,
    // and even out loudness between songs.
    const sr = buf.sampleRate;
    const L = Math.round(loopSec * sr);
    const src = buf.getChannelData(0);
    const out = ctx.createBuffer(1, L, sr);
    const dst = out.getChannelData(0);
    dst.set(src.subarray(0, L));
    for (let i = 0; i < src.length - L && i < L; i++) dst[i] += src[L + i];
    let sum = 0;
    for (let i = 0; i < L; i++) sum += dst[i] * dst[i];
    const rms = Math.sqrt(sum / L) || 1;
    const k = 0.12 / rms;
    // Soft-limit the few loud peaks so every song sits at the same volume.
    for (let i = 0; i < L; i++) {
      const x = dst[i] * k;
      const a = Math.abs(x);
      dst[i] = a < 0.7 ? x : Math.sign(x) * (0.7 + 0.25 * Math.tanh((a - 0.7) / 0.25));
    }
    return out;
  })();
  recorded.set(name, p);
  p.catch(() => recorded.delete(name));
  return p;
}

let wantSet = null; // 'home' | 'table' | null — what the game asked for
let playingSet = null;
let current = null; // { name, src, gain }
let songIdx = { home: 0, table: Math.floor(Math.random() * 2) };
let rotateTimer = 0;
let token = 0;
const listeners = new Set();

function fadeOut(cur, sec = XFADE) {
  if (!cur) return;
  const t = ctx.currentTime;
  cur.gain.gain.cancelScheduledValues(t);
  cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
  cur.gain.gain.linearRampToValueAtTime(0.0001, t + sec);
  try {
    cur.src.stop(t + sec + 0.05);
  } catch {
    /* already stopped */
  }
}

function startSong(name) {
  const my = ++token;
  clearTimeout(rotateTimer);
  record(name).then(
    (buf) => {
      if (my !== token || !playingSet) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(1, t + (current ? XFADE : 1.2));
      src.connect(gain);
      gain.connect(musicBus);
      src.start(t);
      fadeOut(current);
      current = { name, src, gain };
      for (const fn of listeners) fn(nowPlaying());
      rotateTimer = setTimeout(() => nextSong(true), Math.max(10, buf.duration * LOOPS_PER_SONG - XFADE) * 1000);
      // Record the other songs quietly in the background, one at a time.
      setTimeout(warmUp, 1500);
    },
    () => {},
  );
}

function warmUp() {
  const todo = Object.keys(SONGS).filter((n) => !recorded.has(n));
  if (!todo.length || !ctx) return;
  record(todo[0]).then(() => setTimeout(warmUp, 800), () => {});
}

/** Skip to the next song in the current set (the Settings "Next song" button). */
export function nextSong(auto = false) {
  if (!playingSet) return;
  const set = SETS[playingSet];
  songIdx[playingSet] = (songIdx[playingSet] + 1) % set.length;
  if (!auto) clearTimeout(rotateTimer);
  startSong(set[songIdx[playingSet]]);
}

function applyMusic() {
  if (!ctx) return;
  const want = wantSet && musicLevel() > 0 ? wantSet : null;
  if (want === playingSet) return;
  playingSet = want;
  if (!want) {
    token++;
    clearTimeout(rotateTimer);
    fadeOut(current, 0.6);
    current = null;
    for (const fn of listeners) fn(null);
    return;
  }
  startSong(SETS[want][songIdx[want]]);
}

/**
 * Choose the background music: 'home' (menus), 'table' (in a game), or
 * false for silence. (true is accepted as 'table' for older callers.)
 */
export function playMusic(which) {
  wantSet = which === true ? 'table' : which || null;
  applyMusic();
}

/** Lower the music briefly for big moments. */
export function duckMusic(sec = 2.5) {
  if (!ctx || !musicBus) return;
  const t = ctx.currentTime;
  const full = musicLevel();
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.setValueAtTime(musicBus.gain.value, t);
  musicBus.gain.linearRampToValueAtTime(full * 0.3, t + 0.1);
  musicBus.gain.linearRampToValueAtTime(full, t + sec);
}

/** { set, song, title } of what's playing, or null. */
export function nowPlaying() {
  return current && playingSet ? { set: playingSet, song: current.name, title: SONGS[current.name].title } : null;
}

export function onMusicChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** For tests: which set of songs is playing ('home' | 'table' | null). */
export const musicPlaying = () => playingSet;

/** For tests: record every song and report its length and levels. */
export async function __songStats() {
  const out = [];
  for (const name of Object.keys(SONGS)) {
    const t0 = performance.now();
    const had = recorded.has(name);
    const buf = await record(name);
    const d = buf.getChannelData(0);
    let peak = 0;
    let sum = 0;
    let bad = false;
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      if (!Number.isFinite(x)) bad = true;
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
    }
    out.push({ name, sec: buf.duration, ms: had ? -1 : Math.round(performance.now() - t0), rms: Math.sqrt(sum / d.length), peak, seam: Math.abs(d[d.length - 1] - d[0]), ok: !bad, rate: buf.sampleRate });
  }
  return out;
}
export const __record = (n) => record(n);
