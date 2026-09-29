// Everything a player can own, and the free pass that unlocks it.
// Item ids are "kind:name", e.g. "char:fox", "back:galaxy".

export const RARITY = {
  common: { label: 'Common', color: '#8fd3ff' },
  rare: { label: 'Rare', color: '#5b8cff' },
  epic: { label: 'Epic', color: '#b35cff' },
  legendary: { label: 'Legendary', color: '#ffb21f' },
};

export const KINDS = {
  char: { label: 'Characters', one: 'Character', equip: 'char' },
  acc: { label: 'Accessories', one: 'Accessory', equip: 'acc' },
  back: { label: 'Card Backs', one: 'Card Back', equip: 'back' },
  table: { label: 'Tables', one: 'Table', equip: 'table' },
  emote: { label: 'Emotes', one: 'Emote', equip: null },
  frame: { label: 'Frames', one: 'Profile Frame', equip: 'frame' },
  title: { label: 'Titles', one: 'Title', equip: 'title' },
  badge: { label: 'Badges', one: 'Badge', equip: null },
};

const I = (kind, key, name, rarity, extra = {}) => ({ id: `${kind}:${key}`, kind, key, name, rarity, ...extra });

export const ITEMS = [
  // characters
  I('char', 'fox', 'Foxy Fizz', 'common', { starter: true, bio: 'A mischievous fox who never folds a good joke.' }),
  I('char', 'bear', 'Barnaby Bear', 'common', { starter: true, bio: 'Big, friendly and suspiciously good at bluffing.' }),
  I('char', 'explorer', 'Juno Explorer', 'common', { starter: true, bio: 'Always hunting for the next big pot.' }),
  I('char', 'robot', 'Bolt Bot', 'rare', { bio: 'Calculates the odds. Still loves a lucky river.' }),
  I('char', 'pirate', 'Captain Coral', 'rare', { bio: 'Sails the seven tables looking for treasure.' }),
  I('char', 'racer', 'Turbo Tess', 'rare', { bio: 'Plays fast. Wins faster.' }),
  I('char', 'ninja', 'Kiko Ninja', 'epic', { bio: 'Silent, patient, deadly with a check-raise.' }),
  I('char', 'wizard', 'Merlin Moon', 'epic', { bio: 'Can magic a flush out of thin air.' }),
  I('char', 'astro', 'Cosmo Star', 'epic', { bio: 'Plays poker in zero gravity.' }),
  I('char', 'royal', 'King Leo', 'legendary', { bio: 'The crown is real. So is the poker face.' }),
  // accessories (drawn on top of any character)
  I('acc', 'none', 'No accessory', 'common', { starter: true }),
  I('acc', 'party', 'Party Hat', 'common'),
  I('acc', 'shades', 'Star Shades', 'rare'),
  I('acc', 'headphones', 'Beat Phones', 'rare'),
  I('acc', 'flower', 'Lucky Flower', 'common'),
  I('acc', 'crown', 'Mini Crown', 'epic'),
  I('acc', 'halo', 'Golden Halo', 'legendary'),
  // card backs
  I('back', 'classic', 'Classic', 'common', { starter: true }),
  I('back', 'candy', 'Candy', 'common'),
  I('back', 'ocean', 'Ocean', 'common'),
  I('back', 'jungle', 'Jungle', 'rare'),
  I('back', 'fire', 'Fire', 'rare'),
  I('back', 'lightning', 'Lightning', 'epic'),
  I('back', 'galaxy', 'Galaxy', 'epic'),
  I('back', 'rainbow', 'Rainbow', 'legendary'),
  // tables
  I('table', 'classic', 'Classic Felt', 'common', { starter: true }),
  I('table', 'candy', 'Candy Table', 'rare'),
  I('table', 'jungle', 'Jungle Table', 'rare'),
  I('table', 'pirate', 'Pirate Table', 'epic'),
  I('table', 'neon', 'Neon Table', 'epic'),
  I('table', 'space', 'Space Table', 'legendary'),
  // emotes
  I('emote', 'laugh', 'LOL', 'common', { starter: true, glyph: '😂' }),
  I('emote', 'cool', 'Cool', 'common', { starter: true, glyph: '😎' }),
  I('emote', 'shock', 'Shocked', 'common', { starter: true, glyph: '😱' }),
  I('emote', 'clap', 'Applause', 'common', { starter: true, glyph: '👏' }),
  I('emote', 'fire', 'On Fire', 'common', { starter: true, glyph: '🔥' }),
  I('emote', 'love', 'Love', 'common', { glyph: '❤️' }),
  I('emote', 'party', 'Party', 'common', { glyph: '🎉' }),
  I('emote', 'mind', 'Mind Blown', 'rare', { glyph: '🤯' }),
  I('emote', 'crown', 'King Me', 'rare', { glyph: '👑' }),
  I('emote', 'skull', 'Busted', 'rare', { glyph: '💀' }),
  I('emote', 'gg', 'GG!', 'rare', { sticker: 'GG!', anim: 'bounce' }),
  I('emote', 'nice', 'Nice Hand!', 'epic', { sticker: 'Nice hand!', anim: 'wiggle' }),
  I('emote', 'allin', 'ALL IN!', 'epic', { sticker: 'ALL IN!', anim: 'shake' }),
  I('emote', 'lucky', 'So Lucky!', 'legendary', { sticker: 'So lucky! 🍀', anim: 'spin' }),
  // profile frames
  I('frame', 'none', 'Simple', 'common', { starter: true }),
  I('frame', 'gold', 'Gold Ring', 'common'),
  I('frame', 'ice', 'Ice Crystal', 'rare'),
  I('frame', 'neon', 'Neon Glow', 'rare'),
  I('frame', 'flame', 'Flame', 'epic'),
  I('frame', 'rainbow', 'Rainbow', 'epic'),
  I('frame', 'crown', 'Royal Crown', 'legendary'),
  // titles
  I('title', 'rookie', 'Rookie', 'common', { starter: true }),
  I('title', 'regular', 'Table Regular', 'common'),
  I('title', 'shark', 'Card Shark', 'rare'),
  I('title', 'bluffer', 'Bluff Master', 'rare'),
  I('title', 'roller', 'High Roller', 'epic'),
  I('title', 'chipleader', 'Chip Leader', 'epic'),
  I('title', 'legend', 'Poker Legend', 'legendary'),
  // badges (earned by achievements, not the pass)
  I('badge', 'firstwin', 'First Victory', 'common', { how: 'Win your first game', icon: '🏆' }),
  I('badge', 'twopair', 'Double Trouble', 'common', { how: 'Win a hand with Two Pair or better', icon: '✌️' }),
  I('badge', 'fullhouse', 'Full House!', 'rare', { how: 'Win a hand with a Full House', icon: '🏠' }),
  I('badge', 'allin', 'All-In Hero', 'rare', { how: 'Win a hand after going all-in', icon: '💥' }),
  I('badge', 'streak', 'On Fire', 'epic', { how: 'Win 3 games in a row', icon: '🔥' }),
  I('badge', 'wins10', 'Ten Titles', 'epic', { how: 'Win 10 games', icon: '🎖️' }),
  I('badge', 'quads', 'Four of a Kind', 'epic', { how: 'Win a hand with Four of a Kind', icon: '🍀' }),
  I('badge', 'royal', 'Royal Flush', 'legendary', { how: 'Win a hand with a Royal Flush', icon: '👑' }),
];

