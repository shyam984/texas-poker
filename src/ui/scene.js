// The cosy poker lounge behind the table: warm sunset walls, a window, a
// glowing floor lamp, the wooden TEXAS POKER sign, a cactus in sunglasses,
// a purple sofa, side tables with drinks and chips, and big tropical plants.
// Drawn as SVG (no image files). There's a wide version for landscape and a
// tall version for portrait phones; CSS shows the right one.

const K = '#3a1c10'; // dark wood outline

function defs(id) {
  return `<defs>
    <linearGradient id="${id}wall" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffb46a"/><stop offset=".32" stop-color="#fb8f78"/>
      <stop offset=".62" stop-color="#d4709f"/><stop offset="1" stop-color="#7a52cf"/>
    </linearGradient>
    <linearGradient id="${id}wallShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#2a0f55" stop-opacity=".35"/>
    </linearGradient>
    <radialGradient id="${id}sun" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff2c4" stop-opacity=".95"/><stop offset=".45" stop-color="#ffd690" stop-opacity=".45"/><stop offset="1" stop-color="#ffc070" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${id}lamp" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#fff6cf" stop-opacity="1"/><stop offset=".35" stop-color="#ffe08a" stop-opacity=".55"/><stop offset="1" stop-color="#ffcf6a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd98f"/><stop offset=".55" stop-color="#ffab86"/><stop offset="1" stop-color="#f7879b"/>
    </linearGradient>
    <linearGradient id="${id}floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c47a44"/><stop offset="1" stop-color="#7e3f1f"/>
    </linearGradient>
    <linearGradient id="${id}wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c98648"/><stop offset=".5" stop-color="#a0602c"/><stop offset="1" stop-color="#7a431d"/>
    </linearGradient>
    <linearGradient id="${id}leafA" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c7a3a"/><stop offset=".55" stop-color="#3dbb58"/><stop offset="1" stop-color="#7fe07a"/>
    </linearGradient>
    <linearGradient id="${id}leafB" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0f5a2c"/><stop offset=".6" stop-color="#23994a"/><stop offset="1" stop-color="#4fcf66"/>
    </linearGradient>
    <linearGradient id="${id}pot" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f08a55"/><stop offset=".6" stop-color="#d0633a"/><stop offset="1" stop-color="#a8482a"/>
    </linearGradient>
    <linearGradient id="${id}sofa" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a176ff"/><stop offset="1" stop-color="#5a33c4"/>
    </linearGradient>
    <linearGradient id="${id}cactus" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2f9e4a"/><stop offset=".5" stop-color="#5fd46e"/><stop offset="1" stop-color="#2f9e4a"/>
    </linearGradient>
    <linearGradient id="${id}gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3a8"/><stop offset=".5" stop-color="#ffc629"/><stop offset="1" stop-color="#e08a00"/>
    </linearGradient>
    <linearGradient id="${id}drink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffcf5a"/><stop offset="1" stop-color="#ff6a3d"/>
    </linearGradient>
    <radialGradient id="${id}vig" cx=".5" cy=".5" r=".75">
      <stop offset=".55" stop-color="#1a0a40" stop-opacity="0"/><stop offset="1" stop-color="#1a0a40" stop-opacity=".55"/>
    </radialGradient>
  </defs>`;
}

/** A broad tropical leaf pointing along +x, with a midrib and veins. */
function leaf(x, y, len, w, angle, fill, flip = 1) {
  const veins = [0.25, 0.42, 0.59, 0.76]
    .map((t) => {
      const px = len * t;
      const vy = w * 0.62 * Math.sin(Math.PI * t) * flip;
      return `M${px} ${-w * 0.02} Q${px + len * 0.06} ${-vy * 0.5} ${px + len * 0.1} ${-vy}M${px} ${w * 0.02} Q${px + len * 0.06} ${vy * 0.5} ${px + len * 0.1} ${vy}`;
    })
    .join('');
  return `<g transform="translate(${x} ${y}) rotate(${angle})">
    <path d="M0 0C${len * 0.2} ${-w * 1.05} ${len * 0.72} ${-w * 1.1} ${len} 0C${len * 0.72} ${w * 1.1} ${len * 0.2} ${w * 1.05} 0 0Z" fill="${fill}" stroke="#0c4a24" stroke-width="3"/>
    <path d="M0 0Q${len * 0.5} ${-w * 0.08} ${len * 0.97} 0" fill="none" stroke="#b8f5a0" stroke-width="3" opacity=".75"/>
    <path d="${veins}" fill="none" stroke="#b8f5a0" stroke-width="2" opacity=".35"/>
    <path d="M${len * 0.12} ${-w * 0.35}C${len * 0.35} ${-w * 0.85} ${len * 0.62} ${-w * 0.8} ${len * 0.82} ${-w * 0.35}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".18"/>
  </g>`;
}

