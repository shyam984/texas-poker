// Playing cards: faces drawn with SVG suits, backs themed by the equipped
// card back. Every card is built so it can flip (front + back faces).

import { rankOf, suitOf, rankLabel } from '../poker/cards.js';

const SUIT_PATH = {
  h: 'M50 90C22 68 5 51 5 31 5 16 16 6 29 6c10 0 17 6 21 14 4-8 11-14 21-14 13 0 24 10 24 25 0 20-17 37-45 59Z',
  d: 'M50 4 88 50 50 96 12 50Z',
  s: 'M50 5c10 17 43 35 43 56 0 14-11 22-22 22-8 0-14-4-17-9 1 9 5 16 13 21H33c8-5 12-12 13-21-3 5-9 9-17 9C18 83 7 75 7 61 7 40 40 22 50 5Z',
  c: 'M50 8a19 19 0 0 1 16 29 19 19 0 1 1-8 36c1 9 5 16 12 21H30c7-5 11-12 12-21a19 19 0 1 1-8-36A19 19 0 0 1 50 8Z',
};
export const SUIT_NAME = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const RANK_WORD = { 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };

export const suitSvg = (s, cls = '') => `<svg class="suit su-${s} ${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="${SUIT_PATH[s]}"/></svg>`;

const FACE = {
  11: '<path d="M30 78c2-16 10-26 20-26s18 10 20 26Z"/><circle cx="50" cy="40" r="12"/><path d="M36 34l14-12 14 12Z" opacity=".55"/>',
  12: '<path d="M30 78c2-16 10-26 20-26s18 10 20 26Z"/><circle cx="50" cy="42" r="12"/><path d="M34 32l6 6 5-10 5 10 5-10 5 10 6-6-3 10H37Z"/>',
  13: '<path d="M28 78c2-16 11-26 22-26s20 10 22 26Z"/><circle cx="50" cy="42" r="12"/><path d="M32 30l7 8 5-12 6 12 6-12 5 12 7-8-3 12H35Z"/>',
};

export function cardName(id) {
  const r = rankOf(id);
  return `${RANK_WORD[r] || r} of ${SUIT_NAME[suitOf(id)]}`;
}

export function faceHtml(id) {
  const s = suitOf(id);
  const r = rankOf(id);
  const label = rankLabel(r);
  let mid;
  if (r >= 11 && r <= 13) mid = `<div class="pc-art"><svg viewBox="0 0 100 100">${FACE[r]}</svg></div>`;
  else mid = `<div class="pc-pip ${r === 14 ? 'ace' : ''}">${suitSvg(s)}</div>`;
  return `<div class="pc-face su-${s}"><div class="pc-idx"><b>${label}</b>${suitSvg(s)}</div>${mid}</div>`;
}

/** A card element. `id` null = face down. `back` = card-back key. */
export function cardEl(id, { back = 'classic', faceUp = !!id, cls = '' } = {}) {
  const el = document.createElement('div');
  el.className = `pcard ${faceUp ? 'up' : ''} ${cls}`.trim();
  if (id) el.dataset.card = id;
  el.innerHTML = `<div class="pc-inner"><div class="pc-front">${id ? faceHtml(id) : ''}</div><div class="pc-back cb-${back}"><i></i></div></div>`;
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', id && faceUp ? cardName(id) : 'Face-down card');
  return el;
}

/** Turn a face-down card face up (optionally setting which card it is). */
export function reveal(el, id) {
  if (id && el.dataset.card !== id) {
    el.dataset.card = id;
    el.querySelector('.pc-front').innerHTML = faceHtml(id);
  }
  el.classList.add('up');
  el.setAttribute('aria-label', cardName(el.dataset.card));
}
