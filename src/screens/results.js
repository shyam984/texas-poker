import { app, register, go, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { item, MAX_LEVEL } from '../profile/catalog.js';
import { avatarHtml } from '../ui/avatars.js';
import { $, esc, fmt, coins, tweenNumber, wait, center } from '../ui/kit.js';
import { sfx, playMusic, duckMusic } from '../audio.js';
import { confetti, coinShower } from '../ui/fx.js';
import { chainLevelUps } from './rewards.js';
import { teardown } from '../game/session.js';
import { quickPlay } from './solo.js';
import { hostBackToLobby } from './room.js';

const PLACE = ['1st', '2nd', '3rd', '4th', '5th'];
const MEDAL = ['🥇', '🥈', '🥉', '4', '5'];

async function results(r) {
  const won = r.place === 1;
  const net = r.prize - r.stake;
  teardownKeepRoom();
  playMusic('home');
  duckMusic(3);
  const headline = r.left ? 'You left the table' : won ? 'YOU WON!' : r.prize > 0 ? 'Stake back!' : 'Good game!';
  const sub = r.left ? 'Your stake stays on the table.' : won ? 'Champion of the table' : `You finished ${PLACE[r.place - 1]} of ${r.players}`;
  const root = render(
    `<div class="res ${won ? 'won' : r.prize > 0 ? 'even' : 'lost'}">
      <div class="res-card">
        <div class="res-top">
          <div class="res-av">${avatarHtml(progress.look(), { size: 'xl' })}<span class="res-medal">${r.left ? '🚪' : MEDAL[r.place - 1]}</span></div>
          <div class="res-head"><h1>${headline}</h1><p>${sub}</p></div>
        </div>
        <div class="res-prize">
          <span class="rz-lbl">${r.prize > 0 ? 'Prize' : 'Stake'}</span>
          <span class="rp-v ${net >= 0 ? 'pos' : 'neg'}">${r.prize > 0 ? '+' : '−'}<span class="coin big"></span><b class="rp-num" data-v="0">0</b></span>
        </div>
        <div class="res-xp">
          <div class="rx-row"><span class="lvl-badge">${r.before.level}</span><div class="rx-bar"><i style="width:${Math.round(r.before.frac * 100)}%"></i></div><span class="rx-gain">+<b class="rx-num">0</b> XP</span></div>
          <ul class="rx-list">
            <li><span>Game played</span><b>+${r.xp.play}</b></li>
            <li><span>Hands played (${r.handsPlayedCount ?? ''})</span><b>+${r.xp.hands}</b></li>
            <li><span>Hands won</span><b>+${r.xp.wins}</b></li>
            ${r.xp.place ? `<li class="hi"><span>${PLACE[r.place - 1]} place bonus</span><b>+${r.xp.place}</b></li>` : ''}
          </ul>
        </div>
        ${r.missions.length || r.badges.length ? `<div class="res-extra">${r.missions.map((m) => `<div class="rx-ms">✅ <b>${esc(m.text)}</b> <span>complete — claim it in Missions</span></div>`).join('')}${r.badges.map((b) => `<div class="rx-ms">🏅 New badge: <b>${esc(item(b).name)}</b></div>`).join('')}</div>` : ''}
        <div class="res-coins">Your coins <span class="coin"></span><b class="rc-v">${fmt(store.profile().coins - Math.max(0, r.prize))}</b></div>
        <div class="row res-actions"></div>
      </div>
    </div>`,
    'results',
  );
  const acts = $('.res-actions', root);
  if (r.mode === 'host' && app.lobby) acts.innerHTML = `<button class="btn ghost lg home">Close room</button><button class="btn gold lg again">Back to room</button>`;
  else if (r.mode === 'client' && app.conn) acts.innerHTML = `<button class="btn ghost lg home">Leave room</button><div class="waiting">Waiting for the host…</div>`;
  else acts.innerHTML = `<button class="btn ghost lg home">Home</button><button class="btn gold lg again">Play again</button>`;
  const home = $('.home', root);
  home.onclick = () => (sfx('nav'), go('leaveToHome'));
  const again = $('.again', root);
  if (again) again.onclick = () => (sfx('click'), r.mode === 'host' ? hostBackToLobby() : quickPlay());
  // Celebrate
  await wait(300);
  if (won) {
    sfx('win');
    const c = center($('.res-av', root));
    confetti(c.x, c.y, 140, 1.6);
  } else if (r.prize <= 0 && !r.left) sfx('lose');
  const num = $('.rp-num', root);
  tweenNumber(num, r.prize > 0 ? r.prize : r.stake, 900);
  if (r.prize > 0) {
    await wait(400);
    coinShower(center(num).x, center(num).y, 30);
    sfx('coins');
    tweenNumber($('.rc-v', root), store.profile().coins, 900);
  }
  // XP bar
  await wait(500);
  tweenNumber($('.rx-num', root), r.xpTotal, 900);
  const bar = $('.rx-bar i', root);
  const badge = $('.res-xp .lvl-badge', root);
  const ups = r.levelUps.length;
  for (let i = 0; i <= ups; i++) {
    const target = i < ups ? 1 : r.after.frac;
    bar.style.transition = 'width .7s cubic-bezier(.3,.8,.3,1)';
    bar.style.width = `${Math.round(target * 100)}%`;
    for (let k = 0; k < 5; k++) setTimeout(() => sfx('xpTick'), k * 110);
    await wait(750);
    if (i < ups) {
      badge.textContent = String(r.levelUps[i].level);
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
      bar.style.transition = 'none';
      bar.style.width = '0%';
      await wait(60);
    }
  }
  if (ups) {
    await wait(300);
    await chainLevelUps(r.levelUps);
    tweenNumber($('.rc-v', root), store.profile().coins, 600);
  }
}

/** Results keep the room connection open (host/client) but drop the table. */
function teardownKeepRoom() {
  if (app.host && app.mode === 'solo') app.host.destroy();
  if (app.table) app.table.destroy();
  app.table = null;
  if (app.mode === 'solo') app.host = null;
}

register('results', results);
