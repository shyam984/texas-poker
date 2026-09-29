// The poker table: seats, cards, chips, betting controls and every
// animation. It only draws what the host tells it (an event stream), so it
// works identically for solo games and friend rooms.

import { cardEl, reveal, suitSvg } from './cards.js';
import { stackHtml, breakdown, chipEl } from './chips.js';
import { avatarHtml } from './avatars.js';
import { $, $$, esc, fmt, coins, coinIco, tweenNumber, wait, center, reducedMotion } from './kit.js';
import { sfx, buzz } from '../audio.js';
import { confetti, sparks, coinShower } from './fx.js';
import { currentHand, rankingsHtml, youHaveHtml } from './rankings.js';
import { item } from '../profile/catalog.js';

const PLACE = ['1st', '2nd', '3rd', '4th', '5th'];
const ACTION_WORD = { fold: 'FOLD', check: 'CHECK', call: 'CALL', bet: 'BET', raise: 'RAISE', allin: 'ALL IN' };

export class TableView {
  constructor(root, o) {
    this.root = root;
    this.o = o; // { back, table, emotes, onAction, onEmote, onLeave, onSettings, onMute, onEnd, onHandDone, vibrate }
    this.queue = [];
    this.busy = false;
    this.dead = false;
    this.timers = new Set();
    this.speed = (reducedMotion() ? 0.5 : 1) / (Number(new URLSearchParams(location.search).get('speed')) || 1);
    this.s = null; // table state
    this.pre = { checkFold: false, callAny: false };
    this.build();
    this.onResize = () => {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.layout());
    };
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.keyHandler = (e) => this.onKey(e);
    window.addEventListener('keydown', this.keyHandler);
  }

  destroy() {
    this.dead = true;
    const w = this.idleWaiters;
    this.idleWaiters = null;
    if (w) for (const r of w) r();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    window.removeEventListener('keydown', this.keyHandler);
    cancelAnimationFrame(this.raf);
    for (const t of this.timers) clearTimeout(t);
    clearInterval(this.tick);
    this.root.innerHTML = '';
  }

  after(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (!this.dead) fn();
    }, ms);
    this.timers.add(id);
    return id;
  }

  wait(ms) {
    return new Promise((r) => this.after(ms * this.speed, r));
  }

  // ---------------------------------------------------------------- DOM
  build() {
    const emotes = (this.o.emotes || []).map((id) => item(id)).filter(Boolean);
    this.root.innerHTML = `
      <div class="tbl-screen tbl-${esc(this.o.table || 'classic')}">
        <header class="tbar">
          <button class="icon-btn t-leave" aria-label="Leave table" title="Leave table">✕</button>
          <div class="pill blinds" title="Blinds"><span class="lbl">BLINDS</span><b class="bl-v">–</b><small class="bl-next"></small></div>
          <div class="pill prize" title="Prize for 1st place"><span aria-hidden="true">🏆</span><b class="pz-v">–</b></div>
          <span class="grow"></span>
          <button class="icon-btn t-help" aria-label="Hand rankings" title="Hand rankings (H)" aria-expanded="false">?</button>
          <button class="icon-btn t-mute" aria-label="Mute"></button>
          <button class="icon-btn t-settings" aria-label="Settings">⚙</button>
        </header>
        <div class="stage">
          <div class="felt-box">
            <div class="felt">
              <div class="felt-inner"></div>
              <div class="felt-logo" aria-hidden="true"><span>TEXAS</span><span>POKER</span></div>
              <div class="deck" aria-hidden="true"><i></i><i></i><i></i></div>
              <div class="pot" aria-live="polite"><span class="pot-chips"></span><span class="pot-lbl">POT <b class="pot-v">0</b></span></div>
              <div class="board" aria-label="Community cards">${'<div class="slot"></div>'.repeat(5)}</div>
              <div class="center-msg"></div>
            </div>
            <div class="bets"></div>
            <div class="dbtn" aria-label="Dealer button">D</div>
          </div>
          <div class="seats"></div>
        </div>
        <div class="hud">
          <div class="hud-me"></div>
          <div class="hud-act">
            <div class="act-info" aria-live="polite"></div>
            <div class="actions" hidden>
              <button class="abtn fold" data-a="fold"><span class="ak">F</span><span class="at">FOLD</span></button>
              <button class="abtn check" data-a="check"><span class="ak">C</span><span class="at">CHECK</span></button>
              <button class="abtn raise" data-a="raise"><span class="ak">R</span><span class="at">RAISE</span></button>
            </div>
            <div class="pre" hidden>
              <button class="pbtn" data-p="checkFold" aria-pressed="false"><i></i>Check / Fold</button>
              <button class="pbtn" data-p="callAny" aria-pressed="false"><i></i>Call any</button>
            </div>
            <div class="waitmsg" hidden></div>
          </div>
          <div class="raise-panel" hidden role="dialog" aria-label="Choose your bet">
            <div class="rp-top"><span class="rp-lbl">RAISE TO</span><b class="rp-amt">0</b><button class="icon-btn rp-x" aria-label="Cancel">✕</button></div>
            <div class="rp-slider">
              <button class="rp-step" data-d="-1" aria-label="Less">−</button>
              <input type="range" class="rp-range" aria-label="Bet amount" />
              <button class="rp-step" data-d="1" aria-label="More">+</button>
            </div>
            <div class="rp-presets"></div>
            <div class="rp-info"></div>
            <button class="btn gold rp-go">Raise</button>
          </div>
        </div>
        <button class="icon-btn emote-btn" aria-label="Emotes">😀</button>
        <div class="emote-tray" hidden>${emotes
          .map((e) => `<button class="em ${e.sticker ? 'sticker' : ''}" data-e="${e.key}" aria-label="${esc(e.name)}">${e.glyph ? e.glyph : esc(e.sticker)}</button>`)
          .join('')}</div>
        <div class="hr-panel" hidden role="dialog" aria-label="Hand rankings">
          <div class="hr-head"><div><h3>Hand rankings</h3><small>Best hand at the top · use your 2 cards + the table</small></div><button class="icon-btn hr-x" aria-label="Close hand rankings">✕</button></div>
          <div class="hr-you-box"></div>
          <div class="hr-body"></div>
          <p class="hr-tip">Same hand? Higher cards win (a pair of Kings beats a pair of 7s). Suits never rank. Ace can be low too: A-2-3-4-5.</p>
        </div>
        <div class="fly"></div>
        <div class="banner" aria-live="assertive"></div>
      </div>`;
    const q = (x) => $(x, this.root);
    this.el = {
      screen: q('.tbl-screen'),
      stage: q('.stage'),
      box: q('.felt-box'),
      felt: q('.felt'),
      deck: q('.deck'),
      pot: q('.pot'),
      potV: q('.pot-v'),
      potChips: q('.pot-chips'),
      board: q('.board'),
      slots: $$('.board .slot', this.root),
      msg: q('.center-msg'),
      bets: q('.bets'),
      dbtn: q('.dbtn'),
      seats: q('.seats'),
      hudMe: q('.hud-me'),
      actions: q('.actions'),
      info: q('.act-info'),
      pre: q('.pre'),
      waitmsg: q('.waitmsg'),
      rp: q('.raise-panel'),
      range: q('.rp-range'),
      rpAmt: q('.rp-amt'),
      rpLbl: q('.rp-lbl'),
      rpPresets: q('.rp-presets'),
      rpInfo: q('.rp-info'),
      rpGo: q('.rp-go'),
      tray: q('.emote-tray'),
      fly: q('.fly'),
      banner: q('.banner'),
      blV: q('.bl-v'),
      blNext: q('.bl-next'),
      pzV: q('.pz-v'),
      mute: q('.t-mute'),
      help: q('.t-help'),
      hr: q('.hr-panel'),
    };
    q('.t-leave').onclick = () => this.o.onLeave();
    q('.t-settings').onclick = () => this.o.onSettings();
    this.el.help.onclick = (e) => {
      e.stopPropagation();
      this.toggleRanks();
    };
    q('.hr-x').onclick = () => this.toggleRanks(false);
    this.el.mute.onclick = () => {
      this.o.onMute();
      this.updateMute();
    };
    this.updateMute();
    this.el.actions.addEventListener('click', (e) => {
      const b = e.target.closest('.abtn');
      if (b && !b.disabled) this.clickAction(b.dataset.a);
    });
    this.el.pre.addEventListener('click', (e) => {
      const b = e.target.closest('.pbtn');
      if (!b) return;
      const k = b.dataset.p;
      const on = !this.pre[k];
      this.pre = { checkFold: false, callAny: false };
      this.pre[k] = on;
      sfx('click');
      this.renderPre();
    });
    // Raise panel
    this.el.range.addEventListener('input', () => this.setRaise(Number(this.el.range.value), false));
    q('.rp-x').onclick = () => this.closeRaise();
    $$('.rp-step', this.root).forEach((b) => (b.onclick = () => this.stepRaise(Number(b.dataset.d))));
    this.el.rpPresets.addEventListener('click', (e) => {
      const b = e.target.closest('.rpp');
      if (!b) return;
      sfx('chip', 1);
      this.setRaise(Number(b.dataset.v), true);
    });
    this.el.rpGo.onclick = () => this.confirmRaise();
    // Emotes
    q('.emote-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.el.tray.hidden = !this.el.tray.hidden;
      sfx('click');
    });
    this.el.tray.addEventListener('click', (e) => {
      const b = e.target.closest('.em');
      if (!b) return;
      this.el.tray.hidden = true;
      if (Date.now() - (this.lastEmote || 0) < 1500) return;
      this.lastEmote = Date.now();
      this.o.onEmote(b.dataset.e);
    });
    this.el.screen.addEventListener('click', (e) => {
      if (!this.el.tray.hidden && !e.target.closest('.emote-tray, .emote-btn')) this.el.tray.hidden = true;
      if (!this.el.hr.hidden && !e.target.closest('.hr-panel, .t-help, .my-hand-label, .hud, .tbar')) this.toggleRanks(false);
    });
  }

  updateMute() {
    const on = this.o.soundOn();
    this.el.mute.textContent = on ? '🔊' : '🔇';
    this.el.mute.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
  }

  // ---------------------------------------------------------------- hand rankings (?)
  myHand() {
    const s = this.s;
    if (!s || s.busted[s.you]) return null;
    return currentHand(s.cards[s.you], s.board);
  }

  toggleRanks(open = this.el.hr.hidden) {
    const p = this.el.hr;
    if (open === !p.hidden) return;
    sfx(open ? 'pop' : 'click');
    p.hidden = !open;
    this.el.help.classList.toggle('on', open);
    this.el.help.setAttribute('aria-expanded', String(open));
    if (!open) return;
    this.renderRanks();
    this.fitRanks();
    this.scrollRanks();
    p.classList.remove('in');
    void p.offsetWidth;
    p.classList.add('in');
  }

  renderRanks() {
    if (this.el.hr.hidden) return;
    const s = this.s;
    const cur = this.myHand();
    const folded = !!(s && s.folded[s.you] && cur);
    $('.hr-you-box', this.el.hr).innerHTML = youHaveHtml(cur, { folded });
    // Only rebuild the chart when the highlighted row changes.
    const key = cur ? cur.key : '';
    if (this.hrKey !== key || !$('.hh', this.el.hr)) {
      this.hrKey = key;
      $('.hr-body', this.el.hr).innerHTML = rankingsHtml(cur, { compact: true });
      this.scrollRanks();
    }
  }

  /** Bring your row into the middle of the list (without moving the page). */
  scrollRanks() {
    const body = $('.hr-body', this.el.hr);
    const row = $('.hh.you', this.el.hr);
    this.el.hr.scrollTop = 0;
    if (!row || this.el.hr.hidden) return;
    const br = body.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    body.scrollTop += rr.top - br.top - (br.height - rr.height) / 2;
  }

  /** Keep the panel clear of the action buttons. */
  fitRanks() {
    const p = this.el.hr;
    if (p.hidden) return;
    p.style.maxHeight = '';
    const scr = this.el.screen.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const act = $('.hud-act', this.root).getBoundingClientRect();
    const hud = $('.hud', this.root).getBoundingClientRect();
    const sideBySide = pr.right + 8 < act.left;
    const bottom = sideBySide ? scr.bottom - 8 : hud.top + 4;
    p.style.maxHeight = `${Math.max(160, bottom - pr.top)}px`;
  }

  // ---------------------------------------------------------------- geometry
  /** Angle (radians) of a seat relative to you (you are at the bottom). */
  angle(seat) {
    const rel = (seat - this.s.you + this.s.n) % this.s.n;
    return ((90 + (rel * 360) / this.s.n) * Math.PI) / 180;
  }

  layout() {
    if (!this.s || this.dead) return;
    const st = this.el.stage.getBoundingClientRect();
    const portrait = st.height > st.width * 1.05;
    this.portrait = portrait;
    this.el.screen.classList.toggle('portrait', portrait);
    const av = Math.round(Math.max(40, Math.min(76, Math.min(st.width, st.height) * 0.14)));
    // Leave room around the oval for the seats.
    const padX = av * (portrait ? 0.9 : 1.55);
    const padY = av * (portrait ? 1.35 : 0.95);
    let fw = st.width - padX * 2;
    let fh = st.height - padY * 2;
    const ratio = portrait ? 0.7 : 2.05; // width / height of the oval
    if (fw / fh > ratio) fw = fh * ratio;
    else fh = fw / ratio;
    fw = Math.max(200, fw);
    fh = Math.max(120, fh);
    const box = this.el.box;
    box.style.width = `${fw}px`;
    box.style.height = `${fh}px`;
    box.style.left = `${(st.width - fw) / 2}px`;
    box.style.top = `${(st.height - fh) / 2 + (portrait ? 0 : av * 0.08)}px`;
    // Card sizes
    const bw = Math.round(Math.max(30, Math.min(88, (fw * 0.66) / 5.4, (fh * (portrait ? 0.2 : 0.36)) / 1.4)));
    this.el.screen.style.setProperty('--bw', `${bw}px`);
    this.el.screen.style.setProperty('--ow', `${Math.round(Math.max(22, bw * 0.56))}px`);
    this.el.screen.style.setProperty('--av', `${av}px`);
    const hudH = this.el.screen.querySelector('.hud').getBoundingClientRect().height;
    const hw = Math.round(Math.max(44, Math.min(96, bw * 1.25, (hudH || 90) * 0.78 / 1.4 + 6)));
    this.el.screen.style.setProperty('--hw', `${hw}px`);
    this.fw = fw;
    this.fh = fh;
    // Seats around the oval
    const rx = fw / 2 + av * (portrait ? 0.35 : 0.62);
    const ry = fh / 2 + av * (portrait ? 0.55 : 0.4);
    const cx = st.width / 2;
    const cy = parseFloat(box.style.top) + fh / 2;
    for (let s = 0; s < this.s.n; s++) {
      if (s === this.s.you) continue;
      const el = this.seatEl(s);
      if (!el) continue;
      const a = this.angle(s);
      let x = cx + Math.cos(a) * rx;
      let y = cy + Math.sin(a) * ry;
      x = Math.max(av * 0.75, Math.min(st.width - av * 0.75, x));
      y = Math.max(av * 0.62, Math.min(st.height - av * 0.9, y));
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.classList.toggle('side-l', Math.cos(a) < -0.3);
      el.classList.toggle('side-r', Math.cos(a) > 0.3);
      el.classList.toggle('side-t', Math.sin(a) < -0.5);
    }
    // Bet spots and dealer button, in felt-box coordinates
    for (let s = 0; s < this.s.n; s++) {
      const b = this.betEl(s);
      if (!b) continue;
      const p = this.betPoint(s);
      b.style.left = `${p.x}px`;
      b.style.top = `${p.y}px`;
    }
    this.placeDealer(false);
    this.fitRanks();
  }

  betPoint(seat) {
    const a = this.angle(seat);
    const kx = this.portrait ? 0.62 : 0.66;
    const ky = this.portrait ? 0.68 : 0.6;
    return { x: this.fw / 2 + Math.cos(a) * (this.fw / 2) * kx, y: this.fh / 2 + Math.sin(a) * (this.fh / 2) * ky };
  }

  placeDealer(animate = true) {
    const s = this.s;
    if (!s || s.dealer < 0) {
      this.el.dbtn.classList.remove('show');
      return;
    }
    const a = this.angle(s.dealer);
    const p = this.betPoint(s.dealer);
    const off = Math.max(18, this.fw * 0.045);
    const x = p.x + Math.cos(a + Math.PI / 2) * off * 1.3 + Math.cos(a) * off * 0.25;
    const y = p.y + Math.sin(a + Math.PI / 2) * off * 0.8 + Math.sin(a) * off * 0.25;
    this.el.dbtn.style.transition = animate ? '' : 'none';
    this.el.dbtn.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    this.el.dbtn.classList.add('show');
  }

  seatEl(s) {
    if (s === this.s.you) return $('.seat.me', this.el.hudMe);
    return $(`.seat[data-seat="${s}"]`, this.el.seats);
  }

  betEl(s) {
    return $(`.bet[data-seat="${s}"]`, this.el.bets);
  }

  avatarPoint(s) {
    const el = this.seatEl(s);
    return el ? center($('.s-av', el)) : center(this.el.felt);
  }

  // ---------------------------------------------------------------- seats
  renderSeats() {
    const s = this.s;
    this.el.seats.innerHTML = '';
    this.el.bets.innerHTML = '';
    for (let i = 0; i < s.n; i++) {
      const info = s.seats[i];
      const me = i === s.you;
      const title = info.look && info.look.title ? (item(info.look.title) || {}).name : '';
      const html = `
        <div class="s-av">
          ${avatarHtml(info.look || {}, { size: me ? 'me' : '' })}
          <svg class="timer" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/></svg>
          <span class="s-tag" aria-live="polite"></span>
        </div>
        <div class="s-plate">
          <span class="s-name">${esc(info.name)}${info.kind === 'bot' ? `<small>${esc((info.botLevel || 'bot').toUpperCase())}</small>` : ''}</span>
          <span class="s-chips">${coinIco()}<b data-v="0">0</b></span>
        </div>
        <div class="s-cards"></div>
        <div class="s-hand"></div>
        <div class="s-status"></div>
        ${title && !me ? `<span class="s-title">${esc(title)}</span>` : ''}`;
      const d = document.createElement('div');
      d.className = `seat ${me ? 'me' : ''} ${info.kind}`;
      d.dataset.seat = i;
      d.innerHTML = html;
      if (me) {
        this.el.hudMe.innerHTML = '';
        this.el.hudMe.appendChild(d);
        const lab = document.createElement('button');
        lab.className = 'my-hand-label';
        lab.title = 'Hand rankings';
        lab.onclick = (e) => (e.stopPropagation(), this.toggleRanks());
        this.el.hudMe.appendChild(lab);
      } else this.el.seats.appendChild(d);
      const b = document.createElement('div');
      b.className = 'bet';
      b.dataset.seat = i;
      b.innerHTML = '<span class="bet-chips"></span><span class="bet-amt"></span>';
      this.el.bets.appendChild(b);
      this.setStatus(i, info.status || 'here', true);
    }
    this.layout();
  }

  setStack(seat, v, animate = true) {
    this.s.stacks[seat] = v;
    const b = $('.s-chips b', this.seatEl(seat) || document.createElement('div'));
    if (!b) return;
    if (animate) tweenNumber(b, v, 500);
    else {
      b.dataset.v = String(v);
      b.textContent = fmt(v);
    }
  }

  setBet(seat, v) {
    this.s.bets[seat] = v;
    const b = this.betEl(seat);
    if (!b) return;
    if (v > 0) {
      b.querySelector('.bet-chips').innerHTML = stackHtml(v, { max: 6 });
      b.querySelector('.bet-amt').textContent = fmt(v);
      b.classList.add('show');
    } else b.classList.remove('show');
  }

  tag(seat, text, cls = '') {
    const el = this.seatEl(seat);
    if (!el) return;
    const t = $('.s-tag', el);
    t.className = `s-tag show ${cls}`;
    t.textContent = text;
    clearTimeout(t._t);
    if (cls !== 'allin' && cls !== 'out') t._t = setTimeout(() => t.classList.remove('show'), 1600 * this.speed + 400);
  }

  react(seat, kind) {
    if (reducedMotion()) return;
    const el = this.seatEl(seat);
    const av = el && $('.avatar', el);
    if (!av) return;
    av.classList.remove('r-win', 'r-lose', 'r-fold', 'r-excited');
    void av.offsetWidth;
    av.classList.add(`r-${kind}`);
    this.after(1400, () => av.classList.remove(`r-${kind}`));
  }

  setStatus(seat, status, quiet = false) {
    this.s.seats[seat].status = status;
    const el = this.seatEl(seat);
    if (!el) return;
    const label = { away: '📶 Reconnecting…', left: 'Left the table' }[status] || '';
    const st = $('.s-status', el);
    st.textContent = label;
    st.classList.toggle('show', !!label);
    el.classList.toggle('away', status === 'away' || status === 'left');
    if (!quiet && status === 'here') this.floatText(seat, 'Back! 👋', 'good');
  }

  setTurn(seat, seconds = 0) {
    for (const el of $$('.seat', this.root)) el.classList.remove('turn', 'urgent');
    clearInterval(this.tick);
    this.s.turn = seat;
    const el = seat >= 0 ? this.seatEl(seat) : null;
    if (!el) return;
    el.classList.add('turn');
    const c = $('.timer circle', el);
    c.style.transition = 'none';
    c.style.strokeDashoffset = '0';
    if (seconds > 0) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          c.style.transition = `stroke-dashoffset ${seconds}s linear`;
          c.style.strokeDashoffset = '296';
        }),
      );
      const end = Date.now() + seconds * 1000;
      this.tick = setInterval(() => {
        const left = (end - Date.now()) / 1000;
        if (left <= 6) el.classList.add('urgent');
        if (seat === this.s.you && left <= 5 && left > 0) sfx('tick');
        if (left <= 0) clearInterval(this.tick);
      }, 1000);
    }
  }

  // ---------------------------------------------------------------- flying things
  fly(node, from, to, { dur = 420, r0 = 0, r1 = 0, s0 = 1, s1 = 1, ease = 'cubic-bezier(.2,.8,.25,1)', keep = false, arc = 0 } = {}) {
    this.el.fly.appendChild(node);
    const w = node.offsetWidth;
    const h = node.offsetHeight;
    const tf = (p, r, s) => `translate(${p.x - w / 2}px, ${p.y - h / 2}px) rotate(${r}deg) scale(${s})`;
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - arc };
    const frames = arc ? [{ transform: tf(from, r0, s0) }, { transform: tf(mid, (r0 + r1) / 2, (s0 + s1) / 2), offset: 0.5 }, { transform: tf(to, r1, s1) }] : [{ transform: tf(from, r0, s0) }, { transform: tf(to, r1, s1) }];
    const anim = node.animate(frames, { duration: Math.max(1, dur * this.speed), easing: ease, fill: 'forwards' });
    return anim.finished.then(
      () => {
        if (!keep) node.remove();
        return node;
      },
      () => node.remove(),
    );
  }

  /** Chips from one point to another (a few staggered chips). */
  flyChips(amount, from, to, { n = 0, dur = 420 } = {}) {
    const colors = breakdown(amount, n || Math.min(6, Math.max(2, Math.ceil(Math.log10(amount + 1) * 1.6))));
    return Promise.all(
      colors.map((c, i) =>
        this.wait(i * 40).then(() => {
          const jitter = () => (Math.random() - 0.5) * 14;
          return this.fly(chipEl(c), { x: from.x + jitter(), y: from.y + jitter() }, { x: to.x + jitter() * 0.4, y: to.y + jitter() * 0.4 }, { dur, arc: 18, ease: 'cubic-bezier(.3,.7,.3,1)' });
        }),
      ),
    );
  }

  floatText(seat, text, cls = '') {
    if (this.dead || !this.s) return;
    const p = this.avatarPoint(seat);
    const n = document.createElement('div');
    n.className = `float-note ${cls}`;
    n.textContent = text;
    n.style.left = `${p.x}px`;
    n.style.top = `${p.y - 30}px`;
    this.el.fly.appendChild(n);
    this.after(1500, () => n.remove());
  }

  async banner(html, cls = '', ms = 1200) {
    const b = this.el.banner;
    b.className = `banner ${cls}`;
    b.innerHTML = `<div class="b-in">${html}</div>`;
    void b.offsetWidth;
    b.classList.add('show');
    await this.wait(ms);
    b.classList.remove('show');
  }

  centerMsg(html, ms = 1600) {
    const m = this.el.msg;
    m.innerHTML = html;
    m.classList.remove('show');
    void m.offsetWidth;
    m.classList.add('show');
    clearTimeout(this.msgT);
    this.msgT = setTimeout(() => m.classList.remove('show'), ms);
  }

  // ---------------------------------------------------------------- events
  push(ev) {
    this.queue.push(ev);
    if (!this.busy) this.run();
  }

  /** Resolves once every queued event has been shown. */
  idle() {
    if (this.dead || (!this.busy && !this.queue.length)) return Promise.resolve();
    return new Promise((r) => (this.idleWaiters || (this.idleWaiters = [])).push(r));
  }

  async run() {
    this.busy = true;
    while (this.queue.length && !this.dead) {
      const ev = this.queue.shift();
      const saved = this.speed;
      // If we fall behind (slow phone, hidden tab, network burst), speed up
      // gently in proportion to how far behind we are rather than jumping.
      const behind = this.queue.length;
      if (behind > 4) this.speed = Math.min(this.speed, behind > 10 ? 0.35 : 0.6);
      try {
        await this.handle(ev);
      } catch (err) {
        console.error('[table]', ev.type, err);
      }
      this.speed = saved;
    }
    this.busy = false;
    const w = this.idleWaiters;
    this.idleWaiters = null;
    if (w) for (const r of w) r();
  }

  handle(ev) {
    const h = {
      start: this.onStart,
      sync: this.onSync,
      hand: this.onHand,
      level: this.onLevel,
      deal: this.onDeal,
      blind: this.onBlind,
      action: this.onActionEv,
      turn: this.onTurn,
      collect: this.onCollect,
      street: this.onStreet,
      reveal: this.onReveal,
      result: this.onResult,
      bust: this.onBust,
      over: this.onOver,
      seat: this.onSeat,
      emote: (e) => this.showEmote(e.seat, e.key),
    }[ev.type];
    return h ? h.call(this, ev) : null;
  }

  freshState(ev) {
    const n = ev.seats.length;
    this.s = {
      n,
      you: ev.you,
      seats: ev.seats.map((x) => ({ ...x })),
      stake: ev.stake,
      prizes: ev.prizes,
      stacks: Array(n).fill(ev.startStack || 0),
      bets: Array(n).fill(0),
      folded: Array(n).fill(false),
      allIn: Array(n).fill(false),
      busted: Array(n).fill(false),
      inHand: Array(n).fill(false),
      cards: Array.from({ length: n }, () => []),
      board: [],
      dealer: -1,
      pot: 0,
      turn: -1,
      handNo: 0,
      sb: 0,
      bb: 0,
      level: 0,
      legal: null,
      turnId: 0,
      handsPerLevel: ev.handsPerLevel || 5,
      myStats: null,
      ended: false,
    };
  }

  async onStart(ev) {
    this.freshState(ev);
    this.el.pzV.textContent = fmt(ev.prizes[0]);
    this.renderSeats();
    for (let i = 0; i < this.s.n; i++) this.setStack(i, ev.startStack, false);
    await this.banner(`<span class="big">SHUFFLE UP!</span><small>${ev.seats.length} players · winner takes ${coins(ev.prizes[0])}${ev.prizes[1] ? ` · 2nd gets ${coins(ev.prizes[1])} back` : ''}</small>`, 'start', 1500);
  }

  onLevel(ev) {
    this.s.level = ev.level;
    this.centerMsg(`<b>Blinds up!</b> ${fmt(ev.sb)} / ${fmt(ev.bb)}`, 1800);
    sfx('pop');
  }

  updateBlinds() {
    const s = this.s;
    this.el.blV.textContent = `${fmt(s.sb)}/${fmt(s.bb)}`;
    const left = s.handsPerLevel - ((s.handNo - 1) % s.handsPerLevel);
    this.el.blNext.textContent = `Hand ${s.handNo} · up in ${left}`;
  }

  async onHand(ev) {
    const s = this.s;
    s.handNo = ev.handNo;
    s.sb = ev.sb;
    s.bb = ev.bb;
    s.dealer = ev.dealer;
    s.board = [];
    s.pot = 0;
    s.legal = null;
    s.myStats = { dealt: false, won: false, cat: null, showdown: false, allIn: false, amount: 0 };
    this.pre = { checkFold: false, callAny: false };
    this.updateBlinds();
    // Clear the last hand's cards off the table.
    const old = $$('.pcard', this.root).filter((c) => !c.classList.contains('keep'));
    for (const c of old) {
      c.classList.add('gone');
      this.after(260, () => c.remove());
    }
    for (const sl of this.el.slots) sl.innerHTML = '';
    this.el.felt.classList.remove('has-board');
    for (const el of $$('.seat', this.root)) {
      el.classList.remove('folded', 'winner', 'loser', 'showing');
      $('.s-hand', el).textContent = '';
      $('.s-hand', el).classList.remove('show');
      const t = $('.s-tag', el);
      if (!t.classList.contains('out')) t.classList.remove('show', 'allin');
    }
    $('.my-hand-label', this.root).textContent = '';
    $('.my-hand-label', this.root).className = 'my-hand-label';
    for (let i = 0; i < s.n; i++) {
      s.folded[i] = false;
      s.allIn[i] = false;
      s.cards[i] = [];
      s.inHand[i] = !s.busted[i];
      this.setBet(i, 0);
      this.setStack(i, ev.stacks[i], false);
    }
    this.el.potV.textContent = '0';
    this.el.potChips.innerHTML = '';
    this.el.pot.classList.remove('show');
    this.placeDealer(true);
    this.hideActions();
    this.renderRanks();
    await this.wait(260);
  }

  async onDeal(ev) {
    const s = this.s;
    const deck = center(this.el.deck);
    s.myStats.dealt = ev.cards != null;
    const flights = [];
    let k = 0;
    for (let round = 0; round < 2; round++) {
      for (const seat of ev.order) {
        const i = k++;
        flights.push(
          this.wait(i * 70).then(async () => {
            if (this.dead) return;
            const me = seat === s.you;
            const target = $('.s-cards', this.seatEl(seat));
            const card = cardEl(null, { back: this.o.back, cls: me ? 'mine' : 'opp' });
            card.style.setProperty('--k', round);
            target.appendChild(card);
            card.style.visibility = 'hidden';
            const to = center(card);
            const flier = cardEl(null, { back: this.o.back, cls: 'flying ' + (me ? 'mine' : 'opp') });
            sfx('deal', i);
            await this.fly(flier, deck, to, { dur: 330, r0: -30 + Math.random() * 20, r1: me ? (round ? 6 : -6) : (round ? 8 : -4), s0: 0.6, s1: 1 });
            card.style.visibility = '';
            if (me && ev.cards) {
              s.cards[seat][round] = ev.cards[round];
              await this.wait(60);
              reveal(card, ev.cards[round]);
              sfx('flip');
            } else s.cards[seat][round] = null;
          }),
        );
      }
    }
    await Promise.all(flights);
    this.updateMyHand();
  }

  async onBlind(ev) {
    const from = this.avatarPoint(ev.seat);
    const to = this.betCenter(ev.seat);
    this.setStack(ev.seat, ev.chips);
    sfx('chip', 2);
    await this.flyChips(ev.amount, from, to, { n: 2, dur: 360 });
    this.setBet(ev.seat, ev.bet);
    this.tag(ev.seat, ev.kind === 'sb' ? 'SMALL BLIND' : 'BIG BLIND', 'blind');
    if (ev.allIn) this.markAllIn(ev.seat);
  }

  betCenter(seat) {
    const b = this.betEl(seat);
    if (!b) return center(this.el.felt);
    const r = this.el.box.getBoundingClientRect();
    const p = this.betPoint(seat);
    return { x: r.left + p.x, y: r.top + p.y };
  }

  markAllIn(seat) {
    this.s.allIn[seat] = true;
    this.tag(seat, 'ALL IN', 'allin');
  }

  async onActionEv(ev) {
    const s = this.s;
    const seat = ev.seat;
    this.setTurn(-1);
    if (seat === s.you) this.hideActions();
    const word = ACTION_WORD[ev.action];
    if (ev.action === 'fold') {
      s.folded[seat] = true;
      s.inHand[seat] = false;
      this.tag(seat, ev.auto ? 'FOLD (time)' : 'FOLD', 'fold');
      sfx('fold');
      const el = this.seatEl(seat);
      el.classList.add('folded');
      const cards = $$('.s-cards .pcard', el);
      const muck = center(this.el.felt);
      await Promise.all(
        cards.map((c, i) => {
          const from = center(c);
          c.remove();
          const f = cardEl(seat === s.you ? c.dataset.card : null, { back: this.o.back, faceUp: false, cls: 'flying opp' });
          return this.wait(i * 50).then(() => this.fly(f, from, { x: muck.x + (Math.random() - 0.5) * 30, y: muck.y - 10 }, { dur: 380, r1: 140 + Math.random() * 60, s1: 0.5 }).then(() => {}));
        }),
      );
      this.react(seat, 'fold');
      if (seat === s.you) this.updateMyHand();
      return;
    }
    if (ev.action === 'check') {
      this.tag(seat, ev.auto ? 'CHECK (time)' : 'CHECK', 'check');
      sfx('check');
      await this.wait(300);
      return;
    }
    // call / bet / raise / all-in
    const added = ev.bet - s.bets[seat];
    this.setStack(seat, ev.chips);
    const txt = ev.action === 'call' ? `CALL ${fmt(added)}` : ev.action === 'allin' ? 'ALL IN' : `${word} ${fmt(ev.bet)}`;
    this.tag(seat, txt, ev.action);
    sfx(ev.action === 'allin' ? 'allin' : ev.action === 'call' ? 'call' : 'raise');
    if (ev.action === 'allin') {
      buzz([40, 30, 60]);
      if (!reducedMotion()) this.el.box.classList.remove('shake'), void this.el.box.offsetWidth, this.el.box.classList.add('shake');
    }
    await this.flyChips(added, this.avatarPoint(seat), this.betCenter(seat), { dur: 380 });
    this.setBet(seat, ev.bet);
    if (ev.allIn) {
      this.markAllIn(seat);
      if (seat === s.you) s.myStats.allIn = true;
    }
  }

  async onTurn(ev) {
    const s = this.s;
    s.turnId = ev.turnId;
    this.setTurn(ev.seat, ev.seconds);
    this.updateInfo(ev);
    if (ev.seat === s.you && ev.legal) {
      s.legal = ev.legal;
      // Pre-selected actions fire straight away.
      if (this.pre.checkFold || this.pre.callAny) {
        const a = this.pre.callAny ? (ev.legal.check ? { type: 'check' } : { type: 'call' }) : ev.legal.check ? { type: 'check' } : { type: 'fold' };
        if (this.pre.checkFold && !ev.legal.check) this.pre.checkFold = false;
        this.send(a);
        return;
      }
      this.showActions(ev.legal);
      sfx('turn');
      if (this.o.vibrate()) buzz(30);
    } else {
      s.legal = null;
      this.hideActions();
    }
  }

  updateInfo(ev) {
    const s = this.s;
    const mine = ev && ev.seat === s.you;
    const who = ev && ev.seat >= 0 && ev.seat !== s.you ? s.seats[ev.seat] : null;
    const canPre = s.inHand[s.you] && !s.folded[s.you] && !s.allIn[s.you] && !s.busted[s.you];
    this.el.pre.hidden = mine || !canPre || !who;
    this.renderPre();
    const w = this.el.waitmsg;
    if (!mine && who) {
      w.hidden = false;
      w.textContent = s.busted[s.you] ? 'You are out — watching' : s.folded[s.you] ? `Folded · ${who.name} to act` : `${who.name} is thinking…`;
    } else w.hidden = true;
  }

  renderPre() {
    for (const b of $$('.pbtn', this.el.pre)) {
      const on = !!this.pre[b.dataset.p];
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  showActions(la) {
    const s = this.s;
    const [fold, check, raise] = $$('.abtn', this.el.actions);
    // Fold is always possible, but when checking is free we ask first.
    fold.dataset.safe = la.check ? '1' : '';
    if (la.check) {
      check.dataset.a = 'check';
      check.querySelector('.at').innerHTML = 'CHECK';
      check.className = 'abtn check';
    } else {
      check.dataset.a = 'call';
      check.querySelector('.at').innerHTML = la.callAllIn ? `ALL IN <small>${fmt(la.call)}</small>` : `CALL <small>${fmt(la.call)}</small>`;
      check.className = `abtn call ${la.callAllIn ? 'allin' : ''}`;
    }
    if (la.raise) {
      raise.disabled = false;
      const allInOnly = la.raise.min >= la.raise.max;
      raise.querySelector('.at').innerHTML = allInOnly ? `ALL IN <small>${fmt(la.raise.max)}</small>` : la.isBet ? 'BET' : 'RAISE';
      raise.dataset.a = allInOnly ? 'allin' : 'raise';
    } else {
      raise.disabled = true;
      raise.querySelector('.at').innerHTML = la.isBet ? 'BET' : 'RAISE';
    }
    this.el.info.innerHTML = la.toCall ? `To call <b>${fmt(la.toCall)}</b> · Pot <b>${fmt(la.pot)}</b>` : `Pot <b>${fmt(la.pot)}</b> · your move`;
    this.el.actions.hidden = false;
    this.el.pre.hidden = true;
    this.el.waitmsg.hidden = true;
    this.el.actions.classList.remove('in');
    void this.el.actions.offsetWidth;
    this.el.actions.classList.add('in');
    this.el.screen.classList.add('my-turn');
  }

  hideActions() {
    this.el.actions.hidden = true;
    this.el.info.textContent = '';
    this.closeRaise(true);
    this.el.screen.classList.remove('my-turn');
  }

  clickAction(a) {
    const la = this.s.legal;
    if (!la) return;
    if (a === 'fold') {
      if (la.check && !this.foldArmed) {
        // Folding when you could check for free is almost always a mistake.
        this.foldArmed = true;
        const b = $('.abtn.fold', this.root);
        b.querySelector('.at').textContent = 'SURE?';
        b.classList.add('armed');
        this.after(2200, () => {
          this.foldArmed = false;
          b.querySelector('.at').textContent = 'FOLD';
          b.classList.remove('armed');
        });
        sfx('pop');
        return;
      }
      this.foldArmed = false;
      $('.abtn.fold', this.root).classList.remove('armed');
      $('.abtn.fold .at', this.root).textContent = 'FOLD';
      return this.send({ type: 'fold' });
    }
    if (a === 'check') return this.send({ type: 'check' });
    if (a === 'call') return this.send({ type: 'call' });
    if (a === 'allin') return this.send({ type: 'raise', to: la.raise.max });
    if (a === 'raise') return this.openRaise();
  }

  send(action) {
    const la = this.s.legal;
    if (!la) return;
    this.s.legal = null;
    this.hideActions();
    sfx('click');
    this.o.onAction(action, this.s.turnId);
    // If the host never answers (network trouble), give the controls back.
    const tid = this.s.turnId;
    this.after(5000, () => {
      if (this.s.turnId === tid && this.s.turn === this.s.you && !this.s.legal) {
        this.s.legal = la;
        this.showActions(la);
      }
    });
  }

  // ---------------------------------------------------------------- raise panel
  openRaise() {
    const la = this.s.legal;
    if (!la || !la.raise) return;
    const { min, max } = la.raise;
    const r = this.el.range;
    const step = this.s.bb >= 100 ? 10 : 5;
    r.min = String(min);
    r.max = String(max);
    r.step = '1';
    this.raiseStep = step;
    this.el.rpLbl.textContent = la.isBet ? 'BET' : 'RAISE TO';
    const pot = la.pot + la.toCall; // pot after calling
    const cur = la.currentBet;
    const presets = [
      ['Min', min],
      ['½ Pot', cur + Math.round(pot * 0.5)],
      ['⅔ Pot', cur + Math.round((pot * 2) / 3)],
      ['¾ Pot', cur + Math.round(pot * 0.75)],
      ['Pot', cur + pot],
      ['All in', max],
    ]
      .map(([l, v]) => [l, Math.max(min, Math.min(max, v))])
      .filter(([l, v], i, a) => l === 'Min' || l === 'All in' || (v > min && v < max && a.findIndex((x) => x[1] === v) === i));
    this.el.rpPresets.innerHTML = presets.map(([l, v]) => `<button class="rpp ${l === 'All in' ? 'allin' : ''}" data-v="${v}"><span>${l}</span><b>${fmt(v)}</b></button>`).join('');
    this.el.rp.hidden = false;
    this.el.rp.classList.remove('in');
    void this.el.rp.offsetWidth;
    this.el.rp.classList.add('in');
    this.setRaise(presets.length > 2 ? presets[1][1] : min, true);
    sfx('pop');
    this.el.range.focus({ preventScroll: true });
  }

  setRaise(v, snapRange) {
    const la = this.s.legal;
    if (!la || !la.raise) return;
    const { min, max } = la.raise;
    let x = Math.round(v);
    if (x !== max && x !== min) x = Math.round(x / this.raiseStep) * this.raiseStep;
    x = Math.max(min, Math.min(max, x));
    this.raiseTo = x;
    if (snapRange || Number(this.el.range.value) !== x) this.el.range.value = String(x);
    const pct = max > min ? ((x - min) / (max - min)) * 100 : 100;
    this.el.range.style.setProperty('--p', `${pct}%`);
    tweenNumber(this.el.rpAmt, x, 120);
    const me = this.s.you;
    const stackAfter = this.s.stacks[me] - (x - this.s.bets[me]);
    const allin = x >= max;
    this.el.rpInfo.innerHTML = `${la.toCall ? `To call <b>${fmt(la.toCall)}</b> · ` : ''}Pot <b>${fmt(la.pot)}</b> · Left after <b>${fmt(Math.max(0, stackAfter))}</b>`;
    this.el.rpGo.innerHTML = allin ? `ALL IN · ${fmt(x)}` : `${la.isBet ? 'BET' : 'RAISE TO'} ${fmt(x)}`;
    this.el.rpGo.classList.toggle('allin', allin);
    for (const b of $$('.rpp', this.el.rpPresets)) b.classList.toggle('on', Number(b.dataset.v) === x);
  }

  stepRaise(d) {
    const la = this.s.legal;
    if (!la || !la.raise) return;
    const step = Math.max(this.raiseStep, this.s.bb);
    this.setRaise((this.raiseTo || la.raise.min) + d * step, true);
    sfx('chip', 1);
  }

  confirmRaise() {
    const la = this.s.legal;
    if (!la || !la.raise) return;
    this.send({ type: 'raise', to: this.raiseTo >= la.raise.max ? la.raise.max : this.raiseTo });
  }

  closeRaise(silent = false) {
    if (this.el.rp.hidden) return;
    this.el.rp.hidden = true;
    if (!silent) sfx('click');
  }

  onKey(e) {
    if (e.target.closest && e.target.closest('input:not(.rp-range)')) return;
    const key = e.key.toLowerCase();
    if (!document.querySelector('.modal-wrap') && (key === 'h' || key === '?')) return this.toggleRanks();
    if (key === 'escape' && !this.el.hr.hidden) return this.toggleRanks(false);
    if (!this.s || !this.s.legal || e.target.closest('input:not(.rp-range)') || document.querySelector('.modal-wrap')) return;
    const k = e.key.toLowerCase();
    if (!this.el.rp.hidden) {
      if (k === 'enter') (e.preventDefault(), this.confirmRaise());
      if (k === 'escape') this.closeRaise();
      return;
    }
    if (k === 'f') this.clickAction('fold');
    else if (k === 'c') this.clickAction(this.s.legal.check ? 'check' : 'call');
    else if (k === 'r' && this.s.legal.raise) this.clickAction(this.s.legal.raise.min >= this.s.legal.raise.max ? 'allin' : 'raise');
  }

  // ---------------------------------------------------------------- board + pot
  async onCollect(ev) {
    const s = this.s;
    const target = center(this.el.potChips);
    const fl = [];
    for (let i = 0; i < s.n; i++) {
      if (ev.bets[i] > 0) {
        const from = this.betCenter(i);
        this.setBet(i, 0);
        fl.push(this.flyChips(ev.bets[i], from, target, { n: 3, dur: 380 }));
      }
    }
    if (fl.length) sfx('chipsSlide');
    await Promise.all(fl);
    s.pot = ev.pot;
    this.el.pot.classList.add('show');
    this.el.potChips.innerHTML = stackHtml(ev.pot, { max: 10 });
    tweenNumber(this.el.potV, ev.pot, 400);
    for (let i = 0; i < s.n; i++) s.bets[i] = 0;
  }

  async onStreet(ev) {
    const s = this.s;
    const deck = center(this.el.deck);
    const start = s.board.length;
    s.board = ev.board.slice();
    this.el.felt.classList.add('has-board');
    await Promise.all(
      ev.cards.map((c, i) =>
        this.wait(i * 170).then(async () => {
          const slot = this.el.slots[start + i];
          const card = cardEl(c, { back: this.o.back, faceUp: false, cls: 'board-card' });
          slot.appendChild(card);
          card.style.visibility = 'hidden';
          const to = center(slot);
          const fl = cardEl(null, { back: this.o.back, cls: 'flying board-card' });
          sfx('deal', i);
          await this.fly(fl, deck, to, { dur: 360, r0: -20, r1: 0, s0: 0.7, s1: 1 });
          card.style.visibility = '';
          await this.wait(40);
          reveal(card, c);
          sfx('flip');
          card.classList.add('landed');
        }),
      ),
    );
    await this.wait(260);
    this.updateMyHand();
  }

  /**
   * Shows the name of your best hand above your cards and lights up the
   * cards that make a match (pair, trips, straight…), on your hand and the
   * board, so you can see at a glance what you've got.
   */
  updateMyHand() {
    const s = this.s;
    const lab = $('.my-hand-label', this.root);
    if (!lab) return;
    for (const c of $$('.pcard.match', this.root)) c.classList.remove('match');
    const cur = s.folded[s.you] || s.busted[s.you] ? null : this.myHand();
    if (!cur) {
      lab.innerHTML = s.folded[s.you] ? 'Folded' : '';
      lab.className = `my-hand-label ${s.folded[s.you] ? 'show' : ''}`;
      this.renderRanks();
      return;
    }
    let text = cur.name;
    if (s.board.length < 3 && cur.cat === 0) {
      // Before the flop, name the two cards: "A-K suited".
      const L = (c) => ({ T: '10' })[c[0]] || c[0];
      const [a, b] = cur.best;
      const [hi, lo] = 'AKQJT98765432'.indexOf(a[0]) <= 'AKQJT98765432'.indexOf(b[0]) ? [a, b] : [b, a];
      text = `${L(hi)}-${L(lo)}${a[1] === b[1] ? ' suited' : ''}`;
    } else if (s.board.length < 3) text = cur.name.replace('Pair of', 'Pocket');
    if (cur.cat >= 3 && (this.lastCat ?? -1) < 3 && Math.random() < 0.7) this.react(s.you, 'excited');
    this.lastCat = cur.cat;
    lab.innerHTML = `${cur.cat >= 1 ? '<i class="mh-ok" aria-hidden="true">✓</i>' : ''}<span>${esc(text)}</span><i class="mh-q" aria-hidden="true">?</i>`;
    lab.setAttribute('aria-label', `Your hand: ${text}. Show hand rankings`);
    lab.className = `my-hand-label show c${cur.cat}`;
    if (cur.cat >= 1 && !this.el.screen.classList.contains('showdown')) {
      const set = new Set(cur.making);
      const mine = $$('.s-cards .pcard', this.seatEl(s.you));
      for (const c of mine.concat($$('.board .pcard', this.root))) if (c.dataset.card && set.has(c.dataset.card)) c.classList.add('match');
    }
    this.renderRanks();
  }

  async onReveal(ev) {
    const s = this.s;
    for (const h of ev.hands) this.showHole(h.seat, h.cards);
    sfx('flip');
    this.centerMsg('<b>ALL IN!</b> Let’s see them…', 1800);
    await this.wait(900);
  }

  showHole(seat, cards) {
    const s = this.s;
    s.cards[seat] = cards.slice();
    const el = this.seatEl(seat);
    if (!el) return;
    el.classList.add('showing');
    const cs = $$('.s-cards .pcard', el);
    cards.forEach((c, i) => {
      if (cs[i]) reveal(cs[i], c);
    });
  }

  async onResult(ev) {
    const s = this.s;
    this.setTurn(-1);
    this.hideActions();
    this.el.pre.hidden = true;
    this.el.waitmsg.hidden = true;
    if (ev.showdown) {
      for (const h of ev.hands) if (h.seat !== s.you) this.showHole(h.seat, h.cards);
      sfx('flip');
      for (const h of ev.hands) {
        const hs = $('.s-hand', this.seatEl(h.seat));
        if (hs) {
          hs.textContent = h.name.split(',')[0];
          hs.classList.add('show');
        }
      }
      await this.wait(1000);
    }
    const potPos = center(this.el.potChips);
    let myWin = 0;
    let myReturned = 0;
    for (const pot of ev.pots) {
      const winners = pot.winners;
      if (ev.showdown && pot.best && !pot.returned) this.highlight(pot.best, winners.map((w) => w.seat));
      if (ev.showdown && !pot.returned && pot.handName) {
        const names = winners.map((w) => (w.seat === s.you ? 'You' : s.seats[w.seat].name)).join(' & ');
        const verb = winners.length > 1 ? 'split' : winners[0].seat === s.you ? 'win' : 'wins';
        this.centerMsg(`<b>${esc(names)}</b> ${verb} ${fmt(pot.amount)}<br/><small>${esc(pot.handName)}</small>`, 2200);
      } else if (!ev.showdown) {
        const w = winners[0].seat;
        this.centerMsg(`<b>${w === s.you ? 'You' : esc(s.seats[w].name)}</b> ${w === s.you ? 'win' : 'wins'} ${fmt(pot.amount)}<br/><small>Everyone else folded</small>`, 1800);
      }
      await Promise.all(
        winners.map((w) => {
          const to = this.avatarPoint(w.seat);
          if (w.seat === s.you) {
            if (pot.returned) myReturned += w.amount;
            else myWin += w.amount;
          }
          return this.flyChips(w.amount, potPos, to, { n: 5, dur: 520 }).then(() => {
            this.setStack(w.seat, ev.stacks[w.seat]);
            if (!pot.returned) {
              const el = this.seatEl(w.seat);
              el && el.classList.add('winner');
              this.react(w.seat, 'win');
              const p = this.avatarPoint(w.seat);
              sparks(p.x, p.y, '#ffd23f', 18);
            }
          });
        }),
      );
      if (!pot.returned) sfx('winHand');
      await this.wait(ev.pots.length > 1 ? 700 : 300);
    }
    this.el.potChips.innerHTML = '';
    tweenNumber(this.el.potV, 0, 300);
    this.el.pot.classList.remove('show');
    for (let i = 0; i < s.n; i++) this.setStack(i, ev.stacks[i]);
    // Losers at showdown look sad (sometimes).
    if (ev.showdown) for (const h of ev.hands) if (!ev.won[h.seat] && Math.random() < 0.6) this.react(h.seat, 'lose');
    // Your hand result
    const st = s.myStats;
    if (st && st.dealt) {
      const net = ev.net[s.you];
      const wonPot = myWin > 0;
      const myHand = ev.hands.find((h) => h.seat === s.you);
      st.won = wonPot;
      st.showdown = ev.showdown;
      st.cat = myHand ? myHand.cat : null;
      st.royal = !!(myHand && myHand.cat === 8 && /Royal/.test(myHand.name));
      st.amount = myWin;
      if (wonPot) {
        const p = this.avatarPoint(s.you);
        confetti(p.x, p.y - 20, net > s.bb * 20 ? 90 : 40, 1.1);
        await this.banner(`<span class="big">YOU WON!</span><small>+${coins(myWin)}${myHand && ev.showdown ? ` · ${esc(myHand.name.split(',')[0])}` : ''}</small>`, 'win', 1300);
      }
      if (this.o.onHandDone) this.o.onHandDone({ ...st });
    }
    await this.wait(ev.showdown ? 900 : 300);
    this.clearHighlight();
  }

  highlight(best, seats) {
    this.el.screen.classList.add('showdown');
    for (const c of $$('.pcard.match', this.root)) c.classList.remove('match');
    const set = new Set(best);
    for (const c of $$('.pcard', this.root)) {
      const on = c.dataset.card && set.has(c.dataset.card) && (c.classList.contains('board-card') || seats.includes(Number(c.closest('.seat')?.dataset.seat)));
      c.classList.toggle('best', !!on);
    }
  }

  clearHighlight() {
    this.el.screen.classList.remove('showdown');
    for (const c of $$('.pcard.best', this.root)) c.classList.remove('best');
  }

  async onBust(ev) {
    const s = this.s;
    s.busted[ev.seat] = true;
    s.inHand[ev.seat] = false;
    const el = this.seatEl(ev.seat);
    if (el) {
      el.classList.add('busted');
      const t = $('.s-tag', el);
      t.className = 's-tag show out';
      t.textContent = ev.left ? 'LEFT' : `OUT · ${PLACE[ev.place - 1]}`;
    }
    this.setStack(ev.seat, 0);
    if (ev.seat === s.you && !s.ended) {
      s.ended = true;
      sfx('lose');
      await this.banner(`<span class="big">KNOCKED OUT</span><small>You finished ${PLACE[ev.place - 1]}${ev.prize ? ` · you get ${coins(ev.prize)}` : ''}</small>`, 'out', 1600);
      this.o.onEnd({ place: ev.place, prize: ev.prize || 0, left: !!ev.left });
    } else if (ev.seat !== s.you) {
      this.floatText(ev.seat, ev.left ? 'Left' : `Out ${PLACE[ev.place - 1]}`, 'bad');
      await this.wait(500);
    }
  }

  async onOver(ev) {
    const s = this.s;
    this.setTurn(-1);
    this.hideActions();
    if (s.ended) {
      // Already knocked out and watching: show who won, then hand over.
      await this.banner(`<span class="big">GAME OVER</span><small>${esc(s.seats[ev.winner].name)} wins the table</small>`, 'out', 1500);
      if (this.o.onWatchedOver) this.o.onWatchedOver();
      return;
    }
    s.ended = true;
    const me = ev.winner === s.you;
    const place = ev.standings.indexOf(s.you) + 1;
    if (me) {
      sfx('win');
      const p = this.avatarPoint(s.you);
      coinShower(p.x, p.y - 30, 40);
      confetti(innerWidth / 2, innerHeight * 0.35, 140, 1.5);
      this.react(s.you, 'win');
      await this.banner(`<span class="big">CHAMPION!</span><small>You won the table · ${coins(ev.prizes[s.you])}</small>`, 'win', 1900);
    } else {
      await this.banner(`<span class="big">GAME OVER</span><small>${esc(s.seats[ev.winner].name)} wins the table</small>`, 'out', 1500);
    }
    this.o.onEnd({ place, prize: ev.prizes[s.you] || 0 });
  }

  onSeat(ev) {
    if (!this.s || !this.s.seats[ev.seat]) return;
    this.setStatus(ev.seat, ev.status);
  }

  // ---------------------------------------------------------------- reconnect
  onSync(ev) {
    this.freshState({ seats: ev.seats, you: ev.you, stake: ev.stake, prizes: ev.prizes, startStack: 0 });
    const s = this.s;
    const v = ev.view;
    s.handNo = v.handNo;
    s.sb = v.sb;
    s.bb = v.bb;
    s.dealer = v.dealer;
    s.board = v.board.slice();
    s.pot = v.pot;
    s.myStats = { dealt: v.players[s.you].inHand, won: false, cat: null, showdown: false, allIn: v.players[s.you].allIn, amount: 0 };
    this.el.pzV.textContent = fmt(ev.prizes[0]);
    this.renderSeats();
    this.updateBlinds();
    for (const p of v.players) {
      s.stacks[p.seat] = p.chips;
      s.folded[p.seat] = p.folded;
      s.allIn[p.seat] = p.allIn;
      s.busted[p.seat] = p.busted;
      s.inHand[p.seat] = p.inHand && !p.folded;
      this.setStack(p.seat, p.chips, false);
      this.setBet(p.seat, p.bet);
      const el = this.seatEl(p.seat);
      if (p.busted) {
        el.classList.add('busted');
        const pl = (ev.places || []).find((x) => x.seat === p.seat);
        this.tag(p.seat, pl ? `OUT · ${PLACE[pl.place - 1]}` : 'OUT', 'out');
      }
      if (p.folded) el.classList.add('folded');
      if (p.allIn) this.markAllIn(p.seat);
      if (p.inHand && !p.folded && !p.busted) {
        const box = $('.s-cards', el);
        p.cards.forEach((c, i) => {
          const card = cardEl(c, { back: this.o.back, faceUp: !!c, cls: p.seat === s.you ? 'mine' : 'opp' });
          card.style.setProperty('--k', i);
          box.appendChild(card);
        });
        s.cards[p.seat] = p.cards.slice();
      }
    }
    s.board.forEach((c, i) => this.el.slots[i].appendChild(cardEl(c, { back: this.o.back, cls: 'board-card' })));
    this.el.felt.classList.toggle('has-board', s.board.length > 0);
    const committed = v.players.reduce((a, p) => a + p.committed - p.bet, 0);
    if (committed > 0) {
      this.el.pot.classList.add('show');
      this.el.potChips.innerHTML = stackHtml(committed, { max: 10 });
      this.el.potV.textContent = fmt(committed);
    }
    this.placeDealer(false);
    this.updateMyHand();
    if (v.phase === 'betting' && v.toAct >= 0) this.onTurn({ seat: v.toAct, turnId: ev.turnId, seconds: ev.seconds, legal: ev.legal, pot: v.pot });
  }

  // ---------------------------------------------------------------- emotes
  showEmote(seat, key) {
    if (!this.s || this.dead || seat == null || !this.s.seats[seat]) return;
    const it = item(`emote:${key}`);
    if (!it) return;
    const p = this.avatarPoint(seat);
    const b = document.createElement('div');
    b.className = `emote-bubble ${it.sticker ? `sticker a-${it.anim}` : 'glyph'}`;
    b.textContent = it.glyph || it.sticker;
    b.style.left = `${p.x}px`;
    b.style.top = `${p.y - 40}px`;
    this.el.fly.appendChild(b);
    sfx('pop');
    this.after(2400, () => b.remove());
  }
}

export { suitSvg };
