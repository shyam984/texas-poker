import { register, render } from '../app.js';
import * as store from '../profile/store.js';
import * as progress from '../profile/progress.js';
import { ITEMS, KINDS, PASS, item } from '../profile/catalog.js';
import { itemArt, rarityTag } from '../ui/itemart.js';
import { avatarHtml } from '../ui/avatars.js';
import { $, $$, esc, fmt, modal, toast } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { topBar, bindTopBar } from './home.js';

let tab = 'char';

function passLevelOf(id) {
  const i = PASS.findIndex((r) => r.item === id || (r.also || []).includes(id));
  return i >= 0 ? i + 2 : null;
}

function howToGet(it) {
  if (it.kind === 'badge') return it.how;
  const lv = passLevelOf(it.id);
  return lv ? `Free Pass level ${lv} · or find it in a Daily Chest` : 'Daily Chest';
}

function showCollection() {
  const p = store.profile();
  const eq = p.equipped;
  const items = ITEMS.filter((i) => i.kind === tab);
  const title = item(eq.title);
  const counts = Object.keys(KINDS).map((k) => {
    const all = ITEMS.filter((i) => i.kind === k);
    const own = all.filter((i) => progress.owns(i.id)).length;
    const fresh = p.newItems.filter((id) => id.startsWith(`${k}:`)).length;
    return { k, all: all.length, own, fresh };
  });
  const root = render(
    `${topBar({ back: true })}
    <main class="col-main">
      <section class="profile-card">
        <div class="pc-av">${avatarHtml(progress.look(), { size: 'xl' })}</div>
        <div class="pc-info">
          <label class="pc-name"><span class="sr">Name</span><input class="nm-in" maxlength="14" value="${esc(p.name)}" aria-label="Your name"/><span class="edit" aria-hidden="true">✎</span></label>
          <div class="pc-title">${esc(title ? title.name : '')}</div>
          <div class="pc-stats">
            <span><b>${p.level}</b>Level</span><span><b>${fmt(p.stats.games)}</b>Games</span><span><b>${fmt(p.stats.wins)}</b>Wins</span><span><b>${fmt(p.stats.handsWon)}</b>Hands won</span>
          </div>
        </div>
      </section>
      <div class="tabs scroll" role="tablist">${counts
        .map((c) => `<button class="tab ${c.k === tab ? 'on' : ''}" data-k="${c.k}" role="tab" aria-selected="${c.k === tab}">${KINDS[c.k].label}<small>${c.own}/${c.all}</small>${c.fresh ? '<span class="dot new">NEW</span>' : ''}</button>`)
        .join('')}</div>
      <div class="grid">${items
        .map((it) => {
          const own = progress.owns(it.id);
          const equipped = Object.values(eq).includes(it.id);
          const fresh = p.newItems.includes(it.id);
          return `<button class="citem r-${it.rarity} ${own ? 'own' : 'locked'} ${equipped ? 'equipped' : ''}" data-id="${it.id}" aria-label="${esc(it.name)}${own ? '' : ', locked'}${equipped ? ', equipped' : ''}">
            <span class="ci-art">${itemArt(it.id)}</span>
            <span class="ci-name">${esc(it.name)}</span>
            ${rarityTag(it.rarity)}
            ${own ? '' : '<span class="ci-lock" aria-hidden="true">🔒</span>'}
            ${equipped ? '<span class="ci-eq">EQUIPPED</span>' : ''}
            ${fresh ? '<span class="dot new">NEW</span>' : ''}
          </button>`;
        })
        .join('')}</div>
    </main>`,
    'collection',
  );
  bindTopBar(root);
  // Seen: clear NEW marks for this tab a moment after viewing.
  const seen = p.newItems.filter((id) => id.startsWith(`${tab}:`));
  if (seen.length) setTimeout(() => progress.markSeen(seen), 1200);
  const nm = $('.nm-in', root);
  nm.addEventListener('change', () => {
    store.setName(nm.value);
    nm.value = store.profile().name;
    $('.me-name') && ($('.me-name').textContent = store.profile().name);
    toast('Name saved');
  });
  nm.addEventListener('keydown', (e) => e.key === 'Enter' && nm.blur());
  $$('.tab', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.k), sfx('nav'), showCollection())));
  $$('.citem', root).forEach(
    (b) =>
      (b.onclick = () => {
        const it = item(b.dataset.id);
        const own = progress.owns(it.id);
        const canEquip = !!KINDS[it.kind].equip;
        const equipped = Object.values(store.profile().equipped).includes(it.id);
        sfx('click');
        const m = modal(
          `<div class="item-detail"><div class="id-art">${itemArt(it.id, { big: true })}</div>
          <h2>${esc(it.name)}</h2><div>${rarityTag(it.rarity)} <span class="m-hint">${esc(KINDS[it.kind].one)}</span></div>
          ${it.bio ? `<p class="m-text center">${esc(it.bio)}</p>` : ''}
          ${own ? '' : `<p class="m-text center">🔒 ${esc(howToGet(it))}</p>`}
          ${own && canEquip ? `<button class="btn gold lg eq" ${equipped ? 'disabled' : ''}>${equipped ? 'Equipped' : 'Equip'}</button>` : `<button class="btn ghost lg ok">OK</button>`}</div>`,
          { cls: 'small' },
        );
        const e = $('.eq', m.el);
        if (e)
          e.onclick = () => {
            progress.equip(it.id);
            sfx('pop');
            m.close();
            toast(`Equipped <b>${esc(it.name)}</b>`, 'good');
            showCollection();
          };
        const ok = $('.ok', m.el);
        if (ok) ok.onclick = () => m.close();
      }),
  );
}

register('collection', showCollection);
