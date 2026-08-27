// Parses every first-party JS file. The API handlers are only require()d when a request
// hits them, so a syntax error in one would otherwise stay hidden until it 500s in production.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = [
  'server.js',
  'assets/app.js',
  'assets/admin.js',
  'assets/products.js',
  ...fs.readdirSync(path.join(ROOT, 'api')).filter(f => f.endsWith('.js')).map(f => 'api/' + f),
  ...fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).map(f => 'scripts/' + f)
];

let failed = 0;
for (const rel of files) {
  try {
    execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: 'pipe' });
    console.log('ok   ' + rel);
  } catch (err) {
    console.log('FAIL ' + rel);
    console.log(String(err.stderr || err.message).trim());
    failed++;
  }
}

// Every API route must export a callable handler, or the route 500s on first use.
for (const rel of files.filter(f => f.startsWith('api/'))) {
  const handler = require(path.join(ROOT, rel));
  if (typeof handler !== 'function') {
    console.log(`FAIL ${rel} does not export a handler function`);
    failed++;
  }
}

if (failed) {
  console.log(`\n${failed} file(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${files.length} JS files parse and every API route exports a handler.`);
