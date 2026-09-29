import * as store from '../profile/store.js';
import { modal, $, $$ } from '../ui/kit.js';
import { sfx, setVolumes } from '../audio.js';
import { platform } from '../platform.js';
import { app } from '../app.js';

export function openSettings() {
  const s = store.profile().settings;
  const sw = (key, label, sub = '') => `
    <div class="set-row">
      <div class="set-l"><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>
      <button class="switch ${s[key] ? 'on' : ''}" role="switch" aria-checked="${!!s[key]}" aria-label="${label}" data-key="${key}"><i></i></button>
    </div>`;
  const slider = (key, label) => `<div class="set-vol"><span aria-hidden="true">${key === 'sfxVol' ? '🔈' : '🎵'}</span><input class="vol" type="range" min="0" max="100" step="5" value="${Math.round(s[key] * 100)}" data-key="${key}" aria-label="${label} volume" style="--p:${Math.round(s[key] * 100)}%"/></div>`;
  const canFs = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !platform.active;
  const m = modal(`
    <h2>Settings</h2>
    <div class="set-group">
      ${sw('sound', 'Sound effects')}
      ${slider('sfxVol', 'Sound effects')}
      ${sw('music', 'Music')}
      ${slider('musicVol', 'Music')}
    </div>
    <div class="set-group">
      ${sw('fast', 'Fast computer players', 'Solo games play quicker')}
      ${sw('vibrate', 'Vibration', 'On phones that support it')}
    </div>
    <p class="m-hint keys">Keyboard: <kbd>F</kbd> fold · <kbd>C</kbd> check/call · <kbd>R</kbd> raise · <kbd>Enter</kbd> confirm</p>
    ${canFs ? '<button class="btn ghost fs">⛶ Full screen</button>' : ''}
    <button class="btn gold lg done">Done</button>`, { cls: 'settings' });
  $$('.switch', m.el).forEach((b) =>
    b.addEventListener('click', () => {
      const key = b.dataset.key;
      const on = !store.profile().settings[key];
      store.setSetting(key, on);
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
      sfx('click');
      if (app.table) app.table.updateMute();
    }),
  );
  $$('.vol', m.el).forEach((r) => {
    const key = r.dataset.key;
    r.addEventListener('input', () => {
      r.style.setProperty('--p', `${r.value}%`);
      setVolumes({ [key === 'sfxVol' ? 'sfx' : 'music']: r.value / 100 });
    });
    r.addEventListener('change', () => {
      store.setSetting(key, r.value / 100);
      if (key === 'sfxVol') sfx('chip', 3);
    });
  });
  const fs = $('.fs', m.el);
  if (fs) fs.onclick = () => (toggleFullscreen(), m.close());
  $('.done', m.el).onclick = () => (sfx('click'), m.close());
}

export function toggleFullscreen() {
  const d = document;
  const el = d.documentElement;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      Promise.resolve(req && req.call(el, { navigationUI: 'hide' }))
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
        .catch(() => {});
    }
  } catch {
    /* not supported */
  }
}
