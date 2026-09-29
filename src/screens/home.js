import { app, register, go, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { item, MAX_LEVEL, FREE_COINS } from '../profile/catalog.js';
import { avatarHtml } from '../ui/avatars.js';
import { suitSvg } from '../ui/cards.js';
import { $, $$, esc, fmt, coinIco, tweenNumber, toast, clock, coins } from '../ui/kit.js';
import { sfx, playMusic } from '../audio.js';
import { openSettings } from './settings.js';
import { coinBurstTo, chainLevelUps } from './rewards.js';
import { teardown } from '../game/session.js';
import { soloSetup, quickPlay } from './solo.js';
import { createRoom, joinDialog } from './room.js';

let homeTimer = 0;

export function topBar({ back = false } = {}) {
  const p = store.profile();
  const lp = progress.levelProgress();
  const title = item(p.equipped.title);
  return `
    <header class="topbar">
      ${back ? '<button class="icon-btn back" aria-label="Back">←</button>' : ''}
      <button class="me-chip" aria-label="Your profile and collection">
        <span class="me-av">${avatarHtml(progress.look(), { size: 'sm' })}</span>
        <span class="me-txt"><b class="me-name">${esc(p.name)}</b><small>${esc(title ? title.name : '')}</small>
          <span class="xp"><i style="width:${Math.round(lp.frac * 100)}%"></i></span></span>
        <span class="lvl-badge" title="Level ${p.level}">${p.level}</span>
      </button>
      <span class="grow"></span>
      <div class="pill coins-pill" title="Your coins"><span class="coin"></span><b class="coins-v" data-v="${p.coins}">${fmt(p.coins)}</b></div>
      <button class="icon-btn settings-btn" aria-label="Settings">⚙</button>
    </header>`;
}

export function bindTopBar(root) {
  const b = $('.back', root);
  if (b) b.onclick = () => (sfx('nav'), go('home'));
  $('.me-chip', root).onclick = () => (sfx('nav'), go('collection'));
  $('.settings-btn', root).onclick = () => (sfx('click'), openSettings());
}

export function refreshCoins() {
  tweenNumber($('.coins-v'), store.profile().coins);
}

function showHome() {
  teardown();
  app.mode = null;
  app.lobby = null;
  clearInterval(homeTimer);
  playMusic('home');
  const p = store.profile();
  const s = p.settings;
  const lp = progress.levelProgress();
  const claim = progress.claimableCount();
  const newN = p.newItems.length;
  const col = progress.collectionStats();
  const root = render(
    `
    <div class="bg-float" aria-hidden="true">${['s', 'h', 'd', 'c', 's', 'h'].map((x, i) => `<i class="fl-suit" style="--i:${i}">${suitSvg(x)}</i>`).join('')}${[0, 1, 2, 3].map((i) => `<i class="fl-chip" style="--i:${i}"></i>`).join('')}${[0, 1, 2, 3, 4].map((i) => `<i class="fl-spark" style="--i:${i}"></i>`).join('')}</div>
    ${topBar()}
    <main class="home-main">
      <section class="home-hero">
        <div class="logo" role="img" aria-label="Texas Poker">
          <div class="logo-cards" aria-hidden="true"><span class="lc">A${suitSvg('s')}</span><span class="lc red">K${suitSvg('h')}</span></div>
          <h1><span class="l1">TEXAS</span><span class="l2">POKER</span></h1>
        </div>
        <button class="btn play-btn"><span class="pb-main">PLAY</span><span class="pb-sub">${s.soloPlayers} players · ${esc(({ rookie: 'Rookie', regular: 'Regular', expert: 'Expert', master: 'Master', mixed: 'Mixed' })[s.soloLevel] || 'Regular')} · ${coinIco()}${fmt(s.soloStake)}</span></button>
        <div class="home-row">
          <button class="btn blue solo-btn"><span class="bi" aria-hidden="true">🤖</span>Solo</button>
          <button class="btn pink create-btn"><span class="bi" aria-hidden="true">👥</span>Create Room</button>
          <button class="btn teal join-btn"><span class="bi" aria-hidden="true">🔑</span>Join Room</button>
        </div>
      </section>
      <section class="dock" aria-label="Rewards and progress">
        <button class="tile t-free"><span class="t-ico" aria-hidden="true">🎁</span><span class="t-txt"><b>Free ${fmt(FREE_COINS)}</b><small class="free-sub"></small></span><span class="t-bar"><i class="free-bar"></i></span></button>
        <button class="tile t-chest"><span class="t-ico chest-ico" aria-hidden="true"></span><span class="t-txt"><b>Daily Chest</b><small class="chest-sub"></small></span></button>
        <button class="tile t-pass"><span class="t-ico" aria-hidden="true">🎫</span><span class="t-txt"><b>Free Pass</b><small>Level ${p.level}${p.level >= MAX_LEVEL ? ' · MAX' : ` / ${MAX_LEVEL}`}</small></span><span class="t-bar"><i style="width:${Math.round(lp.frac * 100)}%"></i></span></button>
        <button class="tile t-missions"><span class="t-ico" aria-hidden="true">📜</span><span class="t-txt"><b>Missions</b><small>${claim ? `${claim} to claim!` : 'Daily & weekly'}</small></span>${claim ? `<span class="dot">${claim}</span>` : ''}</button>
        <button class="tile t-collection"><span class="t-ico" aria-hidden="true">🧸</span><span class="t-txt"><b>Collection</b><small>${col.owned} / ${col.total}</small></span>${newN ? `<span class="dot new">NEW</span>` : ''}</button>
        <button class="tile t-how"><span class="t-ico" aria-hidden="true">❓</span><span class="t-txt"><b>How to play</b><small>Rules & hands</small></span></button>
      </section>
    </main>`,
    'home',
  );
  bindTopBar(root);
  $('.play-btn', root).onclick = () => (sfx('click'), quickPlay());
  $('.solo-btn', root).onclick = () => (sfx('click'), soloSetup());
  $('.create-btn', root).onclick = () => (sfx('click'), createRoom());
  $('.join-btn', root).onclick = () => (sfx('click'), joinDialog());
  $('.t-pass', root).onclick = () => (sfx('nav'), go('pass'));
  $('.t-missions', root).onclick = () => (sfx('nav'), go('missions'));
  $('.t-collection', root).onclick = () => (sfx('nav'), go('collection'));
  $('.t-chest', root).onclick = () => (sfx('nav'), go('chest'));
  $('.t-how', root).onclick = () => (sfx('click'), go('howto'));
  const free = $('.t-free', root);
  free.onclick = () => {
    const amt = progress.claimFree();
    if (amt > 0) {
      coinBurstTo(free, amt);
      refreshCoins();
      toast(`+${coins(amt)} free coins!`, 'gold');
      free.classList.add('claimed');
      setTimeout(() => free.classList.remove('claimed'), 600);
    } else {
      sfx('deny');
      toast(`Next free coins in ${clock(progress.freeStatus().left)}`);
    }
    updateTiles();
  };
  updateTiles();
  homeTimer = setInterval(updateTiles, 1000);
}

function updateTiles() {
  const free = $('.t-free');
  if (!free) return clearInterval(homeTimer);
  const f = progress.freeStatus();
  free.classList.toggle('ready', f.ready);
  $('.free-sub', free).textContent = f.ready ? `${fmt(FREE_COINS)} coins ready!` : `Next in ${clock(f.left)}`;
  $('.free-bar', free).style.width = `${Math.round(f.frac * 100)}%`;
  const ch = $('.t-chest');
  const ready = progress.chestReady();
  ch.classList.toggle('ready', ready);
  $('.chest-sub', ch).textContent = ready ? 'Ready to open!' : `Opens in ${clock(progress.msToMidnight())}`;
}

register('home', showHome);
register('leaveToHome', () => {
  app.leaving = true;
  if (app.room) app.room.close();
  if (app.conn) app.conn.close();
  app.room = null;
  app.conn = null;
  app.reconnecting = false;
  try {
    sessionStorage.removeItem('texaspoker.active');
  } catch {
    /* ignore */
  }
  document.getElementById('modal-root').innerHTML = '';
  showHome();
  app.leaving = false;
});

export { chainLevelUps };
