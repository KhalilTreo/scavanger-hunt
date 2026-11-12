#!/usr/bin/env node
// Builds the riddle into ./dist
//   node build.js          build the site
//   Levels live in src/levels/*.html (sorted by filename = level order).
//   Each level starts with a header comment holding its title and answer(s);
//   that header is stripped from the output, so answers never reach players.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'riddle.config.json'), 'utf8'));

// --- answers -> URLs (must match game.js exactly) -------------------------
const normalize = (a) => a.toLowerCase().replace(/[^a-z0-9]/g, '');

function slug(answer) {
  const norm = normalize(answer);
  if (!config.hashUrls) return norm; // classic mode: page name == answer
  return crypto.createHash('sha256').update(config.salt + norm).digest('hex').slice(0, 16);
}

// --- parsing -----------------------------------------------------------------
function parsePage(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^\s*<!--([\s\S]*?)-->\s*/);
  if (!m) throw new Error(`${path.basename(file)}: missing header comment`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  // "answer: shadow | shadows" -> multiple accepted answers
  // Aliases that normalize to the same URL ("veni vidi" / "venividi") are merged.
  const byNorm = new Map();
  for (const a of (meta.answer || '').split('|').map((s) => s.trim()).filter(Boolean)) {
    if (!byNorm.has(normalize(a))) byNorm.set(normalize(a), a);
  }
  meta.answers = [...byNorm.values()];
  return { meta, body: raw.slice(m[0].length) };
}

const fill = (tpl, vars) => tpl.replace(/{{(\w+)}}/g, (_, k) => (k in vars ? vars[k] : ''));

const FORM = `<form id="answer-form" autocomplete="off">
    <input name="answer" placeholder="Your answer" aria-label="Answer" autofocus>
    <button type="submit">Submit</button>
    <p id="feedback" role="status"></p>
  </form>`;

// --- build -------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'l'), { recursive: true });

const template = fs.readFileSync(path.join(SRC, 'template.html'), 'utf8');
const levelDir = path.join(SRC, 'levels');
const files = fs.readdirSync(levelDir).filter((f) => f.endsWith('.html')).sort();
const levels = files.map((f) => ({ file: f, ...parsePage(path.join(levelDir, f)) }));

levels.forEach((lv) => {
  if (!lv.meta.answers.length) throw new Error(`${lv.file}: no answer in header`);
});

const common = {
  gameTitle: config.title,
  salt: config.salt,
  hash: config.hashUrls ? '1' : '0',
};

const seen = new Map();
function writePage(keys, html, label) {
  for (const key of keys) {
    const name = slug(key) + '.html';
    if (seen.has(name)) throw new Error(`URL clash: ${label} and ${seen.get(name)} share "${key}"`);
    seen.set(name, label);
    fs.writeFileSync(path.join(OUT, 'l', name), html);
  }
  return slug(keys[0]) + '.html';
}

console.log('\nLevel map (for you, the author — never published):');
let prevKeys = [config.startKey];
levels.forEach((lv, i) => {
  const html = fill(template, {
    ...common,
    number: String(i + 1),
    title: lv.meta.title || `Level ${i + 1}`,
    content: lv.body,
    form: FORM,
  });
  const url = writePage(prevKeys, html, lv.file);
  console.log(`  ${String(i + 1).padStart(3)}  ${lv.file.padEnd(20)} l/${url}   answer: ${lv.meta.answers.join(' | ')}`);
  prevKeys = lv.meta.answers;
});

// Win page sits behind the last level's answer
const win = parsePage(path.join(SRC, 'win.html'));
const winUrl = writePage(
  prevKeys,
  fill(template, { ...common, number: 'END', title: win.meta.title || 'The End', content: win.body, form: '' }),
  'win.html'
);
console.log(`  END  ${'win.html'.padEnd(20)} l/${winUrl}\n`);

// Static files
const startUrl = 'l/' + slug(config.startKey) + '.html';
fs.writeFileSync(
  path.join(OUT, 'index.html'),
  fill(fs.readFileSync(path.join(SRC, 'index.html'), 'utf8'), { ...common, startUrl })
);
for (const f of ['style.css', 'game.js', '404.html', 'robots.txt', 'suits.js', 'suits.css', "audio.js"]) {
  fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
}
console.log(`Built ${levels.length} levels into dist/`);

// Copy images, audio, etc.
const assets = path.join(SRC, 'assets');
if (fs.existsSync(assets)) {
  fs.cpSync(assets, path.join(OUT, 'assets'), { recursive: true });
}
console.log('Copied assets');