// Cards are two-character strings: rank + suit, e.g. 'As', 'Td', '7c'.
// Ranks 2–9, T, J, Q, K, A; suits s (spades), h (hearts), d (diamonds), c (clubs).

export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';

/** Numeric rank 2..14 (ace high). */
export const rankOf = (c) => RANKS.indexOf(c[0]) + 2;
export const suitOf = (c) => c[1];

export const RANK_NAME = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace' };
export const RANK_PLURAL = { 2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens', 8: 'Eights', 9: 'Nines', 10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces' };
export const rankLabel = (r) => ({ 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[r] || String(r);

export function fullDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  return d;
}

/** Small, fast seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0];
  } catch {
    return Math.floor(Math.random() * 2 ** 32);
  }
}

/** Fisher–Yates shuffle (in place). */
export function shuffle(arr, rand = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