/** A bunch of leaves fanning out from one point. */
function bush(x, y, spec, id) {
  return spec.map(([len, w, a, g]) => leaf(x, y, len, w, a, `url(#${id}${g})`)).join('');
}

function star(cx, cy, r, fill, rot = 0) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.48 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="#8a3b00" stroke-width="3" stroke-linejoin="round" transform="rotate(${rot} ${cx} ${cy})"/>
    <polygon points="${pts.join(' ')}" fill="#fff" opacity=".22" transform="rotate(${rot} ${cx} ${cy}) translate(${cx * 0.12} ${cy * 0.12}) scale(.88)"/>`;
}

function windowPane(x, y, w, h, id) {
  return `<g>
    <rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="14" fill="#fff4e8" stroke="#b56a52" stroke-width="4"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}sky)"/>
    <circle cx="${x + w * 0.7}" cy="${y + h * 0.62}" r="${Math.min(w, h) * 0.16}" fill="#fff3c0" opacity=".9"/>
    <path d="M${x} ${y + h * 0.78}q${w * 0.2} -${h * 0.12} ${w * 0.42} -${h * 0.02}t${w * 0.58} -${h * 0.06}V${y + h}H${x}Z" fill="#e9709a" opacity=".55"/>
    <path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}" stroke="#fff4e8" stroke-width="10"/>
    <rect x="${x - 26}" y="${y + h + 8}" width="${w + 52}" height="16" rx="6" fill="#fff4e8" stroke="#b56a52" stroke-width="3"/>
  </g>`;
}

function sign(x, y, s, rot, id) {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M40 -60 L150 8 M260 -60 L150 8" stroke="#6b3a1a" stroke-width="4" fill="none"/>
    <circle cx="150" cy="-60" r="7" fill="#d9a441" stroke="${K}" stroke-width="3"/>
    <rect x="0" y="0" width="300" height="170" rx="26" fill="url(#${id}wood)" stroke="${K}" stroke-width="6"/>
    <rect x="14" y="14" width="272" height="142" rx="18" fill="none" stroke="#e7ae6a" stroke-width="3" opacity=".7"/>
    <path d="M22 50h256M22 100h256" stroke="#6b3a1a" stroke-width="2" opacity=".35"/>
    <path d="M120 -2l12 -30 18 20 18 -20 12 30Z" fill="url(#${id}gold)" stroke="#8a4b00" stroke-width="4" stroke-linejoin="round"/>
    <text x="150" y="78" text-anchor="middle" class="sc-sign">TEXAS</text>
    <text x="150" y="140" text-anchor="middle" class="sc-sign">POKER</text>
  </g>`;
}

