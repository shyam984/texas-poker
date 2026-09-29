// Hand evaluator: finds the best 5-card poker hand from 5, 6 or 7 cards.
//
// `evaluate(cards)` returns { score, cat, name, best }:
//   score – a single number; higher always wins, equal means a split pot
//   cat   – 0 High card … 8 Straight flush
//   name  – e.g. "Full House, Kings over Sevens"
//   best  – the five cards that make the hand (for highlighting)

import { rankOf, suitOf, RANK_NAME, RANK_PLURAL } from './cards.js';

export const CATEGORY = ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

// score = cat * 16^5 + five tie-break ranks packed base 16
const pack = (cat, ks) => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] || 0);
  return s;
};

/** Highest straight in a set of ranks (bitmask of rank bits 2..14), or 0. */
function straightHigh(mask) {
  if (mask & (1 << 14)) mask |= 1 << 1; // ace plays low for the wheel
  for (let hi = 14; hi >= 5; hi--) {
    const need = 0b11111 << (hi - 4);
    if ((mask & need) === need) return hi;
  }
  return 0;
}

/** Pick cards from `cards` matching the wanted ranks in order (each card used once). */
function pickByRanks(cards, ranks, suit = null) {
  const used = new Set();
  const out = [];
  for (const r of ranks) {
    const want = r === 1 ? 14 : r;
    const c = cards.find((x) => !used.has(x) && rankOf(x) === want && (!suit || suitOf(x) === suit));
    if (c) {
      used.add(c);
      out.push(c);
    }
  }
  return out;
}

const straightRanks = (hi) => [hi, hi - 1, hi - 2, hi - 3, hi - 4].map((r) => (r === 1 ? 14 : r));

export function evaluate(cards) {
  const counts = new Map();
  const bySuit = { s: [], h: [], d: [], c: [] };
  let mask = 0;
  for (const c of cards) {
    const r = rankOf(c);
    counts.set(r, (counts.get(r) || 0) + 1);
    bySuit[suitOf(c)].push(c);
    mask |= 1 << r;
  }

  // Straight flush / flush
  let flushSuit = null;
  for (const s of 'shdc') if (bySuit[s].length >= 5) flushSuit = s;
  if (flushSuit) {
    const fc = bySuit[flushSuit];
    let fmask = 0;
    for (const c of fc) fmask |= 1 << rankOf(c);
    const sf = straightHigh(fmask);
    if (sf) {
      const rs = straightRanks(sf);
      const name = sf === 14 ? 'Royal Flush' : `Straight Flush, ${RANK_NAME[sf]} high`;
      return { score: pack(8, [sf]), cat: 8, name, best: pickByRanks(fc, rs, flushSuit) };
    }
  }

  // Group ranks: sort by count desc, then rank desc
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (groups[0][1] === 4) {
    const q = groups[0][0];
    const kick = Math.max(...[...counts.keys()].filter((r) => r !== q));
    return { score: pack(7, [q, kick]), cat: 7, name: `Four of a Kind, ${RANK_PLURAL[q]}`, best: pickByRanks(cards, [q, q, q, q, kick]) };
  }

  if (groups[0][1] === 3) {
    const t = groups[0][0];
    // best pair from the remaining groups (another trip counts as a pair)
    const pairs = groups.slice(1).filter((g) => g[1] >= 2).map((g) => g[0]).sort((a, b) => b - a);
    if (pairs.length) {
      const p = pairs[0];
      return { score: pack(6, [t, p]), cat: 6, name: `Full House, ${RANK_PLURAL[t]} over ${RANK_PLURAL[p]}`, best: pickByRanks(cards, [t, t, t, p, p]) };
    }
  }

  if (flushSuit) {
    const fr = bySuit[flushSuit].map(rankOf).sort((a, b) => b - a).slice(0, 5);
    return { score: pack(5, fr), cat: 5, name: `Flush, ${RANK_NAME[fr[0]]} high`, best: pickByRanks(bySuit[flushSuit], fr, flushSuit) };
  }

  const st = straightHigh(mask);
  if (st) return { score: pack(4, [st]), cat: 4, name: `Straight, ${RANK_NAME[st]} high`, best: pickByRanks(cards, straightRanks(st)) };

  const desc = [...counts.keys()].sort((a, b) => b - a);
  if (groups[0][1] === 3) {
    const t = groups[0][0];
    const ks = desc.filter((r) => r !== t).slice(0, 2);
    return { score: pack(3, [t, ...ks]), cat: 3, name: `Three of a Kind, ${RANK_PLURAL[t]}`, best: pickByRanks(cards, [t, t, t, ...ks]) };
  }

  const pairRanks = groups.filter((g) => g[1] === 2).map((g) => g[0]).sort((a, b) => b - a);
  if (pairRanks.length >= 2) {
    const [a, b] = pairRanks;
    const k = desc.filter((r) => r !== a && r !== b)[0];
    return { score: pack(2, [a, b, k]), cat: 2, name: `Two Pair, ${RANK_PLURAL[a]} and ${RANK_PLURAL[b]}`, best: pickByRanks(cards, [a, a, b, b, k]) };
  }
  if (pairRanks.length === 1) {
    const p = pairRanks[0];
    const ks = desc.filter((r) => r !== p).slice(0, 3);
    return { score: pack(1, [p, ...ks]), cat: 1, name: `Pair of ${RANK_PLURAL[p]}`, best: pickByRanks(cards, [p, p, ...ks]) };
  }
  const hs = desc.slice(0, 5);
  return { score: pack(0, hs), cat: 0, name: `High Card, ${RANK_NAME[hs[0]]}`, best: pickByRanks(cards, hs) };
}

