// The player's saved profile: coins, progress, collection and settings.
// Saved in this browser (localStorage). Other tabs' changes are picked up
// before coins change, so two open tabs can't double-spend or double-claim.

import { START_COINS, STARTERS } from './catalog.js';

const KEY = 'texaspoker.profile.v1';
const listeners = new Set();
let data = null;
let storage = null;
try {
  storage = typeof localStorage !== 'undefined' ? localStorage : null;
} catch {
  storage = null;
}

function newPid() {
  try {
    if (crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

const NAMES = ['Ace', 'Blaze', 'Chip', 'Dash', 'Echo', 'Flash', 'Goldie', 'Jazz', 'Kiwi', 'Lucky', 'Mango', 'Nova', 'Pixel', 'Rocket', 'Sunny', 'Tango', 'Ziggy'];

export function defaults(now = Date.now()) {
  return {
    v: 1,
    pid: newPid(),
    name: NAMES[Math.floor(Math.random() * NAMES.length)] + Math.floor(10 + Math.random() * 90),
    onboarded: false,
    coins: 0, // the welcome gift is added during onboarding
    xp: 0,
    level: 1,
    passClaimed: 0, // highest pass tier already granted
    lastFree: now - 5 * 60 * 1000, // first free coins are ready straight away
    lastChestDay: '',
    owned: STARTERS.slice(),
    equipped: { char: 'char:fox', acc: 'acc:none', back: 'back:classic', table: 'table:classic', frame: 'frame:none', title: 'title:rookie' },
    newItems: [],
    missions: { dayKey: '', daily: [], weekKey: '', weekly: [] },
    stats: { hands: 0, handsWon: 0, games: 0, wins: 0, streak: 0, bestStreak: 0, coinsWon: 0, bestCat: -1, cats: [], chests: 0, showdownWins: 0, allinWins: 0 },
    settings: { sound: true, music: true, sfxVol: 0.8, musicVol: 0.5, vibrate: true, fast: false, soloStake: 100, soloPlayers: 4, soloLevel: 'regular' },
  };
}

export function load() {
  let raw = null;
  try {
    raw = storage ? JSON.parse(storage.getItem(KEY) || 'null') : null;
  } catch {
    raw = null;
  }
  const d = defaults();
  if (raw && typeof raw === 'object' && raw.v === 1) {
    data = {
      ...d,
      ...raw,
      equipped: { ...d.equipped, ...(raw.equipped || {}) },
      stats: { ...d.stats, ...(raw.stats || {}) },
      settings: { ...d.settings, ...(raw.settings || {}) },
      missions: { ...d.missions, ...(raw.missions || {}) },
    };
  } else data = d;
  // Repair anything odd (hand-edited or corrupted storage).
  if (!Number.isFinite(data.coins) || data.coins < 0) data.coins = 0;
  data.coins = Math.floor(data.coins);
  if (!Number.isFinite(data.xp) || data.xp < 0) data.xp = 0;
  if (!Array.isArray(data.owned)) data.owned = STARTERS.slice();
  for (const s of STARTERS) if (!data.owned.includes(s)) data.owned.push(s);
  if (!Number.isFinite(data.lastFree) || data.lastFree > Date.now()) data.lastFree = Date.now();
  save();
  return data;
}

export function save() {
  try {
    if (storage) storage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode or full: keep going in memory */
  }
  for (const fn of listeners) fn(data);
}

export const profile = () => data;
export const onChange = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/** Re-read the parts other tabs may have changed. */
export function refreshShared() {
  try {
    const raw = storage ? JSON.parse(storage.getItem(KEY) || 'null') : null;
    if (!raw) return;
    if (Number.isFinite(raw.coins)) data.coins = Math.max(0, Math.floor(raw.coins));
    if (Number.isFinite(raw.lastFree)) data.lastFree = Math.max(data.lastFree, raw.lastFree);
    if (typeof raw.lastChestDay === 'string' && raw.lastChestDay > data.lastChestDay) data.lastChestDay = raw.lastChestDay;
    if (Array.isArray(raw.owned)) for (const id of raw.owned) if (!data.owned.includes(id)) data.owned.push(id);
    if (Number.isFinite(raw.xp) && raw.xp > data.xp) {
      data.xp = raw.xp;
      data.level = Math.max(data.level, raw.level || 1);
      data.passClaimed = Math.max(data.passClaimed, raw.passClaimed || 0);
    }
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !data) return;
    refreshShared();
    for (const fn of listeners) fn(data);
  });
}

export function addCoins(n) {
  refreshShared();
  data.coins = Math.max(0, Math.floor(data.coins + n));
  save();
  return data.coins;
}

/** Take coins if the player has enough. Returns false (and changes nothing) if not. */
export function spendCoins(n) {
  refreshShared();
  if (data.coins < n) return false;
  data.coins -= n;
  save();
  return true;
}

export function setName(name) {
  data.name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 14) || data.name;
  save();
}

export function setSetting(key, value) {
  data.settings[key] = value;
  save();
}

/** For tests: use a different storage object. */
export function _useStorage(s) {
  storage = s;
}
