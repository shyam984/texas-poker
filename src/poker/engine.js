// Texas Hold'em engine for a sit-and-go tournament.
//
// Pure game logic: no timers, no DOM, no networking. The host calls
// startHand() and act(); each returns a list of events describing exactly
// what happened, in order. Everything is validated here, so no player (human,
// bot or remote friend) can make an illegal move.
//
// Rules implemented
//   • 2–5 players, everyone starts with the same stack
//   • dealer button, small/big blind (heads-up: the dealer posts the small
//     blind and acts first before the flop, last after it)
//   • blinds rise every few hands
//   • check / bet / call / raise / fold / all-in, no-limit
//   • minimum raise = size of the previous full raise (at least one big blind);
//     a short all-in does not re-open raising for players who already acted
//   • uncalled bets are returned; side pots for all-ins; split pots with the
//     odd chip going to the first winner clockwise from the button
//   • busted players are eliminated in order; last player with chips wins

import { fullDeck, shuffle, rng } from './cards.js';
import { evaluate } from './eval.js';

export const START_STACK = 1000;
export const HANDS_PER_LEVEL = 5;
export const BLIND_LEVELS = [
  [10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300],
  [250, 500], [400, 800], [600, 1200], [1000, 2000], [1500, 3000], [2500, 5000],
];
export const STREETS = ['preflop', 'flop', 'turn', 'river'];

export function createTournament(names, { seed = 1, startStack = START_STACK, handsPerLevel = HANDS_PER_LEVEL } = {}) {
  const n = names.length;
  if (n < 2 || n > 5) throw new Error('2 to 5 players');
  return {
    n,
    players: names.map((name, i) => ({
      seat: i,
      name,
      chips: startStack,
      cards: [],
      bet: 0, // chips put in during the current street
      committed: 0, // chips put in during the whole hand
      folded: false,
      allIn: false,
      busted: false,
      inHand: false,
      acted: false,
      lastLevel: -1, // raise level this player last acted at (see canRaise)
    })),
    rand: rng(seed),
    handsPerLevel,
    handNo: 0,
    level: 0,
    dealer: -1,
    sbSeat: -1,
    bbSeat: -1,
    deck: [],
    board: [],
    street: null,
    currentBet: 0,
    minRaise: 0, // size of the last full raise
    raiseLevel: 0,
    toAct: -1,
    phase: 'idle', // 'idle' | 'betting' | 'handover' | 'over'
    finish: [], // seats in the order they were knocked out
    lastResult: null,
  };
}

export const blinds = (st) => {
  const [sb, bb] = BLIND_LEVELS[Math.min(st.level, BLIND_LEVELS.length - 1)];
  return { sb, bb };
};

const alive = (st) => st.players.filter((p) => !p.busted);
const nextSeat = (st, from, ok) => {
  for (let k = 1; k <= st.n; k++) {
    const s = (from + k) % st.n;
    if (ok(st.players[s])) return s;
  }
  return -1;
};
const inHand = (p) => p.inHand && !p.folded;
const canActP = (p) => p.inHand && !p.folded && !p.allIn;

/** Put chips from a player into the current street (capped at their stack). */
function put(st, p, amount) {
  const a = Math.min(amount, p.chips);
  p.chips -= a;
  p.bet += a;
  p.committed += a;
  if (p.chips === 0) p.allIn = true;
  return a;
}

