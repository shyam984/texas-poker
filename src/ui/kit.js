// Small shared UI helpers: dialogs, toasts, number animations, formatting.

import { sfx } from '../audio.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const fmt = (n) => Math.round(n).toLocaleString('en-GB');
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export const coinIco = () => '<span class="coin" aria-hidden="true"></span>';
export const coins = (n) => `<span class="amt">${coinIco()}<b>${fmt(n)}</b></span>`;

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Count a number up or down inside an element. */
export function tweenNumber(el, to, ms = 700, prefix = '') {
  if (!el) return;
  const from = Number(el.dataset.v ?? String(el.textContent).replace(/[^0-9-]/g, '')) || 0;
  el.dataset.v = String(to);
  cancelAnimationFrame(Number(el.dataset.raf || 0));
  if (from === to || reducedMotion()) {
    el.textContent = prefix + fmt(to);
    return;
  }
  el.classList.remove('bump-up', 'bump-down');
  void el.offsetWidth;
  el.classList.add(to > from ? 'bump-up' : 'bump-down');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms);
    const e = 1 - (1 - k) ** 3;
    el.textContent = prefix + fmt(from + (to - from) * e);
    if (k < 1) el.dataset.raf = String(requestAnimationFrame(step));
  };
  el.dataset.raf = String(requestAnimationFrame(step));
}

export function toast(html, cls = '', ms = 2600) {
  const root = $('#toast-root');
  const t = document.createElement('div');
  t.className = `toast ${cls}`;
  t.setAttribute('role', cls === 'bad' ? 'alert' : 'status');
  t.innerHTML = html;
  while (root.children.length > 2) root.firstChild.remove();
  root.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 450);
}

/**
 * A dialog. Closes with ✕, Escape or tapping outside (unless dismiss: false).
 * Returns { el, close, closed }.
 */
export function modal(html, { cls = '', dismiss = true, onClose = null, label = '' } = {}) {
  const root = $('#modal-root');
  const prev = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = `modal-wrap ${cls}`;
  wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${label ? `aria-label="${esc(label)}"` : ''}>${dismiss ? '<button class="icon-btn m-close" aria-label="Close">✕</button>' : ''}${html}</div>`;
  root.appendChild(wrap);
  const h = $('h2', wrap);
  if (h && !label) {
    h.id = `m${Math.random().toString(36).slice(2, 8)}`;
    $('.modal', wrap).setAttribute('aria-labelledby', h.id);
  }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    wrap.classList.add('out');
    setTimeout(() => wrap.remove(), 220);
    if (onClose) onClose();
    if (prev && prev.focus && document.contains(prev)) prev.focus({ preventScroll: true });
  };
  if (dismiss) {
    wrap.addEventListener('pointerdown', (e) => e.target === wrap && close());
    $('.m-close', wrap).addEventListener('click', () => (sfx('click'), close()));
  }
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dismiss) {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input, [tabindex="0"]', wrap);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
    }
  });
  requestAnimationFrame(() => {
    const t = $('[autofocus]', wrap) || $('.modal .btn:not([disabled])', wrap) || $('.m-close', wrap);
    if (t && !closed) t.focus({ preventScroll: true });
  });
  return { el: wrap, close, get closed() { return closed; } };
}

export function closeModals() {
  $('#modal-root').innerHTML = '';
}

export function confirmBox(text, yes, { no = 'Cancel', title = 'Are you sure?', danger = true } = {}) {
  return new Promise((resolve) => {
    let answered = false;
    const m = modal(
      `<h2>${title}</h2><p class="m-text">${text}</p>
      <div class="row"><button class="btn ghost no">${no}</button><button class="btn ${danger ? 'red' : 'gold'} yes">${yes}</button></div>`,
      { onClose: () => !answered && resolve(false), cls: 'small' },
    );
    $('.no', m.el).onclick = () => (sfx('click'), (answered = true), m.close(), resolve(false));
    $('.yes', m.el).onclick = () => (sfx('click'), (answered = true), m.close(), resolve(true));
  });
}

/** Centre point of an element on screen. */
export function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** mm:ss */
export function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}
