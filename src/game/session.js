// A game session: puts the table on screen, takes the stake, pays prizes and
// feeds progression (XP, missions, badges). Used by solo games and rooms.

import { app, go } from '../app.js';
import { TableView } from '../ui/table.js';
import { PokerHost } from './host.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { item, itemsOf } from '../profile/catalog.js';
import { CHAR_IDS } from '../ui/avatars.js';
import { playMusic, sfx } from '../audio.js';
import { toast, coins, confirmBox, esc } from '../ui/kit.js';
import { platform } from '../platform.js';
import { openSettings } from '../screens/settings.js';

const TEST_SPEED = Number(new URLSearchParams(location.search).get('speed')) || 1; // testing aid
const BOT_NAMES = ['Pixel', 'Maple', 'Rocco', 'Luna', 'Ziggy', 'Bubbles', 'Captain K', 'Dotty', 'Nova', 'Buster', 'Sprout', 'Twix', 'Pepper', 'Comet'];
const PERSONAS = ['balanced', 'aggressive', 'conservative', 'risky', 'bluffer'];
const ACCS = ['acc:none', 'acc:party', 'acc:shades', 'acc:headphones', 'acc:flower', 'acc:none'];

export function myLook() {
  return progress.look();
}

export function botSeats(count, level, taken = []) {
  const names = BOT_NAMES.filter((n) => !taken.includes(n)).sort(() => Math.random() - 0.5);
  const chars = CHAR_IDS.map((c) => `char:${c}`).filter((c) => !taken.includes(c)).sort(() => Math.random() - 0.5);
  return Array.from({ length: count }, (_, i) => ({
    name: names[i],
    look: { char: chars[i % chars.length], acc: ACCS[Math.floor(Math.random() * ACCS.length)], frame: 'frame:none' },
    kind: 'bot',
    bot: { level: level === 'mixed' ? ['rookie', 'regular', 'expert', 'master'][i % 4] : level, persona: PERSONAS[Math.floor(Math.random() * PERSONAS.length)] },
  }));
}

/** Put a table on screen. `send` receives the player's actions. */
export function mountTable({ onAction, onEmote, onLeave }) {
  const p = store.profile();
  const root = document.getElementById('screen');
  root.innerHTML = '<div class="scr table-host scr-in"></div>';
  playMusic('table');
  platform.gameplayStart();
  app.handsPlayed = 0;
  app.handsWon = 0;
  app.gameEnded = false;
  const emotes = itemsOf('emote').filter((e) => progress.owns(e.id)).map((e) => e.id);
  app.table = new TableView(root.firstElementChild, {
    back: p.equipped.back.replace('back:', ''),
    table: p.equipped.table.replace('table:', ''),
    emotes,
    onAction,
    onEmote,
    onLeave,
    onSettings: () => openSettings(),
    onMute: () => {
      const s = store.profile().settings;
      const on = !(s.sound || s.music);
      store.setSetting('sound', on);
      store.setSetting('music', on);
    },
    soundOn: () => store.profile().settings.sound || store.profile().settings.music,
    vibrate: () => store.profile().settings.vibrate,
    onHandDone: handDone,
    onEnd: (r) => gameEnded(r),
    onWatchedOver: () => {
      if (app.pendingResults) {
        const r = app.pendingResults;
        app.pendingResults = null;
        go('results', r);
      }
    },
  });
  return app.table;
}

function handDone(h) {
  app.handsPlayed += 1;
  if (h.won) app.handsWon += 1;
  const r = progress.onHand({ won: h.won, cat: h.cat, showdown: h.showdown, allIn: h.allIn, royal: h.royal });
  for (const m of r.missions) toast(`✅ Mission complete: <b>${esc(m.text)}</b>`, 'good', 3200);
  for (const b of r.badges) toast(`🏅 New badge: <b>${esc(item(b).name)}</b>`, 'gold', 3200);
}

/** Take the stake when a game starts (returns false if the player can't pay). */
export function payStake(stake) {
  if (!store.spendCoins(stake)) return false;
  app.stakeInPlay = stake;
  sfx('chip', 4);
  return true;
}

