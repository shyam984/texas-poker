import { register, render } from '../app.js';
import { faceHtml } from '../ui/cards.js';
import { topBar, bindTopBar } from './home.js';

const HANDS = [
  ['Royal Flush', 'A K Q J 10, all the same suit', ['As', 'Ks', 'Qs', 'Js', 'Ts']],
  ['Straight Flush', 'Five in a row, same suit', ['9h', '8h', '7h', '6h', '5h']],
  ['Four of a Kind', 'Four cards of the same rank', ['Qc', 'Qd', 'Qh', 'Qs', '4d']],
  ['Full House', 'Three of a kind plus a pair', ['Kd', 'Kc', 'Ks', '7h', '7c']],
  ['Flush', 'Any five of the same suit', ['Ad', 'Jd', '9d', '6d', '2d']],
  ['Straight', 'Five in a row, any suits', ['Tc', '9d', '8s', '7h', '6c']],
  ['Three of a Kind', 'Three cards of the same rank', ['8s', '8h', '8d', 'Kc', '3s']],
  ['Two Pair', 'Two different pairs', ['Jh', 'Jc', '4s', '4d', 'Ah']],
  ['Pair', 'Two cards of the same rank', ['Tc', 'Th', 'Ks', '6d', '3c']],
  ['High Card', 'Nothing else? Highest card plays', ['Ah', 'Jd', '8c', '5s', '2h']],
];

function howto() {
  const root = render(
    `${topBar({ back: true })}
    <main class="how-main">
      <h1>How to play</h1>
      <div class="how-grid">
        <section class="how-steps">
          <ol>
            <li><b>Everyone gets 2 secret cards.</b> Only you can see yours.</li>
            <li><b>Five shared cards</b> are dealt face up in the middle: 3 (the flop), then 1 (the turn), then 1 (the river).</li>
            <li><b>Make the best 5-card hand</b> from your 2 cards and the 5 shared cards.</li>
            <li><b>Betting:</b> on your turn you can <b>check</b> (pass), <b>bet</b>, <b>call</b> (match a bet), <b>raise</b> (bet more) or <b>fold</b> (give up this hand).</li>
            <li>The two players left of the dealer button put in the <b>small and big blind</b> to start each pot. Blinds go up every 5 hands.</li>
            <li><b>Win chips</b> by having the best hand at the end, or by making everyone else fold.</li>
            <li>Run out of chips and you're out. <b>Last player with chips wins the table!</b></li>
          </ol>
          <div class="how-box">🪙 Everyone pays the <b>stake</b> to sit down. The winner takes the prize — with 4 or 5 players, 2nd place gets their stake back.</div>
        </section>
        <section class="how-hands" aria-label="Hand rankings, best first">
          ${HANDS.map(([n, d, cs], i) => `<div class="hh"><span class="hh-n">${i + 1}</span><div class="hh-t"><b>${n}</b><small>${d}</small></div><div class="hh-c">${cs.map((c) => `<span class="mini-card">${faceHtml(c)}</span>`).join('')}</div></div>`).join('')}
        </section>
      </div>
    </main>`,
    'howto',
  );
  bindTopBar(root);
}

register('howto', howto);
