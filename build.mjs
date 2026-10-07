// Tekent de SVG's van de profielpagina in assets/. Draaien: node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert';

const DARK = '#111317', BLUE = '#2457f5', LIGHT = '#88aaff', PAPER = '#f3f5fa', COPY = '#aab1bd', RULE = '#2b3038';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
const TAU = Math.PI * 2;
const f = n => n.toFixed(1).replace(/\.0$/, '');
const out = new URL('./assets/', import.meta.url);
mkdirSync(out, { recursive: true });
const save = (name, svg) => writeFileSync(new URL(name, out), svg);

// --- Lint -------------------------------------------------------------
// Zelfde vorm als het signal-lint op timvdploeg.com, maar als lijnen van stippen
// in plaats van losse punten op een canvas. Eén lus duurt DUR seconden en sluit naadloos.
const W = 1200, H = 420, CX = 968, CY = 252, SCALE = 104;
const ROWS = 14, COLS = 60, FRAMES = 16, DUR = 18, PULSES = 4;

function point(u, band, p) {
  const T = p * TAU;
  const rotation = -.24 + Math.sin(T) * .16, cos = Math.cos(rotation), sin = Math.sin(rotation);
  const twist = u * 1.5 + T;
  const radius = 1.13 + band * Math.cos(twist);
  const x = radius * Math.cos(u);
  const y = radius * Math.sin(u) * .73 + band * Math.sin(twist) + Math.sin(u * 3 + T * 2) * .12;
  // De site gebruikt hier u * 2; met 2.5 loopt de diepte na één rondje netjes door (möbiusband).
  const z = Math.sin(u) * .75 + band * Math.cos(u * 2.5 + T * 2);
  const perspective = 3.5 / (3.5 + z);
  return [CX + (x * cos - y * sin) * SCALE * perspective * 1.65, CY + (x * sin + y * cos) * SCALE * perspective];
}

// Na één rondje ligt een rij op de plek van zijn spiegelbeeld, dus elke lijn loopt twee rondjes en sluit dan.
function rowPath(row, p) {
  const band = (row / (ROWS - 1) - .5) * .57;
  let d = '';
  for (let k = 0; k < COLS * 2; k++) {
    const [x, y] = point(k * TAU / COLS, band, p);
    d += `${k ? 'L' : 'M'}${f(x)} ${f(y)}`;
  }
  return d + 'Z';
}

// Controle: de lus sluit in de tijd en de band sluit in de ruimte.
for (const u of [0, 1, 2.5]) {
  assert.deepEqual(point(u, .2, 0).map(f), point(u, .2, 1).map(f));
  assert.deepEqual(point(u, .2, .3).map(f), point(u + TAU, -.2, .3).map(f));
}

const rows = Array.from({ length: ROWS / 2 }, (_, row) => {
  const edge = row < 2;
  const style = `stroke:var(--c,${edge ? '#aac6ff' : '#4f7fff'});stroke-width:calc(${edge ? 2.9 : 2.3}px*var(--k,1))`;
  return { style, opacity: edge ? .95 : (.42 + row * .07).toFixed(2), frames: Array.from({ length: FRAMES + 1 }, (_, i) => rowPath(row, i / FRAMES)) };
});
const moving = rows.map(r => `<path style="${r.style}" opacity="${r.opacity}" d="${r.frames[0]}"><animate attributeName="d" dur="${DUR}s" repeatCount="indefinite" values="${r.frames.join(';')}"/></path>`).join('');
const still = rows.map(r => `<path style="${r.style}" opacity="${r.opacity}" d="${r.frames[0]}"/>`).join('');
// De lichtpuls loopt PULSES keer per lus over het midden van de band.
const pulseSteps = PULSES * 16;
const pulse = `<animateTransform attributeName="transform" type="translate" dur="${DUR}s" repeatCount="indefinite" values="${Array.from({ length: pulseSteps + 1 }, (_, i) => point(i / pulseSteps * PULSES * TAU, 0, i / pulseSteps).map(f).join(' ')).join(';')}"/>`;

