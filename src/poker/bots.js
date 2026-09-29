// Computer players.
//
// Bots only ever see what a human in their seat would see: their own two
// cards, the board, the chips and the betting. Hand strength comes from
// simulating random opponent hands (Monte Carlo), never from peeking.
//
// Difficulty changes how well a bot judges its chances; personality changes
// how it likes to play.

import { fullDeck } from './cards.js';
import { fastScore, toInt } from './eval.js';

export const LEVELS = {
  rookie: { label: 'Rookie', sims: 70, noise: 0.2, respect: 0, potOdds: 0.3, position: 0, ranges: 0 },
  regular: { label: 'Regular', sims: 160, noise: 0.09, respect: 0.12, potOdds: 0.75, position: 0.02, ranges: 0 },
  expert: { label: 'Expert', sims: 320, noise: 0.04, respect: 0.12, potOdds: 1, position: 0.04, ranges: 0.7 },
  master: { label: 'Master', sims: 520, noise: 0.01, respect: 0.1, potOdds: 1, position: 0.05, ranges: 1 },
};

// ---------------------------------------------------------------- preflop hand ranking
// Every two-card starting hand gets a percentile (0 = aces, 1 = worst) using
// the Chen formula. Stronger bots use it to guess what an opponent who raised
// or called is likely to hold (a "range"), from the betting alone.
function chen(r1, r2, suited) {
  const hi = Math.max(r1, r2);
  const lo = Math.min(r1, r2);
  const base = { 14: 10, 13: 8, 12: 7, 11: 6 }[hi] || hi / 2;
  if (r1 === r2) return Math.max(5, base * 2);
  let s = base + (suited ? 2 : 0);
  const gap = hi - lo - 1;
  s -= [0, 1, 2, 4][Math.min(gap, 3)] + (gap >= 4 ? 1 : 0);
  if (gap <= 1 && hi < 12) s += 1;
  return s;
}
const PCT = new Float32Array(64 * 64);
{
  const combos = [];
  for (let a = 0; a < 52; a++) for (let b = a + 1; b < 52; b++) {
    const A = FULL_INT(a);
    const B = FULL_INT(b);
    combos.push([A, B, chen(A >> 2, B >> 2, (A & 3) === (B & 3))]);
  }
  combos.sort((x, y) => y[2] - x[2]);
  combos.forEach((c, i) => {
    const p = i / combos.length;
    PCT[(c[0] & 63) * 64 + (c[1] & 63)] = p;
    PCT[(c[1] & 63) * 64 + (c[0] & 63)] = p;
  });
}
function FULL_INT(i) {
  return ((Math.floor(i / 4) + 2) << 2) | (i % 4);
}
const pct = (a, b) => PCT[(a & 63) * 64 + (b & 63)];

/** How wide an opponent's range probably is, judged from their actions this hand. */
function rangeOf(view, seat) {
  let r = 1;
  for (const h of view.history || []) {
    if (h.seat !== seat) continue;
    if (h.street === 'preflop') {
      if (h.action === 'raise' || h.action === 'bet' || h.action === 'allin') r = Math.min(r, h.to > view.bb * 6 ? 0.12 : 0.25);
      else if (h.action === 'call') r = Math.min(r, 0.55);
    } else if (h.action === 'raise' || h.action === 'allin') r = Math.min(r, 0.3);
    else if (h.action === 'bet' || h.action === 'call') r = Math.min(r, 0.5);
  }
  return r;
}

export const PERSONAS = {
  balanced: { label: 'Balanced', raise: 0.66, bet: 0.54, bluff: 0.07, loose: 0.02, size: 0.65, slowplay: 0.12 },
  aggressive: { label: 'Aggressive', raise: 0.57, bet: 0.46, bluff: 0.16, loose: 0.03, size: 0.85, slowplay: 0.04 },
  conservative: { label: 'Conservative', raise: 0.75, bet: 0.62, bluff: 0.02, loose: -0.04, size: 0.55, slowplay: 0.1 },
  risky: { label: 'Risky', raise: 0.6, bet: 0.5, bluff: 0.11, loose: 0.1, size: 1.1, slowplay: 0.05 },
  bluffer: { label: 'Bluffer', raise: 0.63, bet: 0.5, bluff: 0.3, loose: 0.03, size: 0.75, slowplay: 0.06 },
};

