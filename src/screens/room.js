// Friend rooms: create/join by code, the lobby, and the network glue.
// The host's browser runs the game (PokerHost) and checks every action;
// friends only ever send requests ("I'd like to call") and draw what the
// host tells them.

import { app, register, go, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { STAKES, item } from '../profile/catalog.js';
import { hostRoom, joinRoom, cleanCode } from '../net.js';
import { PokerHost } from '../game/host.js';
import { mountTable, payStake, gameEnded, teardown, botSeats, leaveTable } from '../game/session.js';
import { avatarHtml } from '../ui/avatars.js';
import { $, $$, esc, fmt, coins, coinIco, modal, toast, confirmBox, closeModals } from '../ui/kit.js';
import { sfx, playMusic } from '../audio.js';
import { platform } from '../platform.js';
import { stakeCards, bindStakes, explainStake, needCoins } from './solo.js';
import { topBar, bindTopBar } from './home.js';

const ACTIVE_KEY = 'texaspoker.active';
const EMOTE_KEYS = new Set(['laugh', 'cool', 'shock', 'clap', 'fire', 'love', 'party', 'mind', 'crown', 'skull', 'gg', 'nice', 'allin', 'lucky']);
const LEVEL_CYCLE = ['rookie', 'regular', 'expert', 'master'];
const cleanName = (n) => String(n || 'Player').replace(/\s+/g, ' ').trim().slice(0, 14) || 'Player';

function setActive(v) {
  try {
    if (v) sessionStorage.setItem(ACTIVE_KEY, JSON.stringify({ ...v, t: Date.now() }));
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}
export function getActive() {
  try {
    const v = JSON.parse(sessionStorage.getItem(ACTIVE_KEY) || 'null');
    return v && Date.now() - v.t < 30 * 60000 ? v : null;
  } catch {
    return null;
  }
}

function cleanLook(l) {
  const ok = (id, kind, def) => (typeof id === 'string' && id.startsWith(`${kind}:`) && item(id) ? id : def);
  l = l && typeof l === 'object' ? l : {};
  return { char: ok(l.char, 'char', 'char:fox'), acc: ok(l.acc, 'acc', 'acc:none'), frame: ok(l.frame, 'frame', 'frame:none'), title: ok(l.title, 'title', 'title:rookie') };
}

function bestAffordable(stake) {
  const have = store.profile().coins;
  if (stake <= have) return stake;
  const ok = STAKES.filter((s) => s <= have);
  return ok.length ? ok[ok.length - 1] : 0;
}

// ================================================================ host
export async function createRoom() {
  const stake = bestAffordable(200);
  if (!stake) return needCoins();
  const p = store.profile();
  const wait = modal('<div class="empty-state"><div class="spinner" role="status"></div><h2>Creating your room…</h2><p class="m-hint">Connecting to the online service</p></div>', { dismiss: false, cls: 'small' });
  try {
    app.room = await hostRoom({ onJoin: hostOnJoin, onMessage: hostOnMessage, onLeave: hostOnLeave, onError: () => toast('Connection trouble — trying to keep the room open…', 'bad') });
  } catch (e) {
    wait.close();
    return modal(`<div class="empty-state"><div class="es-ico">📡</div><h2>Couldn't create a room</h2><p class="m-text">${esc(e.message)}</p></div>`, { cls: 'small' });
  }
  wait.close();
  teardown();
  app.mode = 'host';
  app.pendingSettle = new Map();
  app.lobby = { code: app.room.code, stake, inGame: false, botLevel: 'regular', seats: [{ id: 'host', pid: p.pid, name: p.name, look: progress.look(), coins: p.coins, kind: 'human', host: true, ready: true }] };
  sfx('join');
  renderLobby();
}

function publicSeats() {
  return app.lobby.seats.map(({ name, look, coins: c, kind, host, ready, bot }) => ({ name, look, coins: c, kind, host: !!host, ready: !!ready, botLevel: bot ? bot.level : null }));
}

function broadcastLobby() {
  const seats = publicSeats();
  app.lobby.seats.forEach((s, i) => {
    if (s.conn) app.room.send(s.conn, { t: 'lobby', code: app.lobby.code, stake: app.lobby.stake, seats, you: i });
  });
  renderLobby();
}

function kick(conn, reason) {
  app.room.send(conn, { t: 'kick', reason });
  setTimeout(() => {
    try {
      conn.close();
    } catch {
      /* ignore */
    }
  }, 300);
}

function hostOnJoin(conn, hello) {
  const L = app.lobby;
  if (!L) return;
  const pid = String(hello.pid || '').slice(0, 64);
  const name = cleanName(hello.name);
  if (L.inGame && app.host && pid) {
    const i = L.seats.findIndex((s) => s.pid === pid);
    if (i > 0 && app.host.canRejoin(i)) {
      L.seats[i].conn = conn;
      app.host.rejoin(i);
      app.room.send(conn, { t: 'lobby', code: L.code, stake: L.stake, seats: publicSeats(), you: i, inGame: true });
      app.room.send(conn, { t: 'ev', ev: app.host.snapshot(i) });
      toast(`${esc(name)} is back!`);
      sfx('join');
      return;
    }
  }
  if (L.inGame) return kick(conn, 'A game is already being played in this room. Try again when it ends.');
  const dup = pid ? L.seats.findIndex((s) => s.pid === pid && !s.host) : -1;
  if (dup > 0) {
    const old = L.seats[dup].conn;
    L.seats.splice(dup, 1);
    try {
      old && old.close();
    } catch {
      /* ignore */
    }
  }
  if (L.seats.length >= 5) return kick(conn, 'That room is already full (5 players).');
  L.seats.push({ id: conn.peer, pid, conn, name, look: cleanLook(hello.look), coins: Math.max(0, Math.floor(Number(hello.coins)) || 0), kind: 'human', ready: false });
  sfx('join');
  toast(`${esc(name)} joined!`);
  broadcastLobby();
  const owed = pid && app.pendingSettle.get(pid);
  if (owed) {
    app.pendingSettle.delete(pid);
    app.room.send(conn, { t: 'settle', ...owed });
  }
}

function seatIndexOf(conn) {
  return app.lobby ? app.lobby.seats.findIndex((s) => s.conn === conn) : -1;
}

function hostOnMessage(conn, msg) {
  const L = app.lobby;
  const i = seatIndexOf(conn);
  if (!L || i < 0) return;
  const seat = L.seats[i];
  switch (msg.t) {
    case 'act': {
      if (!app.host) return;
      const r = app.host.submit(i, msg.a, Number(msg.turnId));
      if (!r.ok) app.room.send(conn, { t: 'nack', reason: r.reason });
      break;
    }
    case 'emote': {
      const key = String(msg.key);
      const now = Date.now();
      if (!EMOTE_KEYS.has(key) || now - (seat.lastEmote || 0) < 1500) return;
      seat.lastEmote = now;
      emoteAll(i, key);
      break;
    }
    case 'coins':
      seat.coins = Math.max(0, Math.floor(Number(msg.coins)) || 0);
      if (!L.inGame) {
        if (seat.coins < L.stake) seat.ready = false;
        broadcastLobby();
      }
      break;
    case 'ready':
      if (L.inGame) return;
      seat.ready = !!msg.ready && seat.coins >= L.stake;
      broadcastLobby();
      break;
    case 'leave':
      seat.conn = null;
      if (L.inGame && app.host) {
        app.host.leave(i);
        toast(`${esc(seat.name)} left the table`);
      } else {
        L.seats.splice(i, 1);
        toast(`${esc(seat.name)} left`);
        broadcastLobby();
      }
      setTimeout(() => {
        try {
          conn.close();
        } catch {
          /* ignore */
        }
      }, 200);
      break;
    default:
  }
}

function hostOnLeave(conn) {
  const L = app.lobby;
  const i = seatIndexOf(conn);
  if (!L || i < 0) return;
  const s = L.seats[i];
  s.conn = null;
  if (L.inGame && app.host && app.host.st && app.host.st.phase !== 'over') {
    app.host.markAway(i);
    toast(`📶 ${esc(s.name)} lost connection — waiting for them to come back`);
  } else if (!L.inGame) {
    L.seats.splice(i, 1);
    toast(`${esc(s.name)} left`);
    broadcastLobby();
  }
}

function emoteAll(seat, key) {
  const ev = { type: 'emote', seat, key };
  for (const s of app.lobby.seats) if (s.conn) app.room.send(s.conn, { t: 'ev', ev });
  app.table && app.table.showEmote(seat, key);
}

function hostAddBot() {
  const L = app.lobby;
  if (L.seats.length >= 5) return;
  const taken = L.seats.map((s) => s.name).concat(L.seats.map((s) => s.look.char));
  const b = botSeats(1, L.botLevel, taken)[0];
  L.seats.push({ id: `bot-${Math.random()}`, ...b, ready: true, coins: 0 });
  sfx('pop');
  broadcastLobby();
}

function hostStart() {
  const L = app.lobby;
  if (L.inGame) return;
  if (L.seats.length < 2) return toast('You need at least 2 players — add a computer player!', 'bad');
  if (store.profile().coins < L.stake) return toast(`Not enough coins for this table — you need ${coins(L.stake)}.`, 'bad');
  const poor = L.seats.filter((s) => s.kind === 'human' && !s.host && s.coins < L.stake);
  if (poor.length) return toast(`${esc(poor.map((s) => s.name).join(', '))} can't afford this stake`, 'bad');
  const notReady = L.seats.filter((s) => s.kind === 'human' && !s.host && !s.ready);
  if (notReady.length) return toast(`Waiting for ${esc(notReady.map((s) => s.name).join(', '))} to tap Ready`, 'bad');
  if (!payStake(L.stake)) return;
  L.inGame = true;
  app.pendingSettle.clear();
  const seats = L.seats.map((s) => ({ name: s.name, look: s.look, kind: s.kind === 'bot' ? 'bot' : 'human', bot: s.bot }));
  mountTable({
    onAction: (a, turnId) => {
      const r = app.host && app.host.submit(0, a, turnId);
      if (r && !r.ok) toast(esc(r.reason), 'bad');
    },
    onEmote: (key) => emoteAll(0, key),
    onLeave: leaveTable,
  });
  app.host = new PokerHost({
    seats,
    stake: L.stake,
    speed: Number(new URLSearchParams(location.search).get('speed')) || 1,
    // Friends' tables animate on their own phones, so keep most of the fixed
    // timing as a floor and also wait for the host's own table.
    ready: () => (app.table ? app.table.idle() : null),
    paceMin: 0.75,
    deliver: (i, ev) => {
      if (i === 0) return app.table && app.table.push(ev);
      const s = L.seats[i];
      if (s && s.conn) app.room.send(s.conn, { t: 'ev', ev });
      // Remember results for friends who dropped out, in case they come back.
      if (s && s.pid && (ev.type === 'bust' ? ev.seat === i : ev.type === 'over') && !s.conn) {
        const place = ev.type === 'bust' ? ev.place : ev.standings.indexOf(i) + 1;
        const prize = ev.type === 'bust' ? ev.prize || 0 : ev.prizes[i] || 0;
        app.pendingSettle.set(s.pid, { place, prize, players: L.seats.length });
      }
    },
  });
  app.host.start();
}

export function hostBackToLobby() {
  const L = app.lobby;
  if (!L) return go('home');
  teardown();
  L.inGame = false;
  L.seats = L.seats.filter((s, i) => i === 0 || s.kind === 'bot' || s.conn);
  for (const s of L.seats) if (!s.host && s.kind === 'human') s.ready = false;
  L.seats[0].coins = store.profile().coins;
  L.stake = Math.min(L.stake, bestAffordable(L.stake) || STAKES[0]);
  broadcastLobby();
}

// ================================================================ lobby (host + friend)
function renderLobby() {
  if (!app.lobby || app.table || (app.screen === 'results' && app.lobby.inGame)) return;
  app.screen = 'lobby';
  playMusic('home');
  const L = app.lobby;
  const isHost = app.mode === 'host';
  const seats = isHost ? publicSeats() : L.seats;
  const me = isHost ? 0 : L.you;
  const link = platform.inviteLink(L.code, `${location.origin}${location.pathname}?room=${L.code}`);
  const friends = seats.filter((s) => s.kind === 'human' && !s.host);
  const notReady = friends.filter((s) => !s.ready).length;
  const slots = [];
  for (let i = 0; i < 5; i++) {
    const s = seats[i];
    if (s) {
      const short = s.kind === 'human' && s.coins < L.stake;
      let state;
      if (s.host) state = '<span class="st host">👑 Host</span>';
      else if (s.kind === 'bot') state = `<span class="st bot">🤖 ${esc((s.botLevel || 'regular').replace(/^./, (c) => c.toUpperCase()))}</span>`;
      else if (short) state = '<span class="st bad">Needs coins</span>';
      else state = s.ready ? '<span class="st ok">✓ Ready</span>' : '<span class="st wait">Not ready</span>';
      slots.push(`<div class="lslot filled ${i === me ? 'me' : ''}" style="--i:${i}">
        <span class="ls-av">${avatarHtml(s.look, { size: 'sm' })}</span>
        <span class="ls-nm">${esc(s.name)}${i === me ? ' <small>YOU</small>' : ''}</span>
        ${state}
        ${s.kind === 'human' ? `<span class="ls-c">${coinIco()}${fmt(s.coins)}</span>` : ''}
        ${isHost && !s.host ? `<button class="icon-btn rm" data-i="${i}" aria-label="Remove ${esc(s.name)}">✕</button>` : ''}
      </div>`);
    } else {
      slots.push(`<div class="lslot empty" style="--i:${i}">${isHost ? `<button class="add-bot">+ Add computer player <small class="lvl-pick">${esc(L.botLevel)}</small></button>` : '<span>Open seat — share the code!</span>'}</div>`);
    }
  }
  let startLabel = `<span>Start game · ${coinIco()}${fmt(L.stake)}</span>`;
  let canStart = true;
  if (seats.length < 2) (startLabel = 'Need 2+ players'), (canStart = false);
  else if (notReady) (startLabel = `Waiting for ${notReady} to be ready`), (canStart = false);
  const mine = seats[me];
  const afford = store.profile().coins >= L.stake;
  const clientBtn = !afford
    ? '<button class="btn ghost xl" disabled>Not enough coins for this stake</button>'
    : mine && mine.ready
      ? '<button class="btn ghost xl ready" data-r="0">✓ Ready — tap to cancel</button>'
      : `<button class="btn gold xl ready" data-r="1"><span>I'm in · ${coinIco()}${fmt(L.stake)}</span></button>`;
  const root = render(
    `${topBar()}
    <main class="lobby-main">
      <section class="lob-l">
        <h1>${isHost ? 'Your room' : 'Friend room'}</h1>
        <div class="code-card">
          <span class="cc-lbl">ROOM CODE</span>
          <div class="code" aria-label="Room code ${L.code.split('').join(' ')}">${L.code.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
          <div class="row"><button class="btn ghost copy">📋 Copy</button><button class="btn teal share">📨 Invite friends</button></div>
        </div>
        <div class="lob-stake">
          <div class="m-label">Stake ${isHost ? '' : '· chosen by the host'}</div>
          ${isHost ? stakeCards(L.stake) : `<div class="stake-show">${coins(L.stake)}</div>`}
          <p class="m-hint">${explainStake(L.stake, Math.max(2, seats.length))}</p>
        </div>
      </section>
      <section class="lob-r">
        <div class="m-label">Players ${seats.length}/5</div>
        <div class="lslots">${slots.join('')}</div>
        ${isHost ? `<button class="btn gold xl start" ${canStart ? '' : 'disabled'}>${startLabel}</button>` : clientBtn}
        <button class="btn ghost leave-room">${isHost ? 'Close room' : 'Leave room'}</button>
      </section>
    </main>`,
    'lobby',
  );
  bindTopBar(root);
  $('.leave-room', root).onclick = async () => {
    sfx('click');
    if (await confirmBox(isHost ? 'This closes the room for everyone.' : 'Leave this room?', 'Leave', { title: 'Leave the room?' })) {
      if (!isHost && app.conn) app.conn.send({ t: 'leave' });
      sfx('leave');
      go('leaveToHome');
    }
  };
  $('.copy', root).onclick = () => (sfx('click'), copyText(L.code).then(() => toast('Room code copied!')));
  $('.share', root).onclick = () => {
    sfx('click');
    const text = `Join my Texas Poker table! Room code: ${L.code}`;
    if (navigator.share) navigator.share({ title: 'Texas Poker', text, url: link }).catch(() => {});
    else copyText(`${text}\n${link}`).then(() => toast('Invite link copied!'));
  };
  if (isHost) {
    $$('.add-bot', root).forEach((b) =>
      b.addEventListener('click', (e) => {
        if (e.target.closest('.lvl-pick')) {
          L.botLevel = LEVEL_CYCLE[(LEVEL_CYCLE.indexOf(L.botLevel) + 1) % LEVEL_CYCLE.length];
          sfx('click');
          return renderLobby();
        }
        hostAddBot();
      }),
    );
    $$('.rm', root).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.i);
          const s = L.seats[i];
          if (!s || s.host) return;
          if (s.conn) kick(s.conn, 'The host removed you from the room.');
          L.seats.splice(i, 1);
          sfx('click');
          broadcastLobby();
        }),
    );
    bindStakes(root, (v) => {
      L.stake = v;
      for (const s of L.seats) if (!s.host && s.kind === 'human') s.ready = false;
      for (const s of L.seats) if (s.conn) app.room.send(s.conn, { t: 'notice', text: `The host changed the stake to ${fmt(v)}. Tap Ready if you're in.` });
      broadcastLobby();
    });
    const st = $('.start', root);
    let armed = false;
    if (st)
      st.onclick = () => {
        if (st.disabled) return;
        if (L.stake >= 1000 && !armed) {
          armed = true;
          st.classList.add('armed');
          st.innerHTML = `<span>Tap again to pay ${coinIco()}${fmt(L.stake)}</span>`;
          sfx('pop');
          setTimeout(() => app.screen === 'lobby' && renderLobby(), 3500);
          return;
        }
        sfx('click');
        hostStart();
      };
  } else {
    const rb = $('.ready', root);
    if (rb)
      rb.onclick = () => {
        sfx(rb.dataset.r === '1' ? 'chip' : 'click', 2);
        rb.disabled = true;
        app.conn && app.conn.send({ t: 'ready', ready: rb.dataset.r === '1' });
      };
  }
}