// ---------------------------------------------------------------- fast path
// Integer cards for simulations: rank * 4 + suit (rank 2..14, suit 0..3).
// fastScore() gives exactly the same score as evaluate() but without
// allocating, so bots can run thousands of simulated hands quickly.

const SUIT_IDX = { s: 0, h: 1, d: 2, c: 3 };
export const toInt = (c) => (rankOf(c) << 2) | SUIT_IDX[suitOf(c)];

const cnt = new Uint8Array(15);
const sm = new Int32Array(4);
const sc = new Uint8Array(4);

function topBits(mask, k, out) {
  let n = 0;
  for (let r = 14; r >= 2 && n < k; r--) if (mask & (1 << r)) out[n++] = r;
  return n;
}
const tmp = [0, 0, 0, 0, 0];

export function fastScore(cards, len) {
  cnt.fill(0);
  sm.fill(0);
  sc.fill(0);
  let mask = 0;
  for (let i = 0; i < len; i++) {
    const r = cards[i] >> 2;
    const su = cards[i] & 3;
    cnt[r]++;
    sm[su] |= 1 << r;
    sc[su]++;
    mask |= 1 << r;
  }
  let fs = -1;
  for (let su = 0; su < 4; su++) if (sc[su] >= 5) fs = su;
  if (fs >= 0) {
    const sf = straightHigh(sm[fs]);
    if (sf) return pack(8, [sf]);
  }
  let quad = 0;
  let t1 = 0;
  let t2 = 0;
  let p1 = 0;
  let p2 = 0;
  let p3 = 0;
  let singles = 0;
  for (let r = 14; r >= 2; r--) {
    const c = cnt[r];
    if (c === 4) quad = r;
    else if (c === 3) {
      if (!t1) t1 = r;
      else if (!t2) t2 = r;
    } else if (c === 2) {
      if (!p1) p1 = r;
      else if (!p2) p2 = r;
      else if (!p3) p3 = r;
    } else if (c === 1) singles |= 1 << r;
  }
  if (quad) {
    let k = 0;
    for (let r = 14; r >= 2; r--) if (r !== quad && cnt[r]) { k = r; break; }
    return pack(7, [quad, k]);
  }
  if (t1 && (t2 || p1)) return pack(6, [t1, Math.max(t2, p1)]);
  if (fs >= 0) {
    topBits(sm[fs], 5, tmp);
    return pack(5, tmp);
  }
  const st = straightHigh(mask);
  if (st) return pack(4, [st]);
  if (t1) {
    const n = topBits(singles, 2, tmp);
    return pack(3, [t1, tmp[0], n > 1 ? tmp[1] : 0]);
  }
  if (p1 && p2) {
    let k = 0;
    for (let r = 14; r >= 2; r--) if ((singles & (1 << r)) || r === p3) { k = r; break; }
    return pack(2, [p1, p2, k]);
  }
  if (p1) {
    topBits(singles, 3, tmp);
    return pack(1, [p1, tmp[0], tmp[1], tmp[2]]);
  }
  topBits(singles, 5, tmp);
  return pack(0, tmp);
}