export function startHand(st) {
  if (st.phase === 'over') throw new Error('Tournament is over');
  const ev = [];
  const live = alive(st);
  st.handNo += 1;
  if (st.handNo > 1 && (st.handNo - 1) % st.handsPerLevel === 0 && st.level < BLIND_LEVELS.length - 1) {
    st.level += 1;
    ev.push({ type: 'level', level: st.level, ...blinds(st) });
  }
  const { sb, bb } = blinds(st);
  for (const p of st.players) {
    Object.assign(p, { cards: [], bet: 0, committed: 0, folded: false, allIn: false, acted: false, lastLevel: -1, inHand: !p.busted });
  }
  st.board = [];
  st.history = []; // public action log for this hand (what everyone at the table saw)
  st.deck = shuffle(fullDeck(), st.rand);
  st.dealer = nextSeat(st, st.dealer < 0 ? st.n - 1 : st.dealer, (p) => !p.busted);
  if (live.length === 2) {
    st.sbSeat = st.dealer;
    st.bbSeat = nextSeat(st, st.dealer, (p) => !p.busted);
  } else {
    st.sbSeat = nextSeat(st, st.dealer, (p) => !p.busted);
    st.bbSeat = nextSeat(st, st.sbSeat, (p) => !p.busted);
  }
  st.street = 'preflop';
  st.phase = 'betting';
  st.lastResult = null;
  ev.push({ type: 'hand', handNo: st.handNo, dealer: st.dealer, sbSeat: st.sbSeat, bbSeat: st.bbSeat, sb, bb, level: st.level, stacks: st.players.map((p) => p.chips) });

  // Deal two cards each, one at a time, starting left of the dealer.
  const order = [];
  let s = st.dealer;
  for (let i = 0; i < live.length; i++) {
    s = nextSeat(st, s, (p) => p.inHand);
    order.push(s);
  }
  for (let round = 0; round < 2; round++) for (const seat of order) st.players[seat].cards.push(st.deck.pop());
  ev.push({ type: 'deal', order, cards: order.map((seat) => ({ seat, cards: st.players[seat].cards.slice() })) });

  const psb = st.players[st.sbSeat];
  const pbb = st.players[st.bbSeat];
  const a1 = put(st, psb, sb);
  ev.push({ type: 'blind', seat: st.sbSeat, amount: a1, kind: 'sb', bet: psb.bet, chips: psb.chips, allIn: psb.allIn });
  const a2 = put(st, pbb, bb);
  ev.push({ type: 'blind', seat: st.bbSeat, amount: a2, kind: 'bb', bet: pbb.bet, chips: pbb.chips, allIn: pbb.allIn });
  st.currentBet = Math.max(psb.bet, pbb.bet, bb);
  st.minRaise = bb;
  st.raiseLevel = 0;
  // First to act preflop: left of the big blind (heads-up that's the dealer/SB).
  st.toAct = st.bbSeat;
  advance(st, ev);
  return ev;
}

/** What the player to act may do. */
export function legalActions(st, seat) {
  const p = st.players[seat];
  if (st.phase !== 'betting' || st.toAct !== seat || !canActP(p)) return null;
  const toCall = Math.max(0, st.currentBet - p.bet);
  const maxTo = p.bet + p.chips; // all-in amount, as a "raise to" total
  // Raising is pointless if nobody else can still put chips in, and a player
  // who already acted may not re-raise after a short (incomplete) all-in raise.
  const othersCanAct = st.players.some((q) => q !== p && canActP(q));
  const mayRaise = p.lastLevel !== st.raiseLevel;
  let raise = null;
  if (mayRaise && othersCanAct && maxTo > st.currentBet) {
    const minTo = st.currentBet === 0 ? Math.min(maxTo, blinds(st).bb) : Math.min(maxTo, st.currentBet + st.minRaise);
    raise = { min: minTo, max: maxTo };
  }
  return {
    fold: true,
    check: toCall === 0,
    call: toCall > 0 ? Math.min(toCall, p.chips) : 0,
    callAllIn: toCall > 0 && toCall >= p.chips,
    raise, // { min, max } as "raise to" totals for this street
    isBet: st.currentBet === 0,
    toCall,
    currentBet: st.currentBet,
    pot: potTotal(st),
  };
}

export const potTotal = (st) => st.players.reduce((a, p) => a + p.committed, 0);

/**
 * Apply an action. `action` is { type: 'fold' | 'check' | 'call' | 'raise', to? }.
 * For 'raise' (also used for a first bet), `to` is the total this street; a
 * value at or above the player's stack means all-in. Returns events, or throws
 * on an illegal action.
 */