// --- Naam uit tekens ----------------------------------------------------
const GLYPHS = {
  T: '11111 00100 00100 00100 00100 00100 00100', I: '111 010 010 010 010 010 111',
  M: '10001 11011 10101 10101 10001 10001 10001', V: '10001 10001 10001 10001 10001 01010 00100',
  A: '01110 10001 10001 11111 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  D: '11110 10001 10001 10001 10001 10001 11110', E: '11111 10000 10000 11110 10000 10000 11111',
  R: '11110 10001 10001 11110 10100 10010 10001', P: '11110 10001 10001 11110 10000 10000 10000',
  L: '10000 10000 10000 10000 10000 10000 11111', O: '01110 10001 10001 10001 10001 10001 01110',
  G: '01110 10001 10000 10111 10001 10001 01110',
};
const CELL_X = 7, CELL_Y = 9, NAME_X = 56, NAME_Y = 44;
let column = 0, cells = [];
for (const letter of 'TIM VAN DER PLOEG') {
  if (letter === ' ') { column += 3; continue; }
  const lines = GLYPHS[letter].split(' ');
  lines.forEach((line, y) => [...line].forEach((bit, x) => { if (bit === '1') cells.push({ letter, x: column + x, y }); }));
  column += lines[0].length + 1;
}
cells.sort((a, b) => a.x - b.x || a.y - b.y);
const TYPE = 2.2; // seconden waarin de naam zich opbouwt
// Elk teken staat op een eigen blokje, zodat de letters ook klein leesbaar blijven.
const name = cells.map((c, i) => {
  const x = NAME_X + c.x * CELL_X, y = NAME_Y + c.y * CELL_Y;
  return `<g style="animation-delay:${(.3 + i / cells.length * TYPE).toFixed(2)}s"><rect x="${x + .5}" y="${y + .5}" width="${CELL_X - 1}" height="${CELL_Y - 1}" rx="1"/><text x="${x + 3.5}" y="${y + 7.6}">${c.letter}</text></g>`;
}).join('');
const dotX = NAME_X + column * CELL_X + 3.5, dotY = NAME_Y + 6 * CELL_Y + 4.5;

// Controle: het lint blijft de hele lus uit de buurt van de naam en de slogan. Rechts mag het iets uit beeld lopen, zoals op de site.
const reach = { left: Infinity, right: 0, nearName: Infinity };
for (let i = 0; i < 96; i++) for (let k = 0; k < 240; k++) for (const band of [-.285, .285]) {
  const [x, y] = point(k * TAU / 120, band, i / 96);
  reach.left = Math.min(reach.left, x); reach.right = Math.max(reach.right, x);
  if (y < NAME_Y + 7 * CELL_Y + 14) reach.nearName = Math.min(reach.nearName, x - dotX);
}
assert(reach.left > 640 && reach.right < W + 40 && reach.nearName > 30, `lint te dicht bij tekst of rand: ${JSON.stringify(reach)}`);

