// Celebrations: level-up, reward reveal, coin bursts. Each returns a promise
// that resolves when the player taps to continue, so they can be chained.

import { modal, $, esc, fmt, coins, center, tweenNumber } from '../ui/kit.js';
import { rewardArt, rewardName, itemArt, rarityTag } from '../ui/itemart.js';
import { item } from '../profile/catalog.js';
import { sfx } from '../audio.js';
import { confetti, coinShower, sparks } from '../ui/fx.js';

export function levelUp({ level, reward }) {
  return new Promise((resolve) => {
    sfx('levelUp');
    const it = reward && reward.item ? item(reward.item) : null;
    const m = modal(
      `<div class="lvl-up">
        <div class="lu-rays" aria-hidden="true"></div>
        <div class="lu-badge"><span>LEVEL</span><b>${level}</b></div>
        <h2>Level up!</h2>
        ${reward ? `<div class="lu-reward"><div class="lu-art">${rewardArt(reward)}</div>
          <div class="lu-name">${esc(rewardName(reward))}${it ? rarityTag(it.rarity) : ''}</div>
          <div class="m-hint">${reward.bonus ? 'Max level bonus!' : 'Free Pass reward unlocked'}${reward.also ? ` · plus ${reward.also.map((x) => esc(item(x).name)).join(' & ')}` : ''}${reward.item && reward.coins ? ` · plus ${coins(reward.coins)}` : ''}</div></div>` : ''}
        <button class="btn gold lg ok">Awesome!</button>
      </div>`,
      { cls: 'celebrate', dismiss: false },
    );
    setTimeout(() => {
      const c = center($('.lu-badge', m.el));
      confetti(c.x, c.y, 110, 1.6);
      sparks(c.x, c.y, '#ffd23f', 30);
    }, 250);
    $('.ok', m.el).onclick = () => (sfx('click'), m.close(), resolve());
  });
}

/** Big reveal of one reward (chest, mission, etc.). */
export function revealReward(reward, { title = 'You got…', sub = '' } = {}) {
  return new Promise((resolve) => {
    const it = reward.item ? item(reward.item) : null;
    sfx('reward');
    const m = modal(
      `<div class="reveal r-${it ? it.rarity : 'coins'}">
        <div class="lu-rays" aria-hidden="true"></div>
        <div class="rv-title">${title}</div>
        <div class="rv-art">${it ? itemArt(reward.item, { big: true }) : rewardArt(reward)}</div>
        <div class="rv-name">${esc(rewardName(reward))}</div>
        ${it ? `<div>${rarityTag(it.rarity)} <span class="m-hint">${esc(({ char: 'Character', acc: 'Accessory', back: 'Card back', table: 'Table', emote: 'Emote', frame: 'Profile frame', title: 'Title', badge: 'Badge' })[it.kind])} · added to your collection</span></div>` : ''}
        ${sub ? `<div class="m-hint">${sub}</div>` : ''}
        <button class="btn gold lg ok">Collect</button>
      </div>`,
      { cls: 'celebrate', dismiss: false },
    );
    setTimeout(() => {
      const c = center($('.rv-art', m.el));
      if (reward.coins && !it) coinShower(c.x, c.y, 36);
      else confetti(c.x, c.y, 90, 1.4);
    }, 200);
    $('.ok', m.el).onclick = () => (sfx('coins'), m.close(), resolve());
  });
}

export async function chainLevelUps(ups) {
  for (const u of ups || []) await levelUp(u);
}

/** Coins flying into the coin counter at the top of the screen. */
export function coinBurstTo(fromEl, amount) {
  const target = document.querySelector('.coins-pill');
  const from = center(fromEl);
  coinShower(from.x, from.y, Math.min(40, 10 + Math.round(amount / 60)));
  sfx('coins');
  if (target) {
    target.classList.remove('pulse');
    void target.offsetWidth;
    target.classList.add('pulse');
  }
}