export const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));
export const item = (id) => BY_ID.get(id);
export const STARTERS = ITEMS.filter((i) => i.starter).map((i) => i.id);
export const itemsOf = (kind) => ITEMS.filter((i) => i.kind === kind);

// ---------------------------------------------------------------- free pass
// 60 tiers. Tier N is unlocked on reaching player level N + 1.
const C = (coins) => ({ coins });
const U = (id) => ({ item: id });
export const PASS = [
  C(250), U('emote:love'), C(300), U('acc:party'), U('char:robot'),
  C(400), U('back:candy'), U('title:regular'), C(500), U('frame:gold'),
  U('emote:party'), C(600), U('table:candy'), U('back:ocean'), C(750),
  U('char:pirate'), U('acc:flower'), C(800), U('emote:gg'), U('frame:ice'),
  C(1000), U('back:jungle'), U('title:shark'), U('emote:mind'), C(1000),
  U('char:racer'), U('acc:shades'), U('table:jungle'), C(1250), U('back:fire'),
  U('emote:crown'), U('frame:neon'), C(1500), U('acc:headphones'), U('char:ninja'),
  U('title:bluffer'), C(1500), U('emote:skull'), U('back:lightning'), U('emote:nice'),
  C(2000), U('table:pirate'), U('frame:flame'), U('char:wizard'), C(2000),
  U('title:roller'), U('back:galaxy'), U('emote:allin'), C(2500), U('acc:crown'),
  U('table:neon'), U('frame:rainbow'), U('char:astro'), C(3000), U('title:chipleader'),
  U('emote:lucky'), U('back:rainbow'), U('table:space'), U('acc:halo'), U('frame:crown'),
];
// The final prize: King Leo and the Legend title arrive together at the last tier.
PASS[59] = { item: 'char:royal', also: ['title:legend', 'frame:crown'], coins: 5000 };

