// Progression: XP and levels, the free pass, missions, the daily chest,
// free coins, badges and the collection. All rules live here; screens only
// display the results and play the celebrations.

import * as store from './store.js';
import { ITEMS, item, PASS, MAX_LEVEL, xpToNext, DAILY, WEEKLY, FREE_COINS, FREE_EVERY_MS, RARITY } from './catalog.js';

// ---------------------------------------------------------------- dates
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function weekKey(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - dow);
  return dayKey(x);
}
export function msToMidnight(now = new Date()) {
  const m = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return m - now;
}

function seeded(str) {
  let h = 2166136261;
  for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function pickN(list, n, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

// ---------------------------------------------------------------- ownership
export const owns = (id) => store.profile().owned.includes(id);

/** Add an item. Returns true if it was new. */
function grantItem(id) {
  const p = store.profile();
  if (!item(id) || p.owned.includes(id)) return false;
  p.owned.push(id);
  if (!p.newItems.includes(id)) p.newItems.push(id);
  return true;
}

export function equip(id) {
  const it = item(id);
  const p = store.profile();
  if (!it || !owns(id)) return false;
  const slot = { char: 'char', acc: 'acc', back: 'back', table: 'table', frame: 'frame', title: 'title' }[it.kind];
  if (!slot) return false;
  p.equipped[slot] = id;
  store.save();
  return true;
}

export function markSeen(ids) {
  const p = store.profile();
  p.newItems = p.newItems.filter((x) => !ids.includes(x));
  store.save();
}

/** What other players need to draw you: character, accessory, frame, title. */
export function look() {
  const e = store.profile().equipped;
  return { char: e.char, acc: e.acc, frame: e.frame, title: e.title };
}

// ---------------------------------------------------------------- XP, levels, pass
export function levelProgress() {
  const p = store.profile();
  const need = xpToNext(p.level);
  let into = p.xp;
  for (let l = 1; l < p.level; l++) into -= xpToNext(l);
  return { level: p.level, into: Math.max(0, into), need, frac: Math.min(1, Math.max(0, into) / need) };
}

/** Total XP needed to reach a level. */
export function xpForLevel(level) {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
}

/** Reward description for a pass tier (0-based). */
export function passReward(tier) {
  return PASS[tier] || null;
}

/**
 * Add XP. Returns the level-ups that happened, each with the pass reward it
 * granted: [{ level, reward: { coins?, item?, also? , bonusCoins? } }].
 */
export function addXp(amount) {
  const p = store.profile();
  store.refreshShared();
  p.xp += Math.max(0, Math.floor(amount));
  const ups = [];
  while (p.xp >= xpForLevel(p.level + 1)) {
    p.level += 1;
    ups.push({ level: p.level, reward: grantPassTier(p.level - 1) });
  }
  store.save();
  return ups;
}

/** Grant pass tier `tier` (1-based, reached at level tier + 1) exactly once. */
function grantPassTier(tier) {
  const p = store.profile();
  if (tier <= p.passClaimed) return null;
  const r = PASS[tier - 1];
  let out;
  if (tier > PASS.length) {
    // Beyond the pass: a coin bonus every level.
    out = { coins: 500, bonus: true };
    p.coins += 500;
  } else {
    out = { ...r };
    if (r.coins) p.coins += r.coins;
    if (r.item) out.isNew = grantItem(r.item);
    for (const id of r.also || []) grantItem(id);
  }
  p.passClaimed = Math.max(p.passClaimed, tier);
  return out;
}

// ---------------------------------------------------------------- missions
/** Make sure today's and this week's missions exist. */
export function refreshMissions(now = new Date()) {
  const p = store.profile();
  const m = p.missions;
  const d = dayKey(now);
  const w = weekKey(now);
  let changed = false;
  if (m.dayKey !== d) {
    m.dayKey = d;
    m.daily = pickN(DAILY, 3, seeded(`d${d}${p.pid}`)).map((x) => ({ id: x.id, progress: 0, claimed: false }));
    changed = true;
  }
  if (m.weekKey !== w) {
    m.weekKey = w;
    m.weekly = pickN(WEEKLY, 3, seeded(`w${w}${p.pid}`)).map((x) => ({ id: x.id, progress: 0, claimed: false }));
    m.weekTypes = [];
    changed = true;
  }
  if (changed) store.save();
  return m;
}

const defOf = (id) => DAILY.find((x) => x.id === id) || WEEKLY.find((x) => x.id === id);

export function missionList() {
  const m = refreshMissions();
  const map = (x) => {
    const def = defOf(x.id);
    return { ...def, progress: Math.min(def.need, x.progress), claimed: x.claimed, done: x.progress >= def.need };
  };
  return { daily: m.daily.map(map), weekly: m.weekly.map(map) };
}

export const claimableCount = () => {
  const l = missionList();
  return l.daily.concat(l.weekly).filter((x) => x.done && !x.claimed).length;
};

/** Add to mission counters. Returns missions that just became complete. */
function bumpMissions(stat, amount) {
  const m = refreshMissions();
  const done = [];
  for (const x of m.daily.concat(m.weekly)) {
    const def = defOf(x.id);
    if (def.stat !== stat || x.claimed) continue;
    const before = x.progress;
    x.progress = Math.min(def.need, x.progress + amount);
    if (before < def.need && x.progress >= def.need) done.push(def);
  }
  return done;
}

export function claimMission(id) {
  const m = refreshMissions();
  const x = m.daily.concat(m.weekly).find((y) => y.id === id);
  const def = defOf(id);
  if (!x || !def || x.claimed || x.progress < def.need) return null;
  x.claimed = true;
  store.profile().coins += def.coins;
  store.save();
  const ups = addXp(def.xp);
  return { coins: def.coins, xp: def.xp, levelUps: ups };
}

// ---------------------------------------------------------------- free coins + chest
export function freeStatus(now = Date.now()) {
  const p = store.profile();
  const left = Math.max(0, p.lastFree + FREE_EVERY_MS - now);
  return { ready: left === 0, left, frac: 1 - left / FREE_EVERY_MS };
}

/** Claim the free coins once. Returns the amount, or 0 if not ready yet. */
export function claimFree(now = Date.now()) {
  store.refreshShared();
  if (!freeStatus(now).ready) return 0;
  const p = store.profile();
  p.lastFree = now;
  p.coins += FREE_COINS;
  store.save();
  return FREE_COINS;
}

export function chestReady(now = new Date()) {
  return store.profile().lastChestDay !== dayKey(now);
}

/**
 * Open today's chest. Returns { coins?, item?, xp } or null if already opened.
 * Chests give coins or a random item you don't own yet (rarer items are less
 * likely), plus a little XP.
 */
export function openChest(now = new Date(), rand = Math.random) {
  store.refreshShared();
  const p = store.profile();
  if (!chestReady(now)) return null;
  p.lastChestDay = dayKey(now);
  p.stats.chests += 1;
  const locked = ITEMS.filter((i) => i.kind !== 'badge' && !p.owned.includes(i.id));
  const weight = { common: 50, rare: 28, epic: 12, legendary: 3 };
  let reward;
  if (locked.length && rand() < 0.45) {
    const total = locked.reduce((a, i) => a + weight[i.rarity], 0);
    let r = rand() * total;
    let pick = locked[0];
    for (const i of locked) {
      r -= weight[i.rarity];
      if (r <= 0) {
        pick = i;
        break;
      }
    }
    grantItem(pick.id);
    reward = { item: pick.id, rarity: pick.rarity };
  } else {
    const coins = [400, 500, 600, 750, 1000, 1500, 2000][Math.floor(rand() * rand() * 7)];
    p.coins += coins;
    reward = { coins };
  }
  store.save();
  reward.xp = 50;
  reward.levelUps = addXp(50);
  return reward;
}

// ---------------------------------------------------------------- game events
/**
 * Called after every hand this player was dealt into.
 * @param {{ won:boolean, cat:number|null, showdown:boolean, allIn:boolean }} h
 * Returns { missions: completed[], badges: new[] } for toasts.
 */
export function onHand(h) {
  const p = store.profile();
  const s = p.stats;
  const missions = [];
  const badges = [];
  s.hands += 1;
  missions.push(...bumpMissions('hands', 1));
  if (h.won) {
    s.handsWon += 1;
    missions.push(...bumpMissions('handsWon', 1));
    if (h.showdown) {
      s.showdownWins += 1;
      missions.push(...bumpMissions('showdownWins', 1));
    }
    const cat = h.showdown ? h.cat : null;
    if (cat != null) {
      s.bestCat = Math.max(s.bestCat, cat);
      if (!s.cats.includes(cat)) s.cats.push(cat);
      const m = p.missions;
      m.weekTypes = m.weekTypes || [];
      if (!m.weekTypes.includes(cat)) {
        m.weekTypes.push(cat);
        missions.push(...bumpMissions('handTypes', 1));
      }
      if (cat >= 2) missions.push(...bumpMissions('twoPairWins', 1));
      if (cat >= 5) missions.push(...bumpMissions('flushWins', 1));
      if (cat >= 6) missions.push(...bumpMissions('fullHouseWins', 1));
      if (cat >= 2 && grantItem('badge:twopair')) badges.push('badge:twopair');
      if (cat === 6 && grantItem('badge:fullhouse')) badges.push('badge:fullhouse');
      if (cat === 7 && grantItem('badge:quads')) badges.push('badge:quads');
      if (cat === 8 && h.royal && grantItem('badge:royal')) badges.push('badge:royal');
    }
    if (h.allIn) {
      s.allinWins += 1;
      if (grantItem('badge:allin')) badges.push('badge:allin');
    }
  }
  store.save();
  return { missions, badges };
}

/**
 * Called once when this player's game ends (they won, busted or it finished).
 * Returns everything the results screen celebrates.
 */
export function onGame({ place, players, prize, stake, handsPlayed, handsWon }) {
  const p = store.profile();
  const s = p.stats;
  const missions = [];
  const badges = [];
  s.games += 1;
  missions.push(...bumpMissions('games', 1));
  const won = place === 1;
  if (won) {
    s.wins += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
    missions.push(...bumpMissions('wins', 1));
    if (grantItem('badge:firstwin')) badges.push('badge:firstwin');
    if (s.streak >= 3 && grantItem('badge:streak')) badges.push('badge:streak');
    if (s.wins >= 10 && grantItem('badge:wins10')) badges.push('badge:wins10');
  } else s.streak = 0;
  const net = prize - stake;
  if (net > 0) {
    s.coinsWon += net;
    missions.push(...bumpMissions('coinsWon', net));
  }
  const xp = {
    play: 30,
    hands: handsPlayed * 3,
    wins: handsWon * 8,
    place: place === 1 ? 80 + 20 * (players - 2) : place === 2 && players >= 3 ? 35 : 0,
  };
  const total = xp.play + xp.hands + xp.wins + xp.place;
  store.save();
  const before = levelProgress();
  const levelUps = addXp(total);
  return { xp, xpTotal: total, before, after: levelProgress(), levelUps, missions, badges };
}

// ---------------------------------------------------------------- collection summary
export function collectionStats() {
  const p = store.profile();
  const all = ITEMS.length;
  return { owned: p.owned.filter((id) => item(id)).length, total: all };
}

export { RARITY, MAX_LEVEL };
