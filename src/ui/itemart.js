// Artwork for collectible items and rewards (used by the pass, chest,
// collection and reward pop-ups).

import { item, RARITY } from '../profile/catalog.js';
import { avatarSvg, avatarHtml } from './avatars.js';
import { suitSvg } from './cards.js';
import { esc, fmt } from './kit.js';

export function itemArt(id, { big = false } = {}) {
  const it = item(id);
  if (!it) return '';
  switch (it.kind) {
    case 'char':
      return `<div class="ia ia-char">${avatarSvg({ char: id, acc: 'acc:none' }, { blink: big })}</div>`;
    case 'acc':
      return `<div class="ia ia-char">${avatarSvg({ char: 'char:bear', acc: id }, { blink: false })}</div>`;
    case 'back':
      return `<div class="ia ia-back"><div class="mini-back cb-${it.key}"><i></i></div><div class="mini-back cb-${it.key} b2"><i></i></div></div>`;
    case 'table':
      return `<div class="ia ia-table"><div class="mini-felt tbl-${it.key}"><div class="felt"><div class="felt-inner"></div></div></div></div>`;
    case 'emote':
      return `<div class="ia ia-emote ${it.sticker ? 'sticker' : ''}">${it.glyph ? it.glyph : `<span class="stk a-${it.anim}">${esc(it.sticker)}</span>`}</div>`;
    case 'frame':
      return `<div class="ia ia-frame">${avatarHtml({ char: 'char:fox', frame: id }, { blink: false })}</div>`;
    case 'title':
      return `<div class="ia ia-title"><span class="ribbon">${esc(it.name)}</span></div>`;
    case 'badge':
      return `<div class="ia ia-badge"><span class="medal r-${it.rarity}">${it.icon}</span></div>`;
    default:
      return '';
  }
}

export function coinArt(amount) {
  return `<div class="ia ia-coins"><span class="coin-pile">${'<i class="coin"></i>'.repeat(amount >= 2500 ? 5 : amount >= 1000 ? 4 : amount >= 500 ? 3 : 2)}</span><b>${fmt(amount)}</b></div>`;
}

export function rarityTag(r) {
  const x = RARITY[r];
  return x ? `<span class="rar rar-${r}">${x.label}</span>` : '';
}

/** Art + caption for a pass reward. */
export function rewardArt(reward) {
  if (!reward) return '';
  if (reward.item) return itemArt(reward.item);
  if (reward.coins) return coinArt(reward.coins);
  return '';
}

export function rewardName(reward) {
  if (!reward) return '';
  if (reward.item) {
    const it = item(reward.item);
    return it ? it.name : '';
  }
  return `${fmt(reward.coins)} coins`;
}

export { suitSvg };
