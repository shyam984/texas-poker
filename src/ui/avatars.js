// Ten original characters, drawn as SVG (sharp at any size, tiny to download).
// Each has eyelids that blink now and then, and every accessory fits on any
// character. avatarHtml(look) draws a player's full look.

const K = '#1d1147'; // outline ink
const S = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const eye = (x, y, r = 5.5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${K}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" fill="#fff"/>`;
const cheeks = (x1, x2, y, c = '#ff7aa8') => `<ellipse cx="${x1}" cy="${y}" rx="5" ry="3.2" fill="${c}" opacity=".55"/><ellipse cx="${x2}" cy="${y}" rx="5" ry="3.2" fill="${c}" opacity=".55"/>`;

// eyes: [[x, y, r], ...] used for blinking and for glasses; lid: skin colour; top: y of head top (for hats)
export const CHARACTERS = {
  fox: {
    bg: ['#ffd9a8', '#ff8c42'],
    eyes: [[40, 52, 5.5], [60, 52, 5.5]],
    lid: '#ff8c32',
    top: 18,
    art: `
      <path d="M22 44 18 14l24 16Z" fill="#ff8c32" ${S}/><path d="M78 44l4-30-24 16Z" fill="#ff8c32" ${S}/>
      <path d="M24 34 22 20l12 9Z M76 34l2-14-12 9Z" fill="#fff1e0"/>
      <path d="M50 26c20 0 32 14 32 30 0 18-15 30-32 30S18 74 18 56c0-16 12-30 32-30Z" fill="#ff8c32" ${S}/>
      <path d="M50 86c-11 0-20-7-22-15 7 2 13 0 22-8 9 8 15 10 22 8-2 8-11 15-22 15Z" fill="#fff4e6"/>
      <path d="M46 64h8l-4 4Z" fill="${K}" ${S}/>
      <path d="M44 72q6 5 12 0" fill="none" ${S}/>
      <path d="M33 45l12 3M67 45l-12 3" ${S}/>`,
  },
  bear: {
    bg: ['#c9f5ff', '#3fb6e8'],
    eyes: [[40, 50, 5], [60, 50, 5]],
    lid: '#b87a4b',
    top: 16,
    art: `
      <circle cx="26" cy="28" r="11" fill="#b87a4b" ${S}/><circle cx="74" cy="28" r="11" fill="#b87a4b" ${S}/>
      <circle cx="26" cy="28" r="5" fill="#f2c9a0"/><circle cx="74" cy="28" r="5" fill="#f2c9a0"/>
      <ellipse cx="50" cy="54" rx="31" ry="29" fill="#b87a4b" ${S}/>
      <ellipse cx="50" cy="64" rx="15" ry="11" fill="#f2c9a0"/>
      <ellipse cx="50" cy="59" rx="6" ry="4" fill="${K}"/>
      <path d="M44 68q6 5 12 0" fill="none" ${S}/>
      <path d="M38 84l12-5 12 5-12 5Z" fill="#ff4f8b" ${S}/><circle cx="50" cy="84" r="3" fill="#ffd23f"/>`,
  },
  explorer: {
    bg: ['#d7ffc2', '#5ccf62'],
    eyes: [[41, 55, 5], [59, 55, 5]],
    lid: '#a8683f',
    top: 8,
    art: `
      <ellipse cx="50" cy="58" rx="26" ry="27" fill="#a8683f" ${S}/>
      <path d="M26 50c0-12 10-20 24-20s24 8 24 20c-5-5-12-7-24-7s-19 2-24 7Z" fill="#3a2212"/>
      <path d="M12 38h76" ${S}/><path d="M22 38c2-14 12-24 28-24s26 10 28 24Z" fill="#f2d28a" ${S}/>
      <path d="M22 34h56" stroke="#8b5e2e" stroke-width="5"/>
      <path d="M12 38h76" stroke="#f2d28a" stroke-width="6" stroke-linecap="round"/><path d="M12 38h76" fill="none" stroke="${K}" stroke-width="1.5" opacity=".4"/>
      ${cheeks(34, 66, 64, '#ff8f6b')}
      <circle cx="37" cy="62" r="1" fill="#6b3f22"/><circle cx="40" cy="64" r="1" fill="#6b3f22"/><circle cx="60" cy="64" r="1" fill="#6b3f22"/><circle cx="63" cy="62" r="1" fill="#6b3f22"/>
      <path d="M40 69q10 9 20 0Z" fill="#fff" ${S}/>`,
  },
  robot: {
    bg: ['#d9e4ff', '#6c7dff'],
    eyes: [[39, 52, 6], [61, 52, 6]],
    lid: '#2a2f5c',
    top: 20,
    art: `
      <path d="M50 22V10" ${S}/><path d="M47 4l7 0-5 7h6l-9 10 3-8h-5Z" fill="#ffd23f" ${S}/>
      <rect x="22" y="24" width="56" height="52" rx="14" fill="#e7ecfa" ${S}/>
      <rect x="29" y="36" width="42" height="30" rx="9" fill="#2a2f5c"/>
      <circle cx="39" cy="52" r="6" fill="#4ff0ff"/><circle cx="61" cy="52" r="6" fill="#4ff0ff"/>
      <circle cx="41" cy="50" r="2" fill="#fff"/><circle cx="63" cy="50" r="2" fill="#fff"/>
      <path d="M43 62q7 4 14 0" fill="none" stroke="#4ff0ff" stroke-width="3" stroke-linecap="round"/>
      <rect x="14" y="42" width="8" height="18" rx="4" fill="#ff5e9a" ${S}/><rect x="78" y="42" width="8" height="18" rx="4" fill="#ff5e9a" ${S}/>
      <rect x="34" y="78" width="32" height="10" rx="4" fill="#c5cdea" ${S}/>`,
  },
  pirate: {
    bg: ['#bff4ff', '#2aa6c9'],
    eyes: [[60, 53, 5.5], [40, 53, 0.01]],
    lid: '#f5c6a0',
    top: 12,
    art: `
      <ellipse cx="50" cy="58" rx="25" ry="26" fill="#f5c6a0" ${S}/>
      <path d="M28 66c4 14 12 20 22 20s18-6 22-20c-6 4-14 6-22 6s-16-2-22-6Z" fill="#c2542d" ${S}/>
      <path d="M40 72q10 5 20 0" fill="none" ${S}/>
      <path d="M31 48l18 6" stroke="${K}" stroke-width="2.5"/><ellipse cx="40" cy="53" rx="7" ry="6" fill="${K}"/>
      <path d="M14 36c10-20 62-20 72 0-8 4-20 6-36 6s-28-2-36-6Z" fill="#2c2350" ${S}/>
      <path d="M28 28c6-16 38-16 44 0" fill="#2c2350" ${S}/>
      <circle cx="50" cy="28" r="5" fill="#fff"/><path d="M46 34l8-4M46 30l8 4" stroke="#fff" stroke-width="2"/>
      <path d="M16 36c12 5 56 5 68 0" stroke="#ffd23f" stroke-width="2.5" fill="none"/>
      <circle cx="74" cy="66" r="3" fill="#ffd23f" ${S}/>`,
  },
  racer: {
    bg: ['#ffe0f0', '#ff4f9a'],
    eyes: [[41, 55, 5], [59, 55, 5]],
    lid: '#ffd2b0',
    top: 10,
    art: `
      <path d="M18 56c0-24 14-40 32-40s32 16 32 40v14c0 4-3 6-7 6H25c-4 0-7-2-7-6Z" fill="#ff3d7f" ${S}/>
      <path d="M44 16h12v58H44z" fill="#fff"/><path d="M44 16h12" ${S}/>
      <ellipse cx="50" cy="60" rx="20" ry="18" fill="#ffd2b0" ${S}/>
      <path d="M26 44h48" stroke="${K}" stroke-width="3"/><path d="M26 44c2-6 46-6 48 0v4H26Z" fill="#2c2350" opacity=".85"/>
      ${cheeks(36, 64, 64)}
      <path d="M42 68q8 6 16 0" fill="none" ${S}/>
      <circle cx="30" cy="30" r="6" fill="#ffd23f" ${S}/><text x="30" y="33.5" font-size="9" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" fill="${K}">1</text>`,
  },
  ninja: {
    bg: ['#e2d6ff', '#7b52e8'],
    eyes: [[41, 52, 4.5], [59, 52, 4.5]],
    lid: '#ffe0bd',
    top: 16,
    art: `
      <circle cx="50" cy="54" r="31" fill="#2e2863" ${S}/>
      <path d="M22 44h56v17H22z" fill="#ffe0bd"/><path d="M21 44h58M21 61h58" ${S}/>
      <path d="M34 47l11 3M66 47l-11 3" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
      <path d="M22 36h56" stroke="#ff3d5a" stroke-width="7"/><path d="M78 36l12-8M78 36l10 9" stroke="#ff3d5a" stroke-width="5" stroke-linecap="round"/>
      <path d="M44 72l6 4 6-4" fill="none" stroke="#6a5fb0" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  wizard: {
    bg: ['#d8ccff', '#5d3fd3'],
    eyes: [[41, 56, 4.5], [59, 56, 4.5]],
    lid: '#ffd6b8',
    top: 4,
    art: `
      <ellipse cx="50" cy="58" rx="22" ry="22" fill="#ffd6b8" ${S}/>
      <path d="M28 62c0 14 10 26 22 26s22-12 22-26c-6 6-14 8-22 8s-16-2-22-8Z" fill="#fff" ${S}/>
      <path d="M40 66q10 6 20 0" fill="#fff" ${S}/>
      <path d="M35 50q6-4 12 0M53 50q6-4 12 0" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="61" r="4" fill="#ffab91"/>
      <path d="M18 44 50 2l30 42Z" fill="#3b2aa3" ${S}/><path d="M14 44h72" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="M14 44h72" stroke="#3b2aa3" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 16l2.4 5 5.4.6-4 3.6 1.2 5.3L50 28l-5 2.5 1.2-5.3-4-3.6 5.4-.6Z" fill="#ffd23f"/>
      <circle cx="37" cy="34" r="2" fill="#ffd23f"/><circle cx="63" cy="30" r="1.6" fill="#ffd23f"/>`,
  },
  astro: {
    bg: ['#3a2c8f', '#120a3a'],
    eyes: [[42, 54, 5], [58, 54, 5]],
    lid: '#c98a5a',
    top: 12,
    art: `
      <circle cx="16" cy="20" r="1.4" fill="#fff"/><circle cx="84" cy="26" r="1.2" fill="#fff"/><circle cx="80" cy="80" r="1.5" fill="#fff"/><circle cx="18" cy="76" r="1" fill="#fff"/>
      <circle cx="50" cy="52" r="34" fill="#f4f6ff" ${S}/>
      <circle cx="50" cy="54" r="24" fill="#1e1a4d" ${S}/>
      <ellipse cx="50" cy="58" rx="17" ry="17" fill="#c98a5a"/>
      ${cheeks(40, 60, 62)}
      <path d="M44 66q6 5 12 0" fill="none" ${S}/>
      <path d="M34 38q6-8 16-9" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8" fill="none"/>
      <rect x="44" y="12" width="12" height="7" rx="3" fill="#ff5e9a" ${S}/>
      <circle cx="20" cy="54" r="5" fill="#ffd23f" ${S}/><circle cx="80" cy="54" r="5" fill="#ffd23f" ${S}/>`,
  },
  royal: {
    bg: ['#fff3b0', '#ffb21f'],
    eyes: [[41, 55, 5], [59, 55, 5]],
    lid: '#ffc257',
    top: 6,
    art: `
      <circle cx="50" cy="56" r="34" fill="#c75c1a" ${S}/>
      <path d="M50 22l6 8 9-4 2 10 10 1-4 9 8 6-8 6 4 9-10 1-2 10-9-4-6 8-6-8-9 4-2-10-10-1 4-9-8-6 8-6-4-9 10-1 2-10 9 4Z" fill="#e0772a"/>
      <circle cx="50" cy="58" r="22" fill="#ffc257" ${S}/>
      <ellipse cx="50" cy="67" rx="10" ry="7" fill="#fff0cf"/>
      <path d="M46 63h8l-4 4Z" fill="${K}"/><path d="M44 70q6 4 12 0" fill="none" ${S}/>
      <path d="M32 22l6 12 6-10 6 10 6-10 6 10 6-12 2 16H30Z" fill="#ffd23f" ${S}/>
      <circle cx="44" cy="30" r="2" fill="#ff3d7f"/><circle cx="50" cy="31" r="2.4" fill="#35d6f5"/><circle cx="56" cy="30" r="2" fill="#2fdc8f"/>`,
  },
};

export const CHAR_IDS = Object.keys(CHARACTERS);

// ---------------------------------------------------------------- accessories
function accessory(key, c) {
  const [l, r] = c.eyes;
  const ey = l[1];
  const top = c.top;
  switch (key) {
    case 'party':
      return `<path d="M60 ${top + 6} 74 ${top - 20} 82 ${top + 10}Z" fill="#35d6f5" ${S}/><path d="M66 ${top - 4}l10 3M70 ${top - 12}l6 2" stroke="#ff4f9a" stroke-width="3"/><circle cx="74" cy="${top - 21}" r="4" fill="#ffd23f" ${S}/>`;
    case 'shades': {
      const cx1 = Math.min(l[0], r[0]);
      const cx2 = Math.max(l[0], r[0]);
      return `<path d="M${cx1 - 12} ${ey - 5}h${cx2 - cx1 + 24}" ${S}/><path d="M${cx1 - 10} ${ey - 5}h20l-3 10c-1 3-4 4-7 4s-9-1-10-6Z" fill="#1d1147"/><path d="M${cx2 - 10} ${ey - 5}h20l-1 8c-1 5-7 6-10 6s-6-1-7-4Z" fill="#1d1147"/><path d="M${cx1 - 6} ${ey - 2}l5 0M${cx2 - 6} ${ey - 2}l5 0" stroke="#35d6f5" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    case 'headphones':
      return `<path d="M18 ${ey + 2}c0-26 64-26 64 0" fill="none" stroke="#1d1147" stroke-width="7" stroke-linecap="round"/><path d="M18 ${ey + 2}c0-26 64-26 64 0" fill="none" stroke="#ff4f9a" stroke-width="4" stroke-linecap="round"/><rect x="10" y="${ey - 6}" width="12" height="20" rx="6" fill="#ff4f9a" ${S}/><rect x="78" y="${ey - 6}" width="12" height="20" rx="6" fill="#ff4f9a" ${S}/>`;
    case 'flower':
      return `<g transform="translate(28 ${top + 6})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-7" rx="5" ry="7" fill="#ff7ab8" stroke="${K}" stroke-width="2" transform="rotate(${a})"/>`).join('')}<circle r="4.5" fill="#ffd23f" stroke="${K}" stroke-width="2"/></g>`;
    case 'crown':
      return `<path d="M36 ${top + 2}l3-14 7 8 4-11 4 11 7-8 3 14Z" fill="#ffd23f" ${S}/><circle cx="50" cy="${top - 3}" r="2" fill="#ff3d7f"/>`;
    case 'halo':
      return `<ellipse cx="50" cy="${Math.max(6, top - 6)}" rx="20" ry="5" fill="none" stroke="#ffd23f" stroke-width="5"/><ellipse cx="50" cy="${Math.max(6, top - 6)}" rx="20" ry="5" fill="none" stroke="#fff6c2" stroke-width="1.5"/>`;
    default:
      return '';
  }
}

let uid = 0;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * SVG for a character with an accessory. `look` is { char: 'char:fox', acc: 'acc:party' }
 * (ids as in the catalog) or a bare character key.
 */
export function avatarSvg(look, { blink = true } = {}) {
  const key = typeof look === 'string' ? look.replace('char:', '') : String((look && look.char) || 'char:fox').replace('char:', '');
  const c = CHARACTERS[key] || CHARACTERS.fox;
  const acc = typeof look === 'object' && look && look.acc ? String(look.acc).replace('acc:', '') : 'none';
  const n = ++uid;
  const lids = blink
    ? c.eyes
        .filter((e) => e[2] > 0.1)
        .map((e) => `<ellipse class="lid" cx="${e[0]}" cy="${e[1]}" rx="${e[2] + 1.6}" ry="${e[2] + 1.6}" fill="${c.lid}"/>`)
        .join('')
    : '';
  const eyes = c.eyes.filter((e) => e[2] > 0.1 && key !== 'robot' && key !== 'ninja').map((e) => eye(e[0], e[1], e[2])).join('');
  const ninjaEyes = key === 'ninja' ? c.eyes.map((e) => `<circle cx="${e[0]}" cy="${e[1] + 1}" r="${e[2] - 1}" fill="${K}"/><circle cx="${e[0] + 1}" cy="${e[1]}" r="1.3" fill="#fff"/>`).join('') : '';
  return `<svg class="av-art" viewBox="-6 -8 112 112" aria-hidden="true">
    <defs><radialGradient id="bg${n}" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></radialGradient>
    <clipPath id="cl${n}"><circle cx="50" cy="48" r="54"/></clipPath></defs>
    <circle cx="50" cy="48" r="54" fill="url(#bg${n})"/>
    <g clip-path="url(#cl${n})"><g class="av-body">${c.art}${eyes}${ninjaEyes}${lids}</g></g>
    <g class="av-acc">${accessory(acc, c)}</g>
  </svg>`;
}

export const charName = (id) => ({ fox: 'Foxy Fizz', bear: 'Barnaby Bear', explorer: 'Juno Explorer', robot: 'Bolt Bot', pirate: 'Captain Coral', racer: 'Turbo Tess', ninja: 'Kiko Ninja', wizard: 'Merlin Moon', astro: 'Cosmo Star', royal: 'King Leo' })[String(id).replace('char:', '')] || '';

/** Full avatar element HTML: character + accessory inside a frame ring. */
export function avatarHtml(look, { size = '', blink = true } = {}) {
  const frame = look && look.frame ? String(look.frame).replace('frame:', '') : 'none';
  return `<span class="avatar fr-${esc(frame)} ${size}"><span class="av-in">${avatarSvg(look, { blink })}</span></span>`;
}
