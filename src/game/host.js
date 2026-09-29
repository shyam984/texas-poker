// The game host runs the authoritative tournament: it owns the engine, deals
// cards, times turns, moves the computer players and sends each seat only
// what that seat is allowed to know (your own hole cards, never anyone
// else's until a showdown). Solo games and friend rooms use the same host.

import { createTournament, startHand, act, legalActions, removePlayer, viewFor, blinds, HANDS_PER_LEVEL, START_STACK } from '../poker/engine.js';
import { decide } from '../poker/bots.js';
import { randomSeed } from '../poker/cards.js';
import { prizes as prizeTable } from '../profile/catalog.js';

export const TURN_SECONDS = 20;
const AWAY_ACT_MS = 1500; // a disconnected player checks/folds after this long
const AWAY_LIMIT_MS = 90000; // ...and leaves the game after this long

// How long the table needs to show each kind of event before the next decision.
const PACE = { hand: 500, deal: 180, blind: 350, action: 550, collect: 550, street: 900, reveal: 900, result: 1800, showdownExtra: 1900, bust: 900, level: 900 };

export class PokerHost {
  /**
   * @param {object} o
   * @param {Array<{name, look, kind: 'human'|'bot', bot?: {level, persona}}>} o.seats
   * @param {number} o.stake coins each player pays in
   * @param {(seat:number, ev:object) => void} o.deliver
   */
  constructor({ seats, stake, deliver, speed = 1, seed = randomSeed(), ready = null, paceMin = 1 }) {
    this.seats = seats.map((s) => ({ ...s, status: s.kind === 'bot' ? 'bot' : 'here', awaySince: 0 }));
    this.stake = stake;
    this.deliver = deliver;
    this.speed = speed;
    this.seed = seed;
    this.prizeList = prizeTable(stake, seats.length);
    this.paid = Array(seats.length).fill(null); // prize each seat has been told about
    this.timers = new Set();
    this.turnTimer = 0;
    this.turnId = 0;
    this.deadline = 0;
    this.dead = false;
    this.st = null;
    // Smooth pacing: `ready()` resolves once the local table has finished
    // animating, so the next turn starts exactly when the last move has been
    // shown (no rushing to catch up, no dead pauses). `paceMin` keeps a share
    // of the fixed timings as a floor, for friends' slower phones in rooms.
    this.ready = ready;
    this.paceMin = paceMin;
  }

  /** Run `fn` once the table has shown everything (with a short breath). */
  afterShown(wait, fn, beat = 150) {
    if (!this.ready) return this.later(wait, fn);
    let done = false;
    const go = () => {
      if (done || this.dead) return;
      done = true;
      fn();
    };
    this.later(wait * this.paceMin, () => Promise.resolve(this.ready()).then(() => this.later(beat, go), go));
    this.later(Math.max(wait * 3, 7000), go); // safety net (e.g. a hidden browser tab)
  }