export function act(st, seat, action) {
  const la = legalActions(st, seat);
  if (!la) throw new Error('Not your turn');
  const p = st.players[seat];
  const ev = [];
  const type = action && action.type;
  if (type === 'fold') {
    p.folded = true;
    ev.push({ type: 'action', seat, action: 'fold', bet: p.bet, chips: p.chips });
  } else if (type === 'check') {
    if (!la.check) throw new Error('Cannot check');
    ev.push({ type: 'action', seat, action: 'check', bet: p.bet, chips: p.chips });
  } else if (type === 'call') {
    if (!la.call) throw new Error('Nothing to call');
    const a = put(st, p, la.call);
    ev.push({ type: 'action', seat, action: p.allIn ? 'allin' : 'call', amount: a, bet: p.bet, chips: p.chips, allIn: p.allIn });
  } else if (type === 'raise') {
    if (!la.raise) throw new Error('Cannot raise');
    let to = Math.floor(Number(action.to));
    if (!Number.isFinite(to)) throw new Error('Bad amount');
    if (to >= la.raise.max) to = la.raise.max;
    if (to < la.raise.min) throw new Error(`Minimum is ${la.raise.min}`);
    const wasBet = st.currentBet === 0;
    const increment = to - st.currentBet;
    put(st, p, to - p.bet);
    if (increment >= st.minRaise || (wasBet && to >= blinds(st).bb)) {
      // A full raise re-opens the betting for everyone.
      st.minRaise = Math.max(increment, blinds(st).bb);
      st.raiseLevel += 1;
    }
    st.currentBet = Math.max(st.currentBet, p.bet);
    for (const q of st.players) if (q !== p && canActP(q)) q.acted = false;
    ev.push({ type: 'action', seat, action: p.allIn ? 'allin' : wasBet ? 'bet' : 'raise', amount: to, bet: p.bet, chips: p.chips, allIn: p.allIn });
  } else {
    throw new Error('Unknown action');
  }
  p.acted = true;
  p.lastLevel = st.raiseLevel;
  const done = ev[ev.length - 1];
  st.history.push({ seat, street: st.street, action: done.action, to: p.bet });
  advance(st, ev);
  return ev;
}

/** Move to the next player, the next street, or the end of the hand. */
function advance(st, ev) {
  const live = st.players.filter(inHand);
  if (live.length === 1) return endHand(st, ev);
  const actors = st.players.filter(canActP);
  const roundDone =
    actors.length === 0 ||
    // one player left who can bet and has nothing to answer
    (actors.length === 1 && actors[0].bet >= st.currentBet) ||
    actors.every((p) => p.acted && p.bet === st.currentBet);
  if (!roundDone) {
    const next = nextSeat(st, st.toAct, (p) => canActP(p) && !(p.acted && p.bet === st.currentBet));
    st.toAct = next;
    ev.push({ type: 'turn', seat: next, ...turnInfo(st, next) });
    return;
  }
  // Street is over: gather bets.
  const collected = st.players.map((p) => p.bet);
  for (const p of st.players) p.bet = 0;
  ev.push({ type: 'collect', bets: collected, pot: potTotal(st) });
  st.currentBet = 0;
  st.minRaise = blinds(st).bb;
  st.raiseLevel = 0;
  for (const p of st.players) {
    p.acted = false;
    p.lastLevel = -1;
  }
  const canBet = st.players.filter(canActP).length;
  if (st.street === 'river') return endHand(st, ev);
  if (canBet <= 1) {
    // Nobody left to bet: show the hands and run out the board.
    ev.push({ type: 'reveal', hands: live.map((p) => ({ seat: p.seat, cards: p.cards.slice() })) });
    while (st.street !== 'river') dealStreet(st, ev);
    return endHand(st, ev);
  }
  dealStreet(st, ev);
  const first = nextSeat(st, st.dealer, canActP);
  st.toAct = first;
  ev.push({ type: 'turn', seat: first, ...turnInfo(st, first) });
}

