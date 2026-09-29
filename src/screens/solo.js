import * as store from '../profile/store.js';
import { STAKES, prizes } from '../profile/catalog.js';
import { LEVELS } from '../poker/bots.js';
import { modal, $, $$, fmt, coins, coinIco, toast } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { startSolo } from '../game/session.js';
import { go } from '../app.js';

const LEVEL_INFO = {
  rookie: { ico: '🐣', text: 'Relaxed, makes mistakes' },
  regular: { ico: '🙂', text: 'Solid, sensible players' },
  expert: { ico: '😎', text: 'Reads the betting well' },
  master: { ico: '🧠', text: 'Very tough to beat' },
  mixed: { ico: '🎲', text: 'A bit of everything' },
};

export function stakeCards(selected, { name = 'stake' } = {}) {
  const have = store.profile().coins;
  return `<div class="stakes" role="radiogroup" aria-label="Stake">${STAKES.map((v, i) => {
    const locked = v > have;
    return `<button class="stake ${v === selected ? 'on' : ''} ${locked ? 'locked' : ''} sk-${i}" data-v="${v}" role="radio" aria-checked="${v === selected}" aria-disabled="${locked}">
      <span class="sk-chip" aria-hidden="true"></span><b>${fmt(v)}</b>${locked ? '<span class="sk-lock">🔒</span>' : ''}</button>`;
  }).join('')}</div>`;
}

export function bindStakes(root, onPick) {
  $$('.stake', root).forEach((b) =>
    b.addEventListener('click', () => {
      const v = Number(b.dataset.v);
      const have = store.profile().coins;
      if (v > have) {
        sfx('deny');
        b.classList.remove('nope');
        void b.offsetWidth;
        b.classList.add('nope');
        toast(`Not enough coins for this table — you need ${coins(v - have)} more. Grab your free coins on the home screen!`, 'bad', 3400);
        return;
      }
      sfx('chip', 2);
      $$('.stake', root).forEach((x) => {
        x.classList.toggle('on', x === b);
        x.setAttribute('aria-checked', String(x === b));
      });
      onPick(v);
    }),
  );
}

export function explainStake(stake, players) {
  const pz = prizes(stake, players);
  return `Everyone pays ${coins(stake)} to sit down. Last player with chips wins ${coins(pz[0])}${pz[1] ? `; 2nd place gets their ${coins(pz[1])} back` : ''}.`;
}

function bestAffordable(stake) {
  const have = store.profile().coins;
  if (stake <= have) return stake;
  const ok = STAKES.filter((s) => s <= have);
  return ok.length ? ok[ok.length - 1] : 0;
}

export function needCoins(stake = STAKES[0]) {
  const m = modal(`<div class="empty-state"><div class="es-ico" aria-hidden="true">🪙</div><h2>Not enough coins</h2>
    <p class="m-text">You need ${coins(stake)} for the smallest table. Claim <b>free coins</b> every 5 minutes, open your <b>Daily Chest</b>, or finish <b>missions</b>.</p></div>
    <button class="btn gold lg ok">Get free coins</button>`, { cls: 'small' });
  $('.ok', m.el).onclick = () => (m.close(), go('home'));
}

export function soloSetup() {
  const s = store.profile().settings;
  const cfg = { players: s.soloPlayers || 4, stake: bestAffordable(s.soloStake || 100), level: s.soloLevel || 'regular' };
  if (!cfg.stake) return needCoins();
  const m = modal(
    `<h2>Solo game</h2>
    <div class="m-label lb-players">Players at the table</div>
    <div class="seg" role="radiogroup" aria-label="Players">${[2, 3, 4, 5].map((n) => `<button class="seg-b ${n === cfg.players ? 'on' : ''}" data-n="${n}" role="radio" aria-checked="${n === cfg.players}">${n}</button>`).join('')}</div>
    <div class="m-label lb-opp">Opponents</div>
    <div class="levels" role="radiogroup" aria-label="Difficulty">${['rookie', 'regular', 'expert', 'master', 'mixed']
      .map((l) => `<button class="lvl ${l === cfg.level ? 'on' : ''}" data-l="${l}" role="radio" aria-checked="${l === cfg.level}"><span class="lv-ico" aria-hidden="true">${LEVEL_INFO[l].ico}</span><b>${l === 'mixed' ? 'Mixed' : LEVELS[l].label}</b><small>${LEVEL_INFO[l].text}</small></button>`)
      .join('')}</div>
    <div class="m-label lb-stake">Stake</div>
    ${stakeCards(cfg.stake)}
    <p class="m-hint explain"></p>
    <button class="btn gold xl go"></button>`,
    { cls: 'setup' },
  );
  const go2 = $('.go', m.el);
  let armed = false;
  const upd = () => {
    $('.explain', m.el).innerHTML = explainStake(cfg.stake, cfg.players);
    armed = false;
    go2.classList.remove('armed');
    go2.innerHTML = `<span>Start · ${coinIco()}${fmt(cfg.stake)}</span>`;
  };
  upd();
  $$('.seg-b', m.el).forEach((b) =>
    b.addEventListener('click', () => {
      sfx('click');
      $$('.seg-b', m.el).forEach((x) => (x.classList.toggle('on', x === b), x.setAttribute('aria-checked', String(x === b))));
      cfg.players = Number(b.dataset.n);
      upd();
    }),
  );
  $$('.lvl', m.el).forEach((b) =>
    b.addEventListener('click', () => {
      sfx('click');
      $$('.lvl', m.el).forEach((x) => (x.classList.toggle('on', x === b), x.setAttribute('aria-checked', String(x === b))));
      cfg.level = b.dataset.l;
    }),
  );
  bindStakes(m.el, (v) => ((cfg.stake = v), upd()));
  go2.onclick = () => {
    const big = cfg.stake >= 1000 || cfg.stake > store.profile().coins / 2;
    if (big && !armed) {
      armed = true;
      go2.classList.add('armed');
      go2.innerHTML = `<span>Tap again to pay ${coinIco()}${fmt(cfg.stake)}</span>`;
      sfx('pop');
      setTimeout(upd, 3500);
      return;
    }
    store.setSetting('soloPlayers', cfg.players);
    store.setSetting('soloStake', cfg.stake);
    store.setSetting('soloLevel', cfg.level);
    m.close();
    startSolo(cfg);
  };
}

/** The big PLAY button: last solo settings, straight in. */
export function quickPlay() {
  const s = store.profile().settings;
  const stake = s.soloStake || 100;
  if (store.profile().coins < stake) {
    const alt = bestAffordable(stake);
    if (!alt) return needCoins();
    toast(`Not enough for ${fmt(stake)} — playing the ${fmt(alt)} table instead`);
    store.setSetting('soloStake', alt);
    return startSolo({ players: s.soloPlayers || 4, stake: alt, level: s.soloLevel || 'regular' });
  }
  if (stake >= 1000) return soloSetup(); // big stakes: confirm on the setup screen
  startSolo({ players: s.soloPlayers || 4, stake, level: s.soloLevel || 'regular' });
}