const FULL = fullDeck().map(toInt);
const buf = new Int32Array(7);

/**
 * Chance (0..1) that `hole` wins against `opponents` random hands, given the
 * board so far. Ties count as a share.
 */
export function equity(hole, board, opponents, sims, rand = Math.random, ranges = null) {
  if (opponents < 1) return 1;
  const known = new Set(hole.concat(board).map(toInt));
  const deck = FULL.filter((c) => !known.has(c));
  const h = hole.map(toInt);
  const b = board.map(toInt);
  const need = 5 - b.length;
  let score = 0;
  for (let it = 0; it < sims; it++) {
    // Partial shuffle: draw what we need from the front of the deck.
    const draw = opponents * 2 + need;
    for (let i = 0; i < draw; i++) {
      const j = i + Math.floor(rand() * (deck.length - i));
      const t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    if (ranges) {
      // Re-draw an opponent's hand a few times until it fits their likely range.
      for (let o = 0; o < opponents; o++) {
        const lim = ranges[o];
        if (lim >= 1) continue;
        for (let tries = 0; tries < 12 && pct(deck[o * 2], deck[o * 2 + 1]) > lim; tries++) {
          for (const k of [o * 2, o * 2 + 1]) {
            const j = draw + Math.floor(rand() * (deck.length - draw));
            const t = deck[k];
            deck[k] = deck[j];
            deck[j] = t;
          }
        }
      }
    }
    const full = b.concat(deck.slice(opponents * 2, opponents * 2 + need));
    for (let i = 0; i < 5; i++) buf[i] = full[i];
    buf[5] = h[0];
    buf[6] = h[1];
    const mine = fastScore(buf, 7);
    let best = 0;
    let ties = 0;
    let lost = false;
    for (let o = 0; o < opponents; o++) {
      buf[5] = deck[o * 2];
      buf[6] = deck[o * 2 + 1];
      const s = fastScore(buf, 7);
      if (s > mine) {
        lost = true;
        break;
      }
      if (s === mine) ties++;
      best = Math.max(best, s);
    }
    if (!lost) score += ties ? 1 / (ties + 1) : 1;
  }
  return score / sims;
}

const roundTo = (x, step) => Math.max(step, Math.round(x / step) * step);

/**
 * Decide an action.
 * @param view  what this seat can see (engine.viewFor)
 * @param seat  bot's seat
 * @param la    engine.legalActions for this seat
 * @param bot   { level, persona }
 * @returns { type, to? }
 */
export function decide(view, seat, la, bot, rand = Math.random) {
  const L = LEVELS[bot.level] || LEVELS.regular;
  const P = PERSONAS[bot.persona] || PERSONAS.balanced;
  const me = view.players[seat];
  const opponents = view.players.filter((p) => p.seat !== seat && p.inHand && !p.folded).length;
  const pot = view.pot; // includes all bets so far
  const bb = view.bb;
  const stackBB = (me.chips + me.bet) / bb;

  // Better bots narrow each opponent's likely hands from how they have bet.
  let ranges = null;
  if (L.ranges) {
    ranges = view.players
      .filter((p) => p.seat !== seat && p.inHand && !p.folded)
      .map((p) => 1 - (1 - rangeOf(view, p.seat)) * L.ranges);
  }
  let eq = equity(me.cards, view.board, opponents, L.sims, rand, ranges);
  // Skill: weaker bots misjudge their hands more.
  eq += (rand() * 2 - 1) * L.noise;
  // Position: acting last after the flop is worth a little.
  const lastToAct = isLate(view, seat);
  if (lastToAct) eq += L.position;
  // Respect big bets: a large bet usually means a strong hand.
  if (la.toCall > 0 && L.respect) {
    const ratio = Math.min(1.5, la.toCall / Math.max(1, pot - la.toCall));
    eq -= L.respect * ratio * 0.5 * (1 - eq);
  }
  eq = Math.max(0, Math.min(1, eq + P.loose));

  // Fair share: with more opponents even decent hands win less often.
  const share = 1 / (opponents + 1);
  const strength = (eq - share) / (1 - share); // 0 = average, 1 = unbeatable
  const potOdds = la.toCall > 0 ? la.toCall / (pot + la.toCall) : 0;

  const sizeFor = (frac) => {
    if (!la.raise) return null;
    const base = la.isBet ? pot * frac : la.currentBet + (pot + la.toCall) * frac;
    let to = roundTo(base, bb >= 100 ? 50 : 5);
    to = Math.max(la.raise.min, Math.min(la.raise.max, to));
    if (to > la.raise.max * 0.8) to = la.raise.max; // don't leave crumbs behind
    return to;
  };

  // Short stack: push or fold before the flop.
  if (view.street === 'preflop' && stackBB <= 10 && la.raise) {
    const pushLine = 0.12 - (P.loose + (bot.persona === 'risky' ? 0.06 : 0));
    if (strength > pushLine) return { type: 'raise', to: la.raise.max };
    if (la.check) return { type: 'check' };
    return la.toCall <= bb / 2 ? { type: 'call' } : { type: 'fold' };
  }

  const r = rand();
  if (la.toCall === 0) {
    // Nobody has bet: bet for value, sometimes bluff, otherwise check.
    if (strength > P.raise + 0.12 && rand() < P.slowplay) return { type: 'check' }; // trap
    if (strength > P.bet - 0.25 && la.raise) {
      const frac = P.size * (0.45 + strength * 0.6);
      return { type: 'raise', to: sizeFor(frac) };
    }
    if (la.raise && r < P.bluff * (opponents <= 2 ? 1.3 : 0.6) && view.street !== 'preflop') return { type: 'raise', to: sizeFor(P.size * 0.6) };
    return { type: 'check' };
  }

  // Facing a bet.
  const callLine = potOdds * L.potOdds + (1 - L.potOdds) * 0.28;
  if (eq < callLine - 0.02) {
    // Not getting the right price. Occasionally bluff-raise, otherwise fold.
    if (la.raise && r < P.bluff * 0.35 && la.toCall < pot * 0.5 && view.street !== 'river') return { type: 'raise', to: sizeFor(P.size) };
    if (bot.level === 'rookie' && la.toCall <= bb * 2 && r < 0.5) return { type: 'call' }; // rookies love to see a flop
    return { type: 'fold' };
  }
  if (strength > P.raise - 0.3 + (la.toCall > pot * 0.6 ? 0.12 : 0) && la.raise) {
    if (strength > 0.85 && rand() < 0.35) return { type: 'raise', to: la.raise.max };
    return { type: 'raise', to: sizeFor(P.size * (0.6 + strength * 0.5)) };
  }
  return { type: 'call' };
}

function isLate(view, seat) {
  // Last to act post-flop = closest seat before the dealer button (or the button).
  const live = view.players.filter((p) => p.inHand && !p.folded && !p.allIn).map((p) => p.seat);
  if (!live.length) return false;
  let last = live[0];
  let best = -1;
  for (const s of live) {
    const d = (s - view.dealer - 1 + view.n) % view.n;
    if (d > best) {
      best = d;
      last = s;
    }
  }
  return last === seat;
}

/** Pick a random personality for a bot. */
export function randomPersona(rand = Math.random) {
  const ks = Object.keys(PERSONAS);
  return ks[Math.floor(rand() * ks.length)];
}
