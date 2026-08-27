const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

let missing = [];
let caseMismatch = [];

function checkFile(relPath, source) {
  if (relPath.startsWith('http') || relPath.startsWith('//')) return;
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    missing.push({ ref: relPath, source });
    return;
  }
  const dir = path.dirname(fullPath);
  const base = path.basename(fullPath);
  const actualFiles = fs.readdirSync(dir);
  if (!actualFiles.includes(base)) {
    const found = actualFiles.find(f => f.toLowerCase() === base.toLowerCase());
    caseMismatch.push({ ref: relPath, actual: found, source });
  }
}

// 1. Check assets/products.js images
const productsPath = path.join(__dirname, '..', 'assets', 'products.js');
if (fs.existsSync(productsPath)) {
  global.window = {};
  require(productsPath);
  const products = global.window.HX_PRODUCTS || [];
  console.log('Total products in assets/products.js:', products.length);
  products.forEach((p, idx) => {
    if (p.image) checkFile(p.image, `products[${idx}].image (${p.sku})`);
    if (Array.isArray(p.images)) {
      p.images.forEach((img, i) => checkFile(img, `products[${idx}].images[${i}] (${p.sku})`));
    }
  });
}

// 2. Check HTML img src & script src & link href
htmlFiles.forEach(hf => {
  const content = fs.readFileSync(path.join(ROOT, hf), 'utf8');
  const matches = content.matchAll(/(?:src|href)=["']([^"']+)["']/g);
  for (const m of matches) {
    const url = m[1];
    if (url.startsWith('http') || url.startsWith('//') || url.startsWith('data:') || url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('tel:')) continue;
    let clean = url.split('?')[0].split('#')[0];
    if (!clean) continue;
    if (clean.startsWith('/')) clean = clean.slice(1);
    checkFile(clean, hf);
  }
});

console.log('\n--- MISSING FILES ---');
console.log(missing.length ? missing : 'None!');

console.log('\n--- CASE MISMATCHES ---');
console.log(caseMismatch.length ? caseMismatch : 'None!');
