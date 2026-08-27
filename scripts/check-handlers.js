// Static check: every function named in an inline onclick/onsubmit/onchange attribute —
// including the ones generated inside JS template literals — must actually be defined.
// This is what would have caught updateQty() being referenced but never implemented.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// admin.html loads products.js + admin.js; every other page loads products.js + app.js.
const PAGE_SCRIPTS = { 'admin.html': ['assets/admin.js'] };
const DEFAULT_SCRIPTS = ['assets/app.js'];

const BROWSER_GLOBALS = new Set([
  'alert', 'confirm', 'prompt', 'event', 'console', 'document', 'window', 'location',
  'Number', 'String', 'Boolean', 'Math', 'JSON', 'Array', 'Object', 'Date', 'parseInt',
  'parseFloat', 'encodeURIComponent', 'decodeURIComponent', 'setTimeout', 'fetch', 'Cashfree'
]);

function definedNames(source) {
  const names = new Set();
  const patterns = [
    /\bfunction\s+([A-Za-z_$][\w$]*)/g,
    /\bwindow\.([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\()/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\s*=>/g
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source))) names.add(m[1]);
  }
  return names;
}

// Collect `name(` from every inline handler attribute in a chunk of text.
function referencedHandlers(text) {
  const refs = new Map(); // name -> sample context
  const attrRe = /\bon(?:click|submit|change|input|load|error)\s*=\s*(["'])([\s\S]*?)\1/g;
  let m;
  while ((m = attrRe.exec(text))) {
    const body = m[2];
    const callRe = /(?:^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    let c;
    while ((c = callRe.exec(body))) {
      const name = c[1];
      if (!refs.has(name)) refs.set(name, body.slice(0, 70));
    }
  }
  return refs;
}

const jsCache = new Map();
function readJs(rel) {
  if (!jsCache.has(rel)) jsCache.set(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  return jsCache.get(rel);
}

let failures = 0;
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

for (const page of pages) {
  const scripts = PAGE_SCRIPTS[page] || DEFAULT_SCRIPTS;
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');

  const scope = new Set(BROWSER_GLOBALS);
  for (const s of scripts) definedNames(readJs(s)).forEach(n => scope.add(n));
  // Inline <script> blocks on the page define handlers too.
  definedNames(html).forEach(n => scope.add(n));

  // Handlers written directly in the page, plus those emitted from the page's own scripts.
  const sources = [['markup', html], ...scripts.map(s => [s, readJs(s)])];

  for (const [origin, text] of sources) {
    for (const [name, context] of referencedHandlers(text)) {
      if (scope.has(name)) continue;
      console.log(`FAIL ${page} (via ${origin}): ${name}() is called but never defined`);
      console.log(`     ${context.replace(/\s+/g, ' ')}`);
      failures++;
    }
  }
}

if (failures) {
  console.log(`\n${failures} undefined handler reference(s).`);
  process.exit(1);
}
console.log(`OK — all inline handlers across ${pages.length} pages resolve to defined functions.`);