  later(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.dead) fn();
    }, ms / this.speed);
    this.timers.add(id);
    return id;
  }

  destroy() {
    this.dead = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  publicSeats() {
    return this.seats.map(({ name, look, kind, status, bot }) => ({ name, look, kind, status, botLevel: bot ? bot.level : null }));
  }

  start() {
    this.st = createTournament(this.seats.map((s) => s.name), { seed: this.seed });
    for (let i = 0; i < this.seats.length; i++) {
      this.deliver(i, { type: 'start', you: i, seats: this.publicSeats(), stake: this.stake, prizes: this.prizeList, startStack: START_STACK, handsPerLevel: HANDS_PER_LEVEL });
    }
    this.afterShown(900, () => this.nextHand(), 250);
  }

  // ---------------------------------------------------------------- flow
  nextHand() {
    this.nextPending = false;
    if (this.st.phase === 'over' || this.st.phase === 'betting') return;
    this.send(startHand(this.st));
  }

  /** Send events to every seat (hiding private cards) and schedule what comes next. */
  send(events) {
    let wait = 0;
    let after = null;
    for (const ev of events) {
      if (ev.type === 'turn') {
        after = ev;
        continue;
      }
      if (ev.type === 'bust') this.attachPrize(ev);
      if (ev.type === 'over') this.attachFinal(ev);
      for (let i = 0; i < this.seats.length; i++) this.deliver(i, this.forSeat(ev, i));
      wait += this.paceOf(ev);
    }
    if (after) this.afterShown(wait, () => this.announceTurn(after.seat));
    else if (this.st.phase === 'handover' && !this.nextPending) {
      this.nextPending = true;
      this.afterShown(wait + 600, () => this.nextHand(), 650);
    }
  }

  paceOf(ev) {
    if (ev.type === 'deal') return PACE.deal * ev.order.length * 2 + 300;
    if (ev.type === 'street') return PACE.street + (ev.cards.length - 1) * 180;
    if (ev.type === 'result') return PACE.result + (ev.showdown ? PACE.showdownExtra : 0) + (ev.pots.length - 1) * 700;
    return PACE[ev.type] || 300;
  }

  /** Each seat sees its own hole cards only. */
  forSeat(ev, seat) {
    if (ev.type === 'deal') {
      const mine = ev.cards.find((c) => c.seat === seat);
      return { type: 'deal', order: ev.order, cards: mine ? mine.cards : null };
    }
    return ev;
  }

  attachPrize(ev) {
    const seat = this.seats[ev.seat];
    const idx = ev.place - 1;
    // Anyone who walked out forfeits their prize (it goes to the winner).
    const prize = seat.status === 'left' ? 0 : this.prizeList[idx] || 0;
    ev.prize = prize;
    this.paid[ev.seat] = prize;
  }

  attachFinal(ev) {
    const pool = this.stake * this.seats.length;
    const others = this.paid.reduce((a, p, i) => (i === ev.winner ? a : a + (p || 0)), 0);
    const winnerPrize = pool - others;
    this.paid[ev.winner] = winnerPrize;
    ev.prizes = this.paid.slice();
    ev.stake = this.stake;
  }

  announceTurn(seat) {
    const st = this.st;
    if (!st || st.phase !== 'betting' || st.toAct !== seat) return;
    this.turnId += 1;
    const s = this.seats[seat];
    const human = s.kind === 'human' && s.status === 'here';
    const la = legalActions(st, seat);
    this.deadline = human ? Date.now() + (TURN_SECONDS * 1000) / this.speed : 0;
    const base = { type: 'turn', seat, turnId: this.turnId, seconds: human ? TURN_SECONDS / this.speed : 0, pot: la.pot, toCall: la.toCall, currentBet: la.currentBet, bb: blinds(st).bb };
    for (let i = 0; i < this.seats.length; i++) this.deliver(i, i === seat ? { ...base, legal: la } : base);
    clearTimeout(this.turnTimer);
    const id = this.turnId;
    if (s.kind === 'bot') {
      // Natural, brisk thinking: quick on easy spots, a beat longer facing a
      // big bet. Once every human has folded, the hand plays out faster.
      let think = 380 + Math.random() * 620 + (la.toCall > la.pot * 0.5 ? 450 : 0);
      const humanIn = this.seats.some((x, i) => x.kind === 'human' && x.status === 'here' && !st.players[i].folded && !st.players[i].busted);
      if (!humanIn) think *= 0.55;
      this.turnTimer = this.later(think, () => this.botMove(seat, id));
    } else if (s.status !== 'here') {
      this.turnTimer = this.later(AWAY_ACT_MS, () => this.autoAct(seat, id));
    } else {
      this.turnTimer = this.later(TURN_SECONDS * 1000 + 300, () => this.autoAct(seat, id));
    }
  }

  botMove(seat, id) {
    if (id !== this.turnId || this.st.toAct !== seat || this.st.phase !== 'betting') return;
    const la = legalActions(this.st, seat);
    const d = decide(viewFor(this.st, seat), seat, la, this.seats[seat].bot || { level: 'regular', persona: 'balanced' });
    this.apply(seat, d);
  }

  /** Out of time (or disconnected): check if free, otherwise fold. */
  autoAct(seat, id) {
    if (id !== this.turnId || this.st.toAct !== seat || this.st.phase !== 'betting') return;
    const la = legalActions(this.st, seat);
    const s = this.seats[seat];
    if (s.status === 'away' && s.awaySince && Date.now() - s.awaySince > AWAY_LIMIT_MS) return this.leave(seat);
    this.apply(seat, la.check ? { type: 'check' } : { type: 'fold' }, true);
  }

  /**
   * A human seat wants to act. `turnId` must match the current turn so a
   * double-tap or a late network message can never act twice.
   * Returns { ok } or { ok: false, reason }.
   */
  submit(seat, action, turnId) {
    const st = this.st;
    if (!st || st.phase !== 'betting') return { ok: false, reason: 'No hand in play' };
    if (st.toAct !== seat) return { ok: false, reason: 'Not your turn' };
    if (turnId !== this.turnId) return { ok: false, reason: 'That turn is over' };
    if (this.seats[seat].kind !== 'human') return { ok: false, reason: 'Not a player seat' };
    const a = sanitize(action);
    if (!a) return { ok: false, reason: 'Unknown action' };
    try {
      this.apply(seat, a);
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: e.message };
    }
  }

  apply(seat, action, auto = false) {
    // act() throws on an illegal move before changing anything, so a bad
    // request leaves the turn (and its timer) exactly as it was.
    const ev = act(this.st, seat, action);
    clearTimeout(this.turnTimer);
    this.turnId += 1; // closes this turn for any late/duplicate messages
    if (auto) for (const e of ev) if (e.type === 'action' && e.seat === seat) e.auto = true;
    this.send(ev);
  }

  // ---------------------------------------------------------------- seats
  setStatus(seat, status) {
    const s = this.seats[seat];
    if (!s || s.kind === 'bot' || s.status === 'left' || s.status === status) return;
    s.status = status;
    s.awaySince = status === 'away' ? Date.now() : 0;
    for (let i = 0; i < this.seats.length; i++) this.deliver(i, { type: 'seat', seat, status });
    // If it's their turn right now, re-time it.
    if (this.st && this.st.phase === 'betting' && this.st.toAct === seat) this.announceTurn(seat);
  }

  markAway(seat) {
    if (this.seats[seat] && this.seats[seat].status === 'here') this.setStatus(seat, 'away');
  }

  rejoin(seat) {
    const s = this.seats[seat];
    if (!s || s.status !== 'away') return false;
    this.setStatus(seat, 'here');
    return true;
  }

  canRejoin(seat) {
    return !!this.seats[seat] && this.seats[seat].status === 'away';
  }

  /** Leave for good: fold, forfeit any prize, remove from the tournament. */
  leave(seat) {
    const s = this.seats[seat];
    if (!s || s.status === 'left' || !this.st) return;
    const wasOut = this.st.players[seat].busted;
    s.status = 'left';
    for (let i = 0; i < this.seats.length; i++) this.deliver(i, { type: 'seat', seat, status: 'left' });
    if (wasOut || this.st.phase === 'over') return;
    const wasTurn = this.st.phase === 'betting' && this.st.toAct === seat;
    if (wasTurn) {
      clearTimeout(this.turnTimer);
      this.turnId += 1;
    }
    this.send(removePlayer(this.st, seat));
  }

  /** Everything one seat needs to redraw the table after reconnecting. */
  snapshot(seat) {
    const v = viewFor(this.st, seat);
    const la = this.st.phase === 'betting' && this.st.toAct === seat ? legalActions(this.st, seat) : null;
    return {
      type: 'sync',
      you: seat,
      seats: this.publicSeats(),
      stake: this.stake,
      prizes: this.prizeList,
      view: v,
      turnId: this.turnId,
      seconds: this.deadline ? Math.max(0, (this.deadline - Date.now()) / 1000) : 0,
      legal: la,
      places: this.st.finish.map((s, i) => ({ seat: s, place: this.seats.length - i })),
      paid: this.paid.slice(),
    };
  }
}

/** Only accept well-formed actions from the network. */
export function sanitize(a) {
  if (!a || typeof a !== 'object') return null;
  const type = String(a.type);
  if (type === 'fold' || type === 'check' || type === 'call') return { type };
  if (type === 'raise') {
    const to = Math.floor(Number(a.to));
    if (!Number.isFinite(to) || to <= 0) return null;
    return { type, to };
  }
  return null;
}