/** The player's game is over: pay the prize once and show the results. */
export function gameEnded({ place, prize, left = false }) {
  if (app.gameEnded) return;
  app.gameEnded = true;
  const stake = app.stakeInPlay;
  app.stakeInPlay = 0;
  if (prize > 0) store.addCoins(prize);
  platform.gameplayStop();
  if (place === 1) platform.happytime();
  const players = app.table && app.table.s ? app.table.s.n : 2;
  const summary = progress.onGame({ place, players, prize, stake, handsPlayed: app.handsPlayed, handsWon: app.handsWon });
  if (app.mode === 'client' && app.conn) app.conn.send({ t: 'coins', coins: store.profile().coins });
  const mode = app.mode;
  const res = { place, players, prize, stake, left, mode, handsPlayedCount: app.handsPlayed, ...summary };
  // In a friend room the game may go on without you: watch until the end.
  const t = app.table;
  const stillRunning = mode !== 'solo' && !left && place > 1 && t && t.s && t.s.busted.filter((b) => !b).length > 1;
  if (stillRunning) {
    app.pendingResults = res;
    toast(`You finished ${['1st', '2nd', '3rd', '4th', '5th'][place - 1]}${prize ? ` and won ${coins(prize)}` : ''} — watching the rest of the game`, prize ? 'gold' : '', 4200);
    return;
  }
  setTimeout(() => go('results', res), left ? 0 : 400);
}

// ---------------------------------------------------------------- solo
export function startSolo({ players, stake, level }) {
  const p = store.profile();
  if (p.coins < stake) {
    toast(`Not enough coins for this table. You need ${coins(stake)}.`, 'bad');
    return false;
  }
  teardown();
  if (!payStake(stake)) return false;
  app.mode = 'solo';
  const me = { name: p.name, look: myLook(), kind: 'human' };
  const seats = [me, ...botSeats(players - 1, level, [p.name, me.look.char])];
  const table = mountTable({
    onAction: (a, turnId) => {
      const r = app.host && app.host.submit(0, a, turnId);
      if (r && !r.ok) toast(esc(r.reason), 'bad');
    },
    onEmote: (key) => {
      table.showEmote(0, key);
      // A bot answers now and then.
      if (Math.random() < 0.5) {
        const b = 1 + Math.floor(Math.random() * (players - 1));
        const k = ['laugh', 'cool', 'clap', 'fire', 'shock'][Math.floor(Math.random() * 5)];
        setTimeout(() => app.table && app.table.showEmote(b, k), 900 + Math.random() * 900);
      }
    },
    onLeave: leaveTable,
  });
  const speed = (p.settings.fast ? 1.6 : 1) * TEST_SPEED;
  app.host = new PokerHost({ seats, stake, speed, deliver: (i, ev) => i === 0 && app.table && app.table.push(ev) });
  app.host.start();
  // Bots react to big moments with an emote now and then.
  return true;
}

export async function leaveTable() {
  sfx('click');
  const t = app.table;
  const inGame = t && t.s && !t.s.ended;
  const busted = t && t.s && t.s.busted[t.s.you];
  if (app.mode === 'host' && busted && app.host && app.host.st && app.host.st.phase !== 'over') {
    // Knocked out but still hosting: leaving would end the game for everyone.
    if (!(await confirmBox('You are hosting — leaving closes the room and ends the game for your friends (they get their stakes back).', 'Close room', { title: 'Leave the table?' }))) return;
  }
  if (inGame && !busted) {
    const msg = app.mode === 'host' ? `You're hosting — leaving ends the game for everyone. Your ${coins(app.stakeInPlay)} stake is lost; your friends get theirs back.` : `You'll lose your ${coins(app.stakeInPlay)} stake and your seat.`;
    if (!(await confirmBox(msg, 'Leave table', { title: 'Leave the game?' }))) return;
    if (app.mode === 'solo' || app.mode === 'host') {
      // Count it as a finished game in last place.
      const place = t.s.n - t.s.busted.filter(Boolean).length;
      app.gameEnded = true;
      app.stakeInPlay = 0;
      progress.onGame({ place, players: t.s.n, prize: 0, stake: 0, handsPlayed: app.handsPlayed, handsWon: app.handsWon });
    } else if (app.conn) {
      app.conn.send({ t: 'leave' });
      app.gameEnded = true;
      app.stakeInPlay = 0;
    }
  }
  sfx('leave');
  platform.gameplayStop();
  go('leaveToHome');
}

export function teardown() {
  if (app.host) app.host.destroy();
  if (app.table) app.table.destroy();
  app.host = null;
  app.table = null;
}