function copyText(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(() => fallbackCopy(t));
  return Promise.resolve(fallbackCopy(t));
}
function fallbackCopy(t) {
  const ta = document.createElement('textarea');
  ta.value = t;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  }
  ta.remove();
}

// ================================================================ friend (client)
export function joinDialog(prefill = '') {
  const m = modal(
    `<h2>Join a room</h2>
    <p class="m-text">Type the code your friend shared.</p>
    <input class="code-in" maxlength="8" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Room code" value="${esc(prefill)}" autofocus />
    <button class="btn teal xl go">Join 🚀</button>
    <p class="err" role="alert"></p>`,
    { cls: 'small' },
  );
  const input = $('.code-in', m.el);
  input.addEventListener('input', () => (input.value = cleanCode(input.value)));
  let busy = false;
  const goJoin = async () => {
    if (busy) return;
    const code = cleanCode(input.value);
    if (code.length < 4) return ($('.err', m.el).textContent = 'Room codes are 5 letters and numbers.');
    busy = true;
    const btn = $('.go', m.el);
    btn.disabled = true;
    btn.innerHTML = '<span class="mini-spin" aria-hidden="true"></span> Connecting…';
    $('.err', m.el).textContent = '';
    try {
      await joinByCode(code);
      m.close();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Join 🚀';
      $('.err', m.el).textContent = e.message;
      sfx('deny');
    }
    busy = false;
  };
  $('.go', m.el).onclick = goJoin;
  input.addEventListener('keydown', (e) => e.key === 'Enter' && goJoin());
}