export const MAX_LEVEL = PASS.length + 1; // 61
/** XP needed to go from `level` to `level + 1`. */
export const xpToNext = (level) => 100 + 12 * (level - 1);

// ---------------------------------------------------------------- missions
// Each counts one statistic. `need` is the target; rewards are XP + coins.
export const DAILY = [
  { id: 'd_play3', text: 'Play 3 games', stat: 'games', need: 3, xp: 150, coins: 200 },
  { id: 'd_win1', text: 'Win 1 game', stat: 'wins', need: 1, xp: 200, coins: 300 },
  { id: 'd_hands3', text: 'Win 3 hands', stat: 'handsWon', need: 3, xp: 100, coins: 150 },
  { id: 'd_play10', text: 'Play 10 hands', stat: 'hands', need: 10, xp: 100, coins: 150 },
  { id: 'd_fh', text: 'Win a hand with a Full House', stat: 'fullHouseWins', need: 1, xp: 250, coins: 400 },
  { id: 'd_flush', text: 'Win a hand with a Flush or better', stat: 'flushWins', need: 1, xp: 180, coins: 300 },
  { id: 'd_play5', text: 'Play 5 games', stat: 'games', need: 5, xp: 250, coins: 400 },
  { id: 'd_two', text: 'Win a hand with Two Pair or better', stat: 'twoPairWins', need: 2, xp: 100, coins: 150 },
  { id: 'd_show', text: 'Win 2 hands at showdown', stat: 'showdownWins', need: 2, xp: 120, coins: 200 },
];
export const WEEKLY = [
  { id: 'w_win10', text: 'Win 10 games', stat: 'wins', need: 10, xp: 800, coins: 2000 },
  { id: 'w_earn', text: 'Earn 10,000 coins', stat: 'coinsWon', need: 10000, xp: 800, coins: 2500 },
  { id: 'w_hands50', text: 'Play 50 hands', stat: 'hands', need: 50, xp: 500, coins: 1000 },
  { id: 'w_types', text: 'Win with 3 different hand types', stat: 'handTypes', need: 3, xp: 600, coins: 1500 },
  { id: 'w_games15', text: 'Play 15 games', stat: 'games', need: 15, xp: 600, coins: 1500 },
  { id: 'w_won25', text: 'Win 25 hands', stat: 'handsWon', need: 25, xp: 600, coins: 1200 },
];

// ---------------------------------------------------------------- economy
export const START_COINS = 1000;
export const STAKES = [100, 200, 500, 1000, 10000];
export const FREE_COINS = 500;
export const FREE_EVERY_MS = 5 * 60 * 1000;

/**
 * Prize for each finishing place. Everyone pays the stake into the prize pool.
 * With 4–5 players, 2nd place gets their stake back and 1st takes the rest;
 * with 2–3 players the winner takes it all.
 */
export function prizes(stake, players) {
  const pool = stake * players;
  if (players >= 4) return [pool - stake, stake];
  return [pool];
}

// XP for play
export const XP = { hand: 3, handWon: 8, game: 30, place1: 80, place2: 35 };
