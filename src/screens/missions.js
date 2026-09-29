import { register, render } from '../app.js';
import * as progress from '../profile/progress.js';
import { $, $$, esc, fmt, coins, clock, toast } from '../ui/kit.js';
import { sfx } from '../audio.js';
import { topBar, bindTopBar, refreshCoins } from './home.js';
import { coinBurstTo, chainLevelUps } from './rewards.js';

let tab = 'daily';
let timer = 0;

function nextMonday() {
  const d = new Date();
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return m - d;
}

function showMissions() {
  clearInterval(timer);
  const list = progress.missionList();
  const items = list[tab];
  const claimD = list.daily.filter((x) => x.done && !x.claimed).length;
  const claimW = list.weekly.filter((x) => x.done && !x.claimed).length;
  const root = render(
    `${topBar({ back: true })}
    <main class="missions-main">
      <h1>Missions</h1>
      <div class="tabs" role="tablist">
        <button class="tab ${tab === 'daily' ? 'on' : ''}" data-t="daily" role="tab" aria-selected="${tab === 'daily'}">Daily${claimD ? `<span class="dot">${claimD}</span>` : ''}</button>
        <button class="tab ${tab === 'weekly' ? 'on' : ''}" data-t="weekly" role="tab" aria-selected="${tab === 'weekly'}">Weekly${claimW ? `<span class="dot">${claimW}</span>` : ''}</button>
      </div>
      <p class="m-hint center reset">New ${tab} missions in <b class="rs">${clock(tab === 'daily' ? progress.msToMidnight() : nextMonday())}</b></p>
      <div class="mlist">${items
        .map(
          (m) => `<div class="mission ${m.done ? 'done' : ''} ${m.claimed ? 'claimed' : ''}">
          <div class="m-ico" aria-hidden="true">${m.claimed ? '✅' : m.done ? '🎁' : tab === 'daily' ? '⭐' : '🏆'}</div>
          <div class="m-body"><b>${esc(m.text)}</b>
            <div class="m-prog"><div class="bar"><i style="width:${Math.round((m.progress / m.need) * 100)}%"></i></div><span>${fmt(m.progress)} / ${fmt(m.need)}</span></div>
            <div class="m-rew"><span class="xp-tag">+${m.xp} XP</span> ${coins(m.coins)}</div></div>
          <div class="m-act">${m.claimed ? '<span class="claimed-lbl">Claimed</span>' : `<button class="btn ${m.done ? 'gold' : 'ghost'} claim" data-id="${m.id}" ${m.done ? '' : 'disabled'}>${m.done ? 'Claim' : 'In progress'}</button>`}</div>
        </div>`,
        )
        .join('')}</div>
    </main>`,
    'missions',
  );
  bindTopBar(root);
  $$('.tab', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.t), sfx('nav'), showMissions())));
  $$('.claim', root).forEach(
    (b) =>
      (b.onclick = async () => {
        if (b.disabled) return;
        b.disabled = true;
        const r = progress.claimMission(b.dataset.id);
        if (!r) return showMissions();
        coinBurstTo(b, r.coins);
        refreshCoins();
        toast(`+${coins(r.coins)} · +${r.xp} XP`, 'gold');
        await chainLevelUps(r.levelUps);
        refreshCoins();
        showMissions();
      }),
  );
  timer = setInterval(() => {
    const rs = $('.missions-main .rs');
    if (!rs) return clearInterval(timer);
    rs.textContent = clock(tab === 'daily' ? progress.msToMidnight() : nextMonday());
  }, 1000);
}

register('missions', showMissions);