function cactus(x, y, s, id) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-12 -40c0-30 6-44 12-44s12 14 12 44" fill="none"/>
    <path d="M-22 -8V-92c0-22 44-22 44 0V-8Z" fill="url(#${id}cactus)" stroke="#145a2a" stroke-width="4"/>
    <path d="M-22 -50h-14c-8 0-12-6-12-14v-14c0-10 14-10 14 0v12h12" fill="url(#${id}cactus)" stroke="#145a2a" stroke-width="4" stroke-linejoin="round"/>
    <path d="M22 -38h14c8 0 12-6 12-14v-22c0-10-14-10-14 0v20H22" fill="url(#${id}cactus)" stroke="#145a2a" stroke-width="4" stroke-linejoin="round"/>
    <path d="M0 -104v90" stroke="#1d7a38" stroke-width="3" opacity=".5"/>
    <g fill="#fffbe0">${[[-12, -80], [10, -70], [-8, -40], [12, -30], [-40, -70], [42, -60]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="2"/>`).join('')}</g>
    <path d="M-26 -82h52v6c0 8-6 12-12 12h-6c-6 0-8-4-8-8 0 4-2 8-8 8h-6c-6 0-12-4-12-12Z" fill="#141428"/>
    <path d="M-20 -78h10M8 -78h10" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
    <path d="M-8 -60q8 6 16 0" fill="none" stroke="#145a2a" stroke-width="3" stroke-linecap="round"/>
    <path d="M-34 -10h68l-8 52h-52Z" fill="url(#${id}pot)" stroke="#6e2a14" stroke-width="4" stroke-linejoin="round"/>
    <rect x="-40" y="-16" width="80" height="16" rx="5" fill="#e27a4a" stroke="#6e2a14" stroke-width="4"/>
  </g>`;
}

function lamp(x, y, s, id) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="60" rx="330" ry="300" fill="url(#${id}lamp)"/><ellipse cx="0" cy="130" rx="150" ry="70" fill="#fff3c4" opacity=".35"/>
    <path d="M0 90V600" stroke="#5b3a1f" stroke-width="10"/>
    <path d="M0 90V600" stroke="#c9924a" stroke-width="4"/>
    <path d="M-62 90L-40 -10H40L62 90Z" fill="#fff0b8" stroke="#b8752a" stroke-width="5" stroke-linejoin="round"/>
    <path d="M-40 -10H40L46 20H-46Z" fill="#fff" opacity=".45"/>
    <ellipse cx="0" cy="90" rx="62" ry="10" fill="#ffd166"/>
  </g>`;
}

function sofa(x, y, s, id) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="0" y="0" width="420" height="170" rx="60" fill="url(#${id}sofa)" stroke="#2e1570" stroke-width="5"/>
    <rect x="20" y="120" width="400" height="120" rx="40" fill="#7f55ea" stroke="#2e1570" stroke-width="5"/>
    <rect x="-20" y="80" width="90" height="170" rx="40" fill="#9068ff" stroke="#2e1570" stroke-width="5"/>
    <path d="M40 30q180 -30 360 0" stroke="#fff" stroke-width="8" fill="none" opacity=".18" stroke-linecap="round"/>
    ${star(170, 90, 60, `url(#${id}gold)`, -12)}
    <rect x="250" y="40" width="110" height="100" rx="30" fill="#ff8fb8" stroke="#8a2350" stroke-width="4" transform="rotate(10 305 90)"/>
  </g>`;
}

function sideTable(x, y, s, id, top) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-10 20V150M10 20V150" stroke="#5b2e14" stroke-width="10"/>
    <ellipse cx="0" cy="150" rx="50" ry="12" fill="#5b2e14"/>
    <ellipse cx="0" cy="20" rx="120" ry="30" fill="#7a431d"/>
    <ellipse cx="0" cy="12" rx="120" ry="30" fill="url(#${id}wood)" stroke="${K}" stroke-width="5"/>
    ${top}
  </g>`;
}

function drink(x, y, id) {
  return `<g transform="translate(${x} ${y})">
    <path d="M-24 -90h48l-6 88h-36Z" fill="#fff" opacity=".35" stroke="#fff" stroke-width="3"/>
    <path d="M-21 -60h42l-4 56h-34Z" fill="url(#${id}drink)"/>
    <path d="M6 -110l-12 70" stroke="#ff4f8b" stroke-width="6" stroke-linecap="round"/>
    <circle cx="20" cy="-88" r="16" fill="#ffe36b" stroke="#c98a00" stroke-width="3"/><path d="M20 -104v32M4 -88h32" stroke="#fff" stroke-width="2" opacity=".7"/>
    <path d="M-16 -50v40" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>
  </g>`;
}

function chips(x, y) {
  const one = (dy, c) => `<ellipse cx="0" cy="${dy + 6}" rx="30" ry="10" fill="#0e1a5c"/><ellipse cx="0" cy="${dy}" rx="30" ry="10" fill="${c}" stroke="#0e1a5c" stroke-width="3"/><ellipse cx="0" cy="${dy}" rx="18" ry="6" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="6 6"/>`;
  return `<g transform="translate(${x} ${y})">${[0, -10, -20, -30, -40].map((d, i) => one(d, i % 2 ? '#fff' : '#2f5bea')).join('')}</g>`;
}

function room(id, W, H, wallH, parts) {
  const planks = Array.from({ length: 7 }, (_, i) => {
    const yy = wallH + ((H - wallH) * (i + 1) * (i + 2)) / 56;
    return `<path d="M0 ${yy.toFixed(0)}H${W}" stroke="#6b3419" stroke-width="3" opacity=".35"/>`;
  }).join('');
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    ${defs(id)}
    <rect width="${W}" height="${wallH}" fill="url(#${id}wall)"/>
    <rect width="${W}" height="${wallH}" fill="url(#${id}wallShade)"/>
    <path d="${Array.from({ length: Math.ceil(W / 80) }, (_, i) => `M${i * 80 + 40} 0V${wallH}`).join('')}" stroke="#fff" stroke-width="2" opacity=".06"/>
    ${parts.back}
    <rect y="${wallH}" width="${W}" height="${H - wallH}" fill="url(#${id}floor)"/>
    ${planks}
    <rect y="${wallH - 22}" width="${W}" height="26" fill="#7a3e22"/><rect y="${wallH - 22}" width="${W}" height="6" fill="#c9804a"/>
    ${parts.front}
    <rect width="${W}" height="${H}" fill="url(#${id}vig)"/>
  </svg>`;
}

/** `tag` keeps gradient ids unique when the scene is on the page twice. */
export function sceneHtml(tag = 'tb') {
  const W = `${tag}w`;
  const T = `${tag}t`;
  const wide = room(W, 1600, 900, 560, {
    back: `
      <circle cx="700" cy="150" r="620" fill="url(#${W}sun)"/>
      ${windowPane(560, 40, 380, 230, W)}
      ${sign(95, 175, 0.8, -4, W)}
      ${bush(-20, 440, [[210, 54, -84, 'leafB'], [230, 58, -62, 'leafA'], [190, 50, -34, 'leafB'], [150, 44, -10, 'leafA']], W)}
      <rect x="-10" y="400" width="90" height="120" rx="10" fill="url(#${W}pot)" stroke="#6e2a14" stroke-width="4"/>
      <g transform="translate(410 330)"><rect x="-70" y="0" width="140" height="16" rx="6" fill="#8a4a22" stroke="${K}" stroke-width="4"/></g>
      ${cactus(410, 314, 0.95, W)}
      ${lamp(1150, 70, 1, W)}
      ${sofa(1290, 330, 0.9, W)}
    `,
    front: `
      ${sideTable(1440, 600, 1, W, `${chips(-40, 0)}${star(40, -18, 34, `url(#${W}gold)`, 12)}`)}
      ${sideTable(250, 800, 1, W, `${drink(-30, 10, W)}${star(55, -8, 30, '#ffd23f', -10)}`)}
      ${bush(-60, -40, [[300, 70, 72, 'leafA'], [270, 64, 92, 'leafB'], [230, 56, 52, 'leafB']], W)}
      ${bush(1660, -30, [[360, 86, 150, 'leafA'], [320, 76, 122, 'leafB'], [280, 66, 172, 'leafB']], W)}
      ${bush(-70, 970, [[300, 80, -48, 'leafA'], [280, 72, -18, 'leafB'], [260, 66, -76, 'leafB']], W)}
      ${bush(1660, 960, [[380, 92, -140, 'leafA'], [330, 80, -168, 'leafB'], [300, 72, -112, 'leafB'], [260, 64, -90, 'leafA']], W)}
    `,
  });
  const tall = room(T, 900, 1600, 900, {
    back: `
      <circle cx="260" cy="200" r="620" fill="url(#${T}sun)"/>
      ${windowPane(260, 150, 380, 300, T)}
      ${sign(120, 140, 0.58, -4, T)}
      ${lamp(760, 250, 1.05, T)}
    `,
    front: `
      ${bush(-60, -40, [[340, 84, 70, 'leafA'], [300, 74, 88, 'leafB'], [240, 60, 48, 'leafB']], T)}
      ${bush(960, -40, [[400, 96, 145, 'leafA'], [360, 84, 118, 'leafB'], [300, 70, 170, 'leafB']], T)}
      ${bush(-60, 1660, [[380, 92, -38, 'leafA'], [340, 80, -64, 'leafB'], [300, 72, -12, 'leafB']], T)}
      ${bush(960, 1660, [[380, 92, -142, 'leafA'], [340, 80, -116, 'leafB'], [300, 72, -168, 'leafB']], T)}
    `,
  });
  return `<div class="scene" aria-hidden="true"><div class="scene-wide">${wide}</div><div class="scene-tall">${tall}</div></div>`;
}
