// Shared app state and screen navigation. Screens register themselves here
// so they can open each other without import cycles.

export const app = {
  screen: null, // name of the current screen
  mode: null, // 'solo' | 'host' | 'client' while at a table or lobby
  host: null, // PokerHost (solo or when hosting)
  table: null, // TableView
  room: null, // hosting: network room
  conn: null, // client: connection to host
  lobby: null,
  stakeInPlay: 0,
  leaving: false,
  reconnecting: false,
  gameEnded: false,
  handsPlayed: 0,
  handsWon: 0,
  timers: new Set(),
};

const screens = {};
export function register(name, fn) {
  screens[name] = fn;
}

export function go(name, ...args) {
  const fn = screens[name];
  if (!fn) throw new Error(`No screen ${name}`);
  app.screen = name;
  return fn(...args);
}

/** Replace the main screen's content with a short fade. */
export function render(html, cls = '') {
  const root = document.getElementById('screen');
  root.innerHTML = `<div class="scr ${cls} scr-in">${html}</div>`;
  return root.firstElementChild;
}
