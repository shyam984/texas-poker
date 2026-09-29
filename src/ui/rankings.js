// Hand rankings: the chart shown by the ? button at the table (and on the
// How to play screen), plus helpers that work out which hand you have right
// now and which of your cards make the match.

import { faceHtml } from './cards.js';
import { evaluate } from '../poker/eval.js';
import { rankOf, RANK_PLURAL, RANK_NAME } from '../poker/cards.js';
import { esc } from './kit.js';

// key, name, description, example cards, which example cards make the hand
export const HANDS = [
  { key: 'royal', name: 'Royal Flush', text: 'A K Q J 10, all the same suit', cards: ['As', 'Ks', 'Qs', 'Js', 'Ts'], on: 5 },
  { key: 'c8', name: 'Straight Flush', text: 'Five in a row, all the same suit', cards: ['9h', '8h', '7h', '6h', '5h'], on: 5 },
  { key: 'c7', name: 'Four of a Kind', text: 'Four cards of the same number', cards: ['Qc', 'Qd', 'Qh', 'Qs', '7d'], on: 4 },
  { key: 'c6', name: 'Full House', text: 'Three of a kind plus a pair', cards: ['Kh', 'Kd', 'Kc', '4s', '4h'], on: 5 },
  { key: 'c5', name: 'Flush', text: 'Any five cards of the same suit', cards: ['Ad', 'Jd', '8d', '5d', '2d'], on: 5 },
  { key: 'c4', name: 'Straight', text: 'Five in a row, any suits', cards: ['Tc', '9d', '8s', '7h', '6c'], on: 5 },
  { key: 'c3', name: 'Three of a Kind', text: 'Three cards of the same number', cards: ['8s', '8h', '8d', 'Kc', '3s'], on: 3 },
  { key: 'c2', name: 'Two Pair', text: 'Two different pairs', cards: ['Jh', 'Jc', '5d', '5s', 'Ah'], on: 4 },
  { key: 'c1', name: 'One Pair', text: 'Two cards of the same number', cards: ['Ah', 'Ad', 'Kc', '9s', '4h'], on: 2 },
  { key: 'c0', name: 'High Card', text: 'No match? Your highest card plays', cards: ['Ks', 'Jd', '8c', '5h', '2s'], on: 1 },
];

export const miniCard = (id, cls = '') => `<span class="mini-card ${cls}">${faceHtml(id)}</span>`;

/** The cards inside `best` that actually make the combination (not kickers). */
export function makingCards(e) {
  if (!e || !e.best) return [];
  if (e.cat === 4 || e.cat === 5 || e.cat === 8) return e.best.slice();
  if (e.cat === 0) return [];
  const count = {};
  for (const c of e.best) count[rankOf(c)] = (count[rankOf(c)] || 0) + 1;
  return e.best.filter((c) => count[rankOf(c)] >= 2);
}

/**
 * Your hand right now from your hole cards and the board.
 * Returns null without two cards, otherwise
 * { key, name, short, cat, best, making }.
 */
export function currentHand(hole, board) {
  const mine = (hole || []).filter(Boolean);
  if (mine.length < 2) return null;
  if ((board || []).length >= 3) {
    const e = evaluate(mine.concat(board));
    const royal = e.cat === 8 && /Royal/.test(e.name);
    return { key: royal ? 'royal' : `c${e.cat}`, name: e.name, short: e.name.split(',')[0], cat: e.cat, best: e.best, making: makingCards(e) };
  }
  // Before the flop: only a pair or a high card is possible.
  const [a, b] = mine;
  const ra = rankOf(a);
  const rb = rankOf(b);
  if (ra === rb) return { key: 'c1', name: `Pair of ${RANK_PLURAL[ra]}`, short: 'One Pair', cat: 1, best: mine, making: mine.slice() };
  const hi = ra > rb ? a : b;
  return { key: 'c0', name: `High Card, ${RANK_NAME[Math.max(ra, rb)]}`, short: 'High Card', cat: 0, best: mine, making: [hi] };
}

/** The whole chart. `cur` (from currentHand) highlights your row. */
export function rankingsHtml(cur, { compact = false } = {}) {
  const rows = HANDS.map(
    (h, i) => `<div class="hh ${cur && cur.key === h.key ? 'you' : ''}" data-k="${h.key}">
      <span class="hh-n">${i + 1}</span>
      <div class="hh-t"><b>${h.name}</b><small>${h.text}</small></div>
      <div class="hh-c">${h.cards.map((c, k) => miniCard(c, k < h.on ? 'on' : 'off')).join('')}</div>
      ${cur && cur.key === h.key ? '<span class="hh-you">YOU</span>' : ''}
    </div>`,
  ).join('');
  return `<div class="hh-list ${compact ? 'compact' : ''}">${rows}</div>`;
}

/** "You have …" strip with your best cards, matching ones lit up. */
export function youHaveHtml(cur, { folded = false } = {}) {
  if (!cur) return `<div class="hr-you empty">${folded ? 'You folded this hand.' : 'Your hand shows here once the cards are dealt.'}</div>`;
  const making = new Set(cur.making);
  const match = cur.cat >= 1;
  return `<div class="hr-you ${match ? 'match' : ''}">
    <div class="hr-you-t"><small>${folded ? 'You folded — you had' : 'You have'}</small><b>${esc(cur.name)}</b>${match ? '<span class="hr-yes">✓ MATCH</span>' : '<span class="hr-no">No match yet</span>'}</div>
    <div class="hh-c">${cur.best.map((c) => miniCard(c, making.has(c) ? 'on' : 'off')).join('')}</div>
  </div>`;
}
