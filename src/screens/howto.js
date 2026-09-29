import { register, render } from '../app.js';
import { rankingsHtml } from '../ui/rankings.js';
import { topBar, bindTopBar } from './home.js';


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
            <li><b>Make the best 5-card hand</b> from your 2 cards and the 5 shared cards. Tap <b>?</b> at the table any time to see the hand rankings.</li>
            <li><b>Betting:</b> on your turn you can <b>check</b> (pass), <b>bet</b>, <b>call</b> (match a bet), <b>raise</b> (bet more) or <b>fold</b> (give up this hand).</li>
            <li>The two players left of the dealer button put in the <b>small and big blind</b> to start each pot. Blinds go up every 5 hands.</li>
            <li><b>Win chips</b> by having the best hand at the end, or by making everyone else fold.</li>
            <li>Run out of chips and you're out. <b>Last player with chips wins the table!</b></li>
          </ol>
          <div class="how-box">🪙 Everyone pays the <b>stake</b> to sit down. The winner takes the prize — with 4 or 5 players, 2nd place gets their stake back.</div>
        </section>
        <section class="how-hands" aria-label="Hand rankings, best first">
          ${rankingsHtml(null)}
          <p class="how-tip">Same hand? Higher cards win — a pair of Kings beats a pair of 7s. Suits never rank. An Ace can also be low: A-2-3-4-5.</p>
        </section>
      </div>
    </main>`,
    'howto',
  );
  bindTopBar(root);
}

register('howto', howto);
