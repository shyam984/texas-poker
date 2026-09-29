import { register, render, go } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { $, wait, clock, center, tweenNumber } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { confetti, sparks } from '../ui/fx.js';
import { revealReward, chainLevelUps } from './rewards.js';
import { topBar, bindTopBar, refreshCoins } from './home.js';

let timer = 0;

export const CHEST_SVG = `<svg class="chest-svg" viewBox="0 0 200 170" aria-hidden="true">
  <defs>
    <linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c26bff"/><stop offset="1" stop-color="#6a2bd9"/></linearGradient>
    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a1"/><stop offset=".5" stop-color="#ffc93c"/><stop offset="1" stop-color="#e58a00"/></linearGradient>
  </defs>
  <ellipse cx="100" cy="160" rx="78" ry="9" fill="rgba(0,0,0,.25)"/>
  <g class="chest-base">
    <rect x="22" y="78" width="156" height="78" rx="12" fill="url(#cw)" stroke="#2a0e63" stroke-width="5"/>
    <rect x="22" y="78" width="156" height="16" fill="#2a0e63" opacity=".25"/>
    <rect x="40" y="78" width="16" height="78" fill="url(#cg)" stroke="#2a0e63" stroke-width="4"/>
    <rect x="144" y="78" width="16" height="78" fill="url(#cg)" stroke="#2a0e63" stroke-width="4"/>
    <rect x="84" y="86" width="32" height="36" rx="7" fill="url(#cg)" stroke="#2a0e63" stroke-width="4"/>
    <circle cx="100" cy="100" r="5" fill="#2a0e63"/><rect x="98" y="100" width="4" height="12" fill="#2a0e63"/>
  </g>
  <g class="chest-lid">
    <path d="M22 82V60c0-26 34-40 78-40s78 14 78 40v22Z" fill="url(#cw)" stroke="#2a0e63" stroke-width="5" stroke-linejoin="round"/>
    <path d="M40 82V38c5-6 11-10 16-12v56Z M144 82V26c5 2 11 6 16 12v44Z" fill="url(#cg)" stroke="#2a0e63" stroke-width="4" stroke-linejoin="round"/>
    <path d="M44 44c14-12 32-16 56-16" stroke="#fff" stroke-opacity=".5" stroke-width="5" fill="none" stroke-linecap="round"/>
  </g>
</svg>`;

function showChest() {
  clearInterval(timer);
  const ready = progress.chestReady();
  const root = render(
    `${topBar({ back: true })}
    <main class="chest-main">
      <h1>Daily Chest</h1>
      <p class="chest-status">${ready ? 'Free reward available!' : 'Come back tomorrow!'}</p>
      <div class="chest-stage ${ready ? 'ready' : 'empty'}">
        <div class="chest-glow" aria-hidden="true"></div>
        <div class="chest-rays" aria-hidden="true"></div>
        ${CHEST_SVG}
      </div>
      <button class="btn gold xl open" ${ready ? '' : 'disabled'}>${ready ? 'OPEN CHEST' : `Next chest in <span class="cd">${clock(progress.msToMidnight())}</span>`}</button>
      <p class="m-hint center">Chests hold coins or collectibles you don't have yet — characters, card backs, tables, emotes and more.</p>
    </main>`,
    'chest',
  );
  bindTopBar(root);
  if (!ready) {
    timer = setInterval(() => {
      const cd = $('.cd');
      if (!cd) return clearInterval(timer);
      cd.textContent = clock(progress.msToMidnight());
      if (progress.chestReady()) showChest();
    }, 1000);
  }
  const btn = $('.open', root);
  btn.onclick = async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    const reward = progress.openChest();
    if (!reward) return showChest();
    const stage = $('.chest-stage', root);
    // 1. shake  2. glow builds  3. lid pops  4. burst  5. reveal
    for (let i = 0; i < 3; i++) {
      stage.classList.remove('shake');
      void stage.offsetWidth;
      stage.classList.add('shake');
      sfx('shake');
      await wait(420 + i * 60);
    }
    stage.classList.add('glowing');
    await wait(500);
    stage.classList.add('open');
    sfx('chestOpen');
    const c = center($('.chest-svg', root));
    confetti(c.x, c.y - 30, 120, 1.6);
    sparks(c.x, c.y - 20, '#ffd23f', 40);
    sparks(c.x, c.y - 20, '#ff7ab8', 24);
    await wait(700);
    await revealReward(reward, { title: 'Daily Chest', sub: `+${reward.xp} XP` });
    refreshCoins();
    await chainLevelUps(reward.levelUps);
    refreshCoins();
    showChest();
  };
}

register('chest', showChest);