function dealStreet(st, ev) {
  const i = STREETS.indexOf(st.street);
  st.street = STREETS[i + 1];
  st.deck.pop(); // burn
  const n = st.street === 'flop' ? 3 : 1;
  const cards = [];
  for (let k = 0; k < n; k++) cards.push(st.deck.pop());
  st.board.push(...cards);
  ev.push({ type: 'street', street: st.street, cards, board: st.board.slice() });
}

function turnInfo(st, seat) {
  const la = legalActions(st, seat);
  return { toCall: la ? la.toCall : 0, currentBet: st.currentBet, pot: potTotal(st), street: st.street };
}

/** Split the committed chips into a main pot and side pots. */
export function buildPots(players) {
  const levels = [...new Set(players.map((p) => p.committed).filter((c) => c > 0))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const L of levels) {
    let amount = 0;
    for (const p of players) amount += Math.max(0, Math.min(p.committed, L) - prev);
    const eligible = players.filter((p) => p.inHand && !p.folded && p.committed >= L).map((p) => p.seat);
    const last = pots[pots.length - 1];
    if (last && (eligible.length === 0 || String(last.eligible) === String(eligible))) last.amount += amount;
    else pots.push({ amount, eligible });
    prev = L;
  }
  return pots.filter((p) => p.amount > 0);
}

function endHand(st, ev) {
  st.phase = 'handover';
  st.toAct = -1;
  // Any bets still on the table (hand ended by folds mid-street).
  if (st.players.some((p) => p.bet > 0)) {
    const collected = st.players.map((p) => p.bet);
    for (const p of st.players) p.bet = 0;
    ev.push({ type: 'collect', bets: collected, pot: potTotal(st) });
  }
  const live = st.players.filter(inHand);
  const pots = buildPots(st.players);
  const results = [];
  const won = Array(st.n).fill(0);
  let hands = [];
  const showdown = live.length > 1;
  if (showdown) {
    hands = live.map((p) => {
      const e = evaluate(p.cards.concat(st.board));
      return { seat: p.seat, cards: p.cards.slice(), score: e.score, cat: e.cat, name: e.name, best: e.best };
    });
  }
  // Seats clockwise from the button get odd chips first.
  const order = [];
  for (let k = 1; k <= st.n; k++) order.push((st.dealer + k) % st.n);
  for (const pot of pots) {
    let winners;
    if (!showdown || pot.eligible.length === 1) {
      winners = pot.eligible.length ? pot.eligible.slice() : [live[0].seat];
    } else {
      const hs = hands.filter((h) => pot.eligible.includes(h.seat));
      const top = Math.max(...hs.map((h) => h.score));
      winners = hs.filter((h) => h.score === top).map((h) => h.seat);
    }
    winners.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const share = Math.floor(pot.amount / winners.length);
    let odd = pot.amount - share * winners.length;
    const shares = winners.map((w) => {
      const extra = odd > 0 ? 1 : 0;
      odd -= extra;
      return { seat: w, amount: share + extra };
    });
    for (const s of shares) {
      st.players[s.seat].chips += s.amount;
      won[s.seat] += s.amount;
    }
    // At a showdown, a pot only one player could win is an uncalled bet coming back.
    const returned = showdown && pot.eligible.length === 1;
    const h = showdown && winners.length ? hands.find((x) => x.seat === winners[0]) : null;
    results.push({ amount: pot.amount, eligible: pot.eligible, winners: shares, handName: h ? h.name : null, cat: h ? h.cat : null, best: h ? h.best : null, returned });
  }
  const invested = st.players.map((p) => p.committed);
  // Knock-outs: players who started this hand with chips and now have none.
  // Several at once are ranked by who had more chips at the start of the hand.
  const bust = st.players.filter((p) => p.inHand && !p.busted && p.chips === 0).sort((a, b) => a.committed - b.committed);
  const outs = [];
  for (const p of bust) {
    p.busted = true;
    st.finish.push(p.seat);
    outs.push({ seat: p.seat, place: st.n - st.finish.length + 1 });
  }
  st.lastResult = { showdown, hands, pots: results, won, invested };
  ev.push({
    type: 'result',
    showdown,
    hands: hands.map(({ seat, cards, cat, name, best }) => ({ seat, cards, cat, name, best })),
    pots: results,
    won,
    net: st.players.map((p, i) => won[i] - invested[i]),
    stacks: st.players.map((p) => p.chips),
    board: st.board.slice(),
  });
  for (const o of outs) ev.push({ type: 'bust', ...o });
  const remaining = alive(st);
  if (remaining.length <= 1) {
    st.phase = 'over';
    const winner = remaining[0] ? remaining[0].seat : st.finish[st.finish.length - 1];
    if (remaining[0]) st.finish.push(winner);
    const standings = st.finish.slice().reverse(); // 1st place first
    ev.push({ type: 'over', winner, standings });
  }
}

