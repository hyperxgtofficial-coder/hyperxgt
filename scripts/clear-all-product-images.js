const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// 1. Update data/products.json
const jsonPath = path.join(ROOT, 'data', 'products.json');
if (fs.existsSync(jsonPath)) {
  const products = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Clearing images for ${products.length} products in data/products.json...`);
  products.forEach(p => {
    p.image = "";
    p.images = [];
    p.no_image = true;
  });
  fs.writeFileSync(jsonPath, JSON.stringify(products, null, 2), 'utf8');
  console.log("Updated data/products.json ✓");
}

// 2. Update assets/products.js
const jsPath = path.join(ROOT, 'assets', 'products.js');
if (fs.existsSync(jsPath)) {
  // Load using node require simulation
  global.window = {};
  require(jsPath);
  const products = global.window.HX_PRODUCTS || [];
  console.log(`Clearing images for ${products.length} products in assets/products.js...`);
  products.forEach(p => {
    p.image = "";
    p.images = [];
    p.no_image = true;
  });
  const jsContent = `window.HX_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
  fs.writeFileSync(jsPath, jsContent, 'utf8');
  console.log("Updated assets/products.js ✓");
}
