import { register, go, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { START_COINS, item } from '../profile/catalog.js';
import { avatarHtml, avatarSvg } from '../ui/avatars.js';
import { $, $$, esc, fmt, tweenNumber, wait, center } from '../ui/kit.js';
import { sfx, playMusic } from '../audio.js';
import { coinShower, confetti } from '../ui/fx.js';

function onboarding() {
  playMusic('home');
  const p = store.profile();
  const starters = ['char:fox', 'char:bear', 'char:explorer'];
  let pick = p.equipped.char;
  const root = render(
    `<div class="onb">
      <div class="onb-card step1">
        <div class="onb-title"><span>Welcome to</span><h1><span class="l1">TEXAS</span><span class="l2">POKER</span></h1></div>
        <p class="m-text center">Pick your character and a name — you can change them any time.</p>
        <div class="onb-chars" role="radiogroup" aria-label="Character">${starters
          .map((c) => `<button class="onb-char ${c === pick ? 'on' : ''}" data-c="${c}" role="radio" aria-checked="${c === pick}"><span class="oc-av">${avatarSvg({ char: c })}</span><b>${esc(item(c).name)}</b></button>`)
          .join('')}</div>
        <label class="field"><span>Your name</span><input class="nm-in" maxlength="14" value="${esc(p.name)}" autocomplete="nickname" /></label>
        <button class="btn gold xl go">Let's play!</button>
      </div>
    </div>`,
    'onboard',
  );
  $$('.onb-char', root).forEach((b) =>
    b.addEventListener('click', () => {
      sfx('pop');
      pick = b.dataset.c;
      $$('.onb-char', root).forEach((x) => (x.classList.toggle('on', x === b), x.setAttribute('aria-checked', String(x === b))));
    }),
  );
  const next = async () => {
    store.setName($('.nm-in', root).value);
    progress.equip(pick);
    sfx('click');
    const card = $('.onb-card', root);
    card.classList.add('out');
    await wait(260);
    card.outerHTML = `<div class="onb-card step2">
        <div class="onb-av">${avatarHtml(progress.look(), { size: 'xl' })}</div>
        <h2>Welcome, ${esc(store.profile().name)}!</h2>
        <p class="m-text center">Here's something to get you started</p>
        <div class="gift"><span class="coin big"></span><b class="gift-v">+0</b><span class="gift-lbl">COINS</span></div>
        <button class="btn gold xl go2" disabled>Collect</button>
      </div>`;
    const v = $('.gift-v', root);
    await wait(350);
    sfx('coins');
    const c = center(v);
    coinShower(c.x, c.y, 50);
    confetti(c.x, c.y - 40, 90, 1.4);
    tweenNumber(v, START_COINS, 1200, '+');
    await wait(900);
    const b = $('.go2', root);
    b.disabled = false;
    b.focus();
    b.onclick = () => {
      store.addCoins(START_COINS);
      const pr = store.profile();
      pr.onboarded = true;
      store.save();
      sfx('coins');
      go('home');
    };
  };
  $('.go', root).onclick = next;
  $('.nm-in', root).addEventListener('keydown', (e) => e.key === 'Enter' && next());
}

register('onboarding', onboarding);