/** A player leaves (or times out for good): fold now and remove their chips. */
export function removePlayer(st, seat) {
  const p = st.players[seat];
  const ev = [];
  if (p.busted) return ev;
  if (st.phase === 'betting' && p.inHand && !p.folded) {
    if (st.toAct === seat) return act(st, seat, { type: 'fold' }).concat(markLeft(st, seat));
    p.folded = true;
    ev.push({ type: 'action', seat, action: 'fold', bet: p.bet, chips: p.chips });
    const e2 = [];
    advanceIfNeeded(st, e2);
    ev.push(...e2);
  }
  return ev.concat(markLeft(st, seat));
}

function advanceIfNeeded(st, ev) {
  // After an out-of-turn fold the hand may be decided.
  if (st.players.filter(inHand).length === 1) endHand(st, ev);
}

function markLeft(st, seat) {
  const p = st.players[seat];
  if (p.busted) return [];
  const ev = [];
  if (st.phase === 'betting' && p.inHand) {
    // Chips already in the pot stay there; the rest leave with the player.
    p.leftChips = p.chips;
  }
  p.chips = 0;
  p.busted = true;
  p.left = true;
  st.finish.push(seat);
  ev.push({ type: 'bust', seat, place: st.n - st.finish.length + 1, left: true });
  if (st.phase !== 'betting') {
    const remaining = alive(st);
    if (remaining.length <= 1 && st.phase !== 'over') {
      st.phase = 'over';
      const winner = remaining[0] ? remaining[0].seat : seat;
      if (remaining[0]) st.finish.push(winner);
      ev.push({ type: 'over', winner, standings: st.finish.slice().reverse() });
    }
  }
  return ev;
}

/** After a hand: is the tournament finished? (Also resolves leavers mid-hand.) */
export function checkOver(st) {
  if (st.phase === 'over') return [];
  const remaining = alive(st);
  if (remaining.length <= 1) {
    st.phase = 'over';
    const winner = remaining[0] ? remaining[0].seat : st.finish[st.finish.length - 1];
    if (remaining[0]) st.finish.push(winner);
    return [{ type: 'over', winner, standings: st.finish.slice().reverse() }];
  }
  return [];
}

/** What one seat is allowed to know (hole cards of others stay hidden). */
export function viewFor(st, seat) {
  return {
    n: st.n,
    handNo: st.handNo,
    level: st.level,
    ...blinds(st),
    dealer: st.dealer,
    sbSeat: st.sbSeat,
    bbSeat: st.bbSeat,
    board: st.board.slice(),
    street: st.street,
    phase: st.phase,
    toAct: st.toAct,
    currentBet: st.currentBet,
    pot: potTotal(st),
    history: (st.history || []).slice(),
    players: st.players.map((p) => ({
      seat: p.seat,
      chips: p.chips,
      bet: p.bet,
      committed: p.committed,
      folded: p.folded,
      allIn: p.allIn,
      busted: p.busted,
      inHand: p.inHand,
      cards: p.seat === seat ? p.cards.slice() : p.inHand && !p.busted ? [null, null] : [],
    })),
  };
}