// De onderkant van het lint ligt verder weg en is daarom doffer.
const depth = `<rect width="${W}" height="${H}" fill="url(#depth)" stroke="none"/>`;
save('banner.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t">
<title id="t">Tim van der Ploeg. I'd rather automate it once than click ten times.</title>
<style>
.name g{opacity:0;animation:in .15s forwards}
.name rect{fill:${PAPER};opacity:.3}
.name text{font:700 9px ${MONO};fill:${PAPER};text-anchor:middle}
.dot{opacity:0;transform-box:fill-box;transform-origin:center;animation:in .3s ${TYPE + .4}s forwards,beat ${DUR / PULSES}s ${TYPE + 1}s ease-in-out infinite}
.late{opacity:0;transform:translateY(10px);animation:rise .9s ${TYPE + .5}s ease-out forwards}
.prompt{animation-delay:${TYPE + 1.1}s}
.cursor{animation:blink 1.1s steps(1) infinite}
.slogan{font:600 36px ${SANS};fill:${PAPER};letter-spacing:-.8px}
.still{display:none}
@keyframes in{to{opacity:1}}
@keyframes rise{to{opacity:1;transform:none}}
@keyframes blink{50%{opacity:0}}
@keyframes beat{0%,100%{transform:scale(1)}8%{transform:scale(1.45)}}
@media (prefers-reduced-motion:reduce){.motion{display:none}.still{display:inline}.name g,.dot,.late{opacity:1;transform:none;animation:none}.cursor{animation:none}}
</style>
<defs>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<g id="ribbon" fill="none" stroke-linecap="round" stroke-dasharray="0 7">${moving}</g>
<radialGradient id="soft"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="glow"><stop offset="0" stop-color="${BLUE}" stop-opacity=".34"/><stop offset="1" stop-color="${BLUE}" stop-opacity="0"/></radialGradient>
<linearGradient id="depth" x1="0" y1="0" x2="0" y2="1"><stop offset=".3" stop-color="${DARK}" stop-opacity="0"/><stop offset="1" stop-color="${DARK}" stop-opacity=".62"/></linearGradient>
<mask id="pulse" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><circle r="135" fill="url(#soft)">${pulse}</circle></mask>
</defs>
<rect width="${W}" height="${H}" rx="14" fill="${DARK}"/>
<g clip-path="url(#frame)">
<g class="motion"><use href="#ribbon"/>${depth}<circle r="160" fill="url(#glow)">${pulse}</circle><g mask="url(#pulse)"><use href="#ribbon" style="--k:1.75;--c:#e6eeff"/></g></g>
<g class="still" fill="none" stroke-linecap="round" stroke-dasharray="0 7">${still}${depth}</g>
</g>
<g class="name">${name}</g>
<circle class="dot" cx="${dotX}" cy="${dotY}" r="5" fill="${BLUE}"/>
<g class="late slogan"><text x="${NAME_X}" y="246">I'd rather automate it once</text><text x="${NAME_X}" y="292">than click <tspan fill="${LIGHT}">ten times.</tspan></text></g>
<g class="late prompt"><text x="${NAME_X}" y="372" textLength="126" style="font:500 15px ${MONO}" fill="${COPY}">tim@github ~ $</text><rect class="cursor" x="${NAME_X + 136}" y="358" width="9" height="18" fill="${LIGHT}"/></g>
</svg>
`);

// --- Toolkaarten en knoppen ---------------------------------------------
const TOOLS = [
  ['caowijs', 'Caowijs', 'A Dutch labour agreement (CAO) knowledge base for Claude. Answers cite their source.', 'TypeScript · MCP · Claude'],
  ['weekstaat', 'Weekstaat', 'Hours, orders and bank data side by side. Differences explained per employee.', 'Python · PDF · Excel'],
  ['scrollback', 'Scrollback', 'Saved social posts become a knowledge base for your own projects.', 'Python · Claude Code · Whisper'],
  ['postwright', 'Postwright', 'Social posts from on-brand templates, with a brand check before scheduling.', 'TypeScript · Node · Claude'],
];
const arrow = (x, y, color) => `<path d="M${x} ${y + 11}l11-11m-8 0h8v8" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
function wrap(text, max) {
  const lines = [''];
  for (const word of text.split(' ')) {
    if ((lines.at(-1) + ' ' + word).trim().length > max) lines.push('');
    lines[lines.length - 1] = (lines.at(-1) + ' ' + word).trim();
  }
  return lines;
}
for (const [file, title, text, stack] of TOOLS) {
  const lines = wrap(text, 46);
  assert(lines.length <= 2, `${title}: beschrijving past niet op twee regels`);
  save(`${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 176" role="img" aria-labelledby="t">
<title id="t">${title}: ${text}</title>
<rect x=".5" y=".5" width="439" height="175" rx="12" fill="${DARK}" stroke="${RULE}"/>
<text x="30" y="56" style="font:600 28px ${SANS};letter-spacing:-.6px" fill="${PAPER}">${title}<tspan fill="${BLUE}">.</tspan></text>
${arrow(397, 34, LIGHT)}
${lines.map((line, i) => `<text x="30" y="${90 + i * 23}" style="font:400 15.5px ${SANS}" fill="${COPY}">${line}</text>`).join('')}
<text x="30" y="150" style="font:500 12.5px ${MONO}" fill="${LIGHT}">${stack}</text>
</svg>
`);
}

for (const [file, label, filled] of [['link-site', 'timvdploeg.com', true], ['link-linkedin', 'LinkedIn', false]]) {
  const width = Math.round(label.length * 9.2) + 78;
  save(`${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 44" role="img" aria-label="${label}">
<rect x=".5" y=".5" width="${width - 1}" height="43" rx="6" fill="${filled ? BLUE : DARK}" stroke="${filled ? BLUE : RULE}"/>
<text x="22" y="27.5" style="font:600 15px ${SANS}" fill="#fff">${label}</text>
${arrow(width - 34, 16, '#fff')}
</svg>
`);
}
// --- Terminal: whoami -------------------------------------------------------
// 898 breed: twee kaarten van 440 plus de tussenruimte, zodat de tekst even groot uitkomt als op de kaarten.
// Opdrachten worden teken voor teken getypt; de uitvoer verschijnt erna. Uitvoer is [sleutel, waarde].
const SESSION = [
  ['whoami', [['', 'Tim van der Ploeg, business graduate. Curious about how things can be done smarter.']]],
  ['cat about.txt', [['', 'I connect business, data and digitalisation:'], ['', 'from a complicated problem to something that works.']]],
  ['cat facts.yml', [['work:', 'Cijfers &amp; Co · part-time since March 2025'], ['education:', 'Business Administration · Rotterdam Business School'], ['location:', 'Hellevoetsluis, the Netherlands']]],
];
const LINE = 24, KEY = .06;
let lineY = 76, clock = .5, session = '';
const promptAt = (y, delay) => `<text class="o" x="30" y="${y}" fill="${LIGHT}" style="animation-delay:${delay.toFixed(2)}s">$</text>`;
for (const [command, output] of SESSION) {
  session += promptAt(lineY, clock - .2);
  session += `<text x="48" y="${lineY}" fill="${PAPER}" xml:space="preserve">${[...command].map((char, i) => `<tspan class="k" style="animation-delay:${(clock + i * KEY).toFixed(2)}s">${char}</tspan>`).join('')}</text>`;
  clock += command.length * KEY + .3;
  for (const [key, value] of output) {
    lineY += LINE;
    session += `<text class="o" y="${lineY}" style="animation-delay:${clock.toFixed(2)}s">${key ? `<tspan x="30" fill="${LIGHT}">${key}</tspan><tspan x="138" fill="${PAPER}">${value}</tspan>` : `<tspan x="30" fill="${COPY}">${value}</tspan>`}</text>`;
  }
  clock += .6;
  lineY += LINE + 12;
}
save('whoami.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 898 ${lineY + 24}" role="img" aria-labelledby="t">
<title id="t">Terminal: ${SESSION.map(([, output]) => output.map(pair => pair.join(' ').trim()).join(' ')).join(' ').replace(/&amp;/g, 'and')}</title>
<style>
text{font:500 15px ${MONO}}
.k,.o,.cursor{opacity:0;animation:in .01s forwards}
.o{animation-duration:.25s}
.cursor{animation:in .01s ${clock.toFixed(2)}s forwards,blink 1.1s ${clock.toFixed(2)}s steps(1) infinite}
@keyframes in{to{opacity:1}}
@keyframes blink{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.k,.o,.cursor{opacity:1;animation:none}}
</style>
<rect x=".5" y=".5" width="897" height="${lineY + 23}" rx="12" fill="${DARK}" stroke="${RULE}"/>
<path d="M0 40.5h898" stroke="${RULE}"/>
<circle cx="26" cy="20.5" r="5" fill="#3a404b"/><circle cx="44" cy="20.5" r="5" fill="#3a404b"/><circle cx="62" cy="20.5" r="5" fill="#3a404b"/>
<text x="449" y="25" text-anchor="middle" style="font-size:12.5px" fill="${COPY}">tim@github: ~</text>
${session}${promptAt(lineY, clock - .2)}<rect class="cursor" x="48" y="${lineY - 14}" width="9" height="18" fill="${LIGHT}"/>
</svg>
`);

// --- Paneel: nu in ontwikkeling ---------------------------------------------
const NOW = [
  ['MijnTarieftool.nl', 'From employment terms to a substantiated rate.'],
  ['Balspecs', 'Repeat less. Understand more.'],
  ['SnelStart', 'Handle the routine. Check the doubtful cases.'],
];
save('now.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 898 164" role="img" aria-labelledby="t">
<title id="t">In development: ${NOW.map(([name, text]) => `${name}, ${text}`).join(' ')}</title>
<style>.live{animation:live 2.4s ease-in-out infinite}@keyframes live{50%{opacity:.2}}@media (prefers-reduced-motion:reduce){.live{animation:none}}</style>
<rect x=".5" y=".5" width="897" height="163" rx="12" fill="${DARK}" stroke="${RULE}"/>
<path d="M299.5 28v108M598.5 28v108" stroke="${RULE}"/>
${NOW.map(([name, text], i) => {
  const x = 30 + i * 299;
  return `<circle class="live" style="animation-delay:${i * .5}s" cx="${x + 4}" cy="40" r="4" fill="${LIGHT}"/>
<text x="${x + 17}" y="44.5" style="font:500 12.5px ${MONO}" fill="${LIGHT}">In development</text>
<text x="${x}" y="86" style="font:600 24px ${SANS};letter-spacing:-.5px" fill="${PAPER}">${name}</text>
${wrap(text, 32).map((line, n) => `<text x="${x}" y="${114 + n * 22}" style="font:400 15px ${SANS}" fill="${COPY}">${line}</text>`).join('')}`;
}).join('')}
</svg>
`);

console.log(`assets/ geschreven: banner ${cells.length} tekens, ${rows.length} lijnen x ${FRAMES} beelden`);