function hello() {
  const p = store.profile();
  return { name: p.name, look: progress.look(), coins: p.coins, pid: p.pid };
}

async function joinByCode(code) {
  const conn = await joinRoom(code, hello(), { onMessage: clientOnMessage, onClose: clientOnClose });
  teardown();
  app.mode = 'client';
  app.conn = conn;
  app.lobby = { code, stake: 0, seats: [], you: 0 };
  const act = getActive();
  if (!act || act.code !== code) setActive(null);
  render('<div class="loading-state"><div class="spinner" role="status"></div><div class="waiting big">Joining room…</div></div>', 'lobby');
}

function clientMount() {
  closeModals();
  mountTable({
    onAction: (a, turnId) => app.conn && app.conn.send({ t: 'act', a, turnId }),
    onEmote: (key) => app.conn && app.conn.send({ t: 'emote', key }),
    onLeave: leaveTable,
  });
}

function clientOnMessage(msg) {
  if (app.mode !== 'client') return;
  switch (msg.t) {
    case 'lobby': {
      if (app.table && !msg.inGame) {
        teardown();
        toast('Back in the room');
      }
      app.lobby = { code: msg.code, stake: msg.stake, seats: msg.seats, you: msg.you };
      if (!msg.inGame && app.screen !== 'results') renderLobby();
      if (!msg.inGame && app.screen === 'results') {
        // Host went back to the room while we were on the results screen.
        const w = $('.res-actions .waiting');
        if (w) {
          w.outerHTML = '<button class="btn gold lg to-lobby">Back to room</button>';
          $('.to-lobby').onclick = () => (sfx('click'), renderLobby());
        }
      }
      break;
    }
    case 'ev': {
      const ev = msg.ev;
      if ((ev.type === 'start' || ev.type === 'sync') && !app.table) clientMount();
      if (ev.type === 'start') {
        payStake(ev.stake);
        setActive({ code: app.lobby.code, stake: ev.stake });
      }
      if (ev.type === 'sync') {
        const act = getActive();
        if (!app.stakeInPlay && act && act.code === app.lobby.code) app.stakeInPlay = act.stake;
      }
      if ((ev.type === 'bust' && ev.seat === (app.table && app.table.s ? app.table.s.you : -1)) || ev.type === 'over') setActive(null);
      if (app.table) app.table.push(ev);
      break;
    }
    case 'nack':
      toast(esc(String(msg.reason || 'That move was not allowed').slice(0, 80)), 'bad');
      break;
    case 'settle': {
      const act = getActive();
      if (act && act.code === app.lobby.code && !app.table) {
        setActive(null);
        app.stakeInPlay = act.stake;
        app.gameEnded = false;
        toast(`The game you dropped out of has finished — you placed ${['1st', '2nd', '3rd', '4th', '5th'][msg.place - 1]}`, msg.prize ? 'gold' : '', 4000);
        gameEnded({ place: msg.place, prize: msg.prize || 0 });
      }
      break;
    }
    case 'notice':
      toast(esc(String(msg.text).slice(0, 140)));
      break;
    case 'kick':
      app.leaving = true;
      app.conn && app.conn.close();
      app.conn = null;
      setActive(null);
      go('home');
      modal(`<div class="empty-state"><div class="es-ico">🚪</div><h2>Can't join</h2><p class="m-text">${esc(msg.reason)}</p></div>`, { cls: 'small' });
      app.leaving = false;
      break;
    case 'closed':
      hostGone('The host closed the room.');
      break;
    default:
  }
}

