// Texas Poker — start-up.

import * as store from './profile/store.js';
import * as progress from './profile/progress.js';
import { app, go } from './app.js';
import { initFx } from './ui/fx.js';
import { $, toast, coins, confirmBox, esc } from './ui/kit.js';
import * as audio from './audio.js';
import { setSoundEnabled, setMusicEnabled, setVolumes, setExternalMute } from './audio.js';
import { initPlatform, platform } from './platform.js';
import { cleanCode } from './net.js';
import './screens/home.js';
import './screens/onboarding.js';
import './screens/results.js';
import './screens/pass.js';
import './screens/chest.js';
import './screens/missions.js';
import './screens/collection.js';
import './screens/howto.js';
import { joinDialog, getActive } from './screens/room.js';
import { refreshCoins } from './screens/home.js';

function applyAudio(p) {
  const s = p.settings;
  setSoundEnabled(s.sound);
  setMusicEnabled(s.music);
  setVolumes({ sfx: s.sfxVol, music: s.musicVol });
}

let lastOops = 0;
function oops() {
  if (Date.now() - lastOops < 8000) return;
  lastOops = Date.now();
  toast('Something went wrong. If the game looks stuck, go back to the home screen.', 'bad', 4000);
}

async function boot() {
  store.load();
  progress.refreshMissions();
  applyAudio(store.profile());
  store.onChange((p) => {
    applyAudio(p);
    if (app.screen === 'home' || app.screen === 'lobby') refreshCoins();
  });
  initFx($('#fx'));
  window.addEventListener('error', (e) => {
    if (e.filename && e.filename.includes(location.host)) oops();
  });
  window.addEventListener('unhandledrejection', oops);
  window.addEventListener('pagehide', () => app.room && app.room.close());
  window.__tpBooted = true;
  await initPlatform({ onMute: setExternalMute });
  platform.loadingStop();
  const p = store.profile();
  if (!p.onboarded) go('onboarding');
  else go('home');
  const params = new URLSearchParams(location.search);
  const room = cleanCode(params.get('room') || platform.inviteRoom());
  const act = getActive();
  if (p.onboarded) {
    if (room) joinDialog(room);
    else if (act && act.code) {
      const ok = await confirmBox(`You were playing in room <b>${esc(act.code)}</b> with a ${coins(act.stake)} stake. Jump back in?`, 'Rejoin', { title: 'Rejoin your game?', no: 'No thanks', danger: false });
      if (ok) joinDialog(act.code);
      else sessionStorage.removeItem('texaspoker.active');
    }
  }
  window.__tx = { app, store, progress, audio }; // for testing
}

boot();
