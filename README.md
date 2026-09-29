# Texas Poker

A bright, friendly Texas Hold'em game for the browser. Play sit-and-go tables against computer players, or invite up to four friends with a room code. Earn coins, open a daily chest, level up through a free 60-level pass, complete missions and collect characters, card backs, tables, emotes, frames and titles.

Plain HTML, CSS and JavaScript — no build step, no server. Upload the files to GitHub Pages (or any static host) and it works.

## How a game works

- 2–5 players. Everyone pays the **stake** (100 / 200 / 500 / 1,000 / 10,000 coins) and gets 1,000 chips.
- Real Texas Hold'em: 2 hole cards each, flop / turn / river, dealer button, small and big blind, check / bet / call / raise / fold / all-in, minimum raises, side pots, split pots.
- Blinds go up every 5 hands. Run out of chips and you're out. **The last player with chips wins the prize**: with 4–5 players the winner gets everything except the 2nd-place player's stake, which is returned; with 2–3 players the winner takes it all.

## Rewards and progress

- **1,000 coins** when you first play, **+500 free coins every 5 minutes**, and a **Daily Chest** (coins or a collectible you don't have yet).
- **XP** from every hand and game. Each level unlocks a **Free Pass** reward (60 levels, no payments). Past the pass, every level gives 500 coins.
- **Missions**: 3 daily and 3 weekly, paying XP and coins.
- **Collection**: 10 characters, 7 accessories (fit any character), 8 card backs, 6 tables, 14 emotes (including animated stickers), 7 frames, 7 titles and 8 badges earned by achievements.

## Friend rooms

Tap **Create Room** and share the 5-letter code (or the invite link). Friends tap **Join Room**, then **I'm in**. The host can add computer players (tap the level to change it), pick the stake and start.

The host's browser runs the game and checks every move; friends' devices only send requests, so nobody can make an illegal move or claim a win. Each player receives only their own cards. Dropped connections reconnect automatically (the seat checks or folds meanwhile); refreshing the page offers to rejoin. If the host leaves, the room closes and everyone still playing gets their stake back.

Rooms use browser-to-browser connections (WebRTC via PeerJS, MIT licence). The free PeerJS service only introduces the browsers. Some strict school/office networks block these connections.

Coins and progress are saved in each player's browser. There's no server, so a determined player could edit their own numbers; it only affects them.

## Controls

- **Touch or mouse**: big Fold / Check / Call / Raise buttons; Raise opens a slider with ½, ⅔, ¾ pot, pot and all-in presets. Pre-select *Check / Fold* or *Call any* while you wait.
- **Keyboard**: F fold · C check/call · R raise · Enter confirm · Esc cancel.
- Works on desktop, tablets and phones (portrait and landscape). Respects the reduced-motion setting.

## Files

```
index.html
styles/main.css            design system, screens, table, animations
src/poker/cards.js         cards, shuffling
src/poker/eval.js          hand evaluator (+ a fast version for simulations)
src/poker/engine.js        Texas Hold'em rules, betting, side pots, tournament
src/poker/bots.js          computer players (4 levels × 5 personalities)
src/game/host.js           runs a game: turns, timers, bots, private cards, reconnection
src/game/session.js        stake, prizes, progression hooks, solo games
src/profile/catalog.js     items, the free pass, missions, economy numbers
src/profile/store.js       saved profile
src/profile/progress.js    XP, levels, pass, missions, chest, free coins, badges
src/ui/*.js                table view, cards, chips, avatars, item art, effects, helpers
src/screens/*.js           home, onboarding, solo setup, rooms, results, pass, chest, missions, collection, how to play, settings
src/audio.js               synthesised sound effects and music
src/net.js                 room codes and connections
src/platform.js            optional CrazyGames SDK (only loads on crazygames.com)
vendor/peerjs.min.js
assets/fonts/              Lilita One and Nunito (SIL Open Font License)
```

Testing aids: `?speed=4` runs games faster; `?peer=host:port` uses a local PeerServer.
