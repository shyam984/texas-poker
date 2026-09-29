import { register, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { PASS, MAX_LEVEL, item, xpToNext } from '../profile/catalog.js';
import { rewardArt, rewardName, rarityTag } from '../ui/itemart.js';
import { $, $$, esc, fmt, modal } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { topBar, bindTopBar } from './home.js';

function showPass() {
  const p = store.profile();
  const lp = progress.levelProgress();
  const current = Math.min(PASS.length, p.level); // next tier to unlock = level (1-based tier = level)
  const tiles = PASS.map((r, i) => {
    const tier = i + 1;
    const unlocked = p.level >= tier + 1;
    const next = tier === p.level;
    const it = r.item ? item(r.item) : null;
    return `<button class="tier ${unlocked ? 'got' : ''} ${next ? 'next' : ''} ${it ? `r-${it.rarity}` : 'r-coins'}" data-t="${i}" aria-label="Level ${tier + 1}: ${esc(rewardName(r))}${unlocked ? ', unlocked' : ', locked'}">
      <span class="t-lv">LV ${tier + 1}</span>
      <span class="t-art">${rewardArt(r)}</span>
      <span class="t-nm">${esc(rewardName(r))}</span>
      <span class="t-st">${unlocked ? '✓' : next ? '▶' : '🔒'}</span>
    </button>`;
  }).join('');
  const root = render(
    `${topBar({ back: true })}
    <main class="pass-main">
      <div class="pass-head">
        <div class="ph-l"><h1>Free Pass</h1><p>Every level unlocks a reward. No payment, ever.</p></div>
        <div class="ph-lvl"><span class="lvl-badge big">${p.level}</span>
          <div class="ph-xp"><div class="ph-bar"><i style="width:${Math.round(lp.frac * 100)}%"></i></div>
          <small>${p.level >= MAX_LEVEL ? 'Pass complete! +500 coins every level' : `${fmt(lp.into)} / ${fmt(lp.need)} XP to level ${p.level + 1}`}</small></div></div>
      </div>
      <div class="track-wrap"><div class="track">${tiles}</div></div>
      <p class="m-hint center">Earn XP by playing hands, winning games and completing missions.</p>
    </main>`,
    'pass',
  );
  bindTopBar(root);
  const track = $('.track', root);
  const cur = $('.tier.next', root) || $$('.tier', root).pop();
  requestAnimationFrame(() => cur && cur.scrollIntoView({ inline: 'center', block: 'nearest' }));
  track.addEventListener('click', (e) => {
    const b = e.target.closest('.tier');
    if (!b) return;
    sfx('click');
    const i = Number(b.dataset.t);
    const r = PASS[i];
    const it = r.item ? item(r.item) : null;
    const unlocked = p.level >= i + 2;
    const m = modal(
      `<div class="tier-detail"><div class="td-art">${rewardArt(r)}</div>
      <h2>${esc(rewardName(r))}</h2>
      <div>${it ? rarityTag(it.rarity) : ''}</div>
      ${it && it.bio ? `<p class="m-text center">${esc(it.bio)}</p>` : ''}
      ${r.also ? `<p class="m-hint center">Also: ${r.also.map((x) => esc(item(x).name)).join(', ')}${r.coins ? ` and ${fmt(r.coins)} coins` : ''}</p>` : ''}
      <p class="m-text center">${unlocked ? '✓ Unlocked' : `Reach <b>level ${i + 2}</b> to unlock`}</p>
      <button class="btn gold lg ok">OK</button></div>`,
      { cls: 'small' },
    );
    $('.ok', m.el).onclick = () => m.close();
  });
}

register('pass', showPass);