function clientOnClose() {
  if (app.leaving || app.mode !== 'client' || app.reconnecting) return;
  reconnect();
}

async function reconnect() {
  const code = app.lobby && app.lobby.code;
  if (!code) return hostGone('Connection lost.');
  app.reconnecting = true;
  app.conn = null;
  const m = modal(
    `<div class="empty-state"><div class="spinner" role="status"></div><h2>Connection lost — reconnecting…</h2>
    <p class="m-text">${app.table ? 'Your seat is kept for you. If it’s your turn you’ll check or fold automatically.' : 'Trying to get you back into the room.'}</p></div>
    <button class="btn ghost give-up">Leave</button>`,
    { dismiss: false, cls: 'small' },
  );
  let giveUp = false;
  $('.give-up', m.el).onclick = () => ((giveUp = true), m.close());
  const until = Date.now() + 30000;
  while (!giveUp && Date.now() < until && app.mode === 'client') {
    try {
      const conn = await joinRoom(code, hello(), { onMessage: clientOnMessage, onClose: clientOnClose, timeoutMs: 8000 });
      if (giveUp || app.mode !== 'client') {
        conn.close();
        break;
      }
      app.conn = conn;
      app.reconnecting = false;
      m.close();
      toast("You're back! 👋", 'gold');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  app.reconnecting = false;
  m.close();
  if (app.mode === 'client') hostGone(giveUp ? 'You left the room.' : "Couldn't reconnect to the room.");
}

function hostGone(text) {
  if (app.mode !== 'client') return;
  const refund = app.gameEnded ? 0 : app.stakeInPlay;
  if (refund) store.addCoins(refund); // the game can't finish for us: stake back
  app.stakeInPlay = 0;
  setActive(null);
  app.leaving = true;
  app.conn && app.conn.close();
  app.conn = null;
  go('home');
  modal(`<div class="empty-state"><div class="es-ico">📡</div><h2>Room closed</h2><p class="m-text">${esc(text)}${refund ? ` Your ${coins(refund)} stake was returned.` : ''}</p></div>`, { cls: 'small' });
  app.leaving = false;
}

register('lobby', renderLobby);
