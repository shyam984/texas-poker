// Poker chips. Amounts are shown as a small stack of coloured chips; each
// colour is a different value so bigger bets look bigger.

export const DENOMS = [
  { v: 5000, c: 'pink' },
  { v: 1000, c: 'gold' },
  { v: 500, c: 'purple' },
  { v: 100, c: 'blue' },
  { v: 25, c: 'green' },
  { v: 5, c: 'red' },
];

/** Break an amount into chips (largest first), at most `max` chips. */
export function breakdown(amount, max = 7) {
  const out = [];
  let left = amount;
  for (const d of DENOMS) {
    while (left >= d.v && out.length < max) {
      out.push(d.c);
      left -= d.v;
    }
  }
  if (!out.length && amount > 0) out.push('red');
  return out;
}

/** HTML for a stack of chips (columns of up to 5). */
export function stackHtml(amount, { max = 8 } = {}) {
  const cs = breakdown(amount, max);
  const cols = [];
  for (let i = 0; i < cs.length; i += 4) cols.push(cs.slice(i, i + 4));
  return `<span class="chips">${cols
    .map((col, ci) => `<span class="ccol" style="--ci:${ci}">${col.map((c, i) => `<i class="chip ch-${c}" style="--i:${i}"></i>`).join('')}</span>`)
    .join('')}</span>`;
}

export function chipEl(color = 'red') {
  const el = document.createElement('i');
  el.className = `chip ch-${color} flying-chip`;
  return el;
}
