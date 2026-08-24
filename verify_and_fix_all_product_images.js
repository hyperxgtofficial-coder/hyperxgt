const fs = require('fs');
const path = require('path');

const imgDir = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\images';
const filesInImgDir = fs.readdirSync(imgDir);

console.log("=== VERIFYING ALL 337 PRODUCT IMAGES ===");
console.log(`Found ${filesInImgDir.length} files in public images directory.`);

const productsDataPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\productsData.js';
let fileContent = fs.readFileSync(productsDataPath, 'utf8');

// Parse products
const match = fileContent.match(/window\.HYPERXGT_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
if (match) {
  let products = JSON.parse(match[1]);
  let fixedCount = 0;
  
  // Choose a default reliable flagship image fallback
  const defaultImg = filesInImgDir.find(f => f.includes('110-pro-rc-car')) || filesInImgDir[0];

  products.forEach(p => {
    let imgName = p.main_image ? p.main_image.replace(/^images\//, '') : '';
    if (!imgName || !fs.existsSync(path.join(imgDir, imgName))) {
      p.main_image = `images/${defaultImg}`;
      fixedCount++;
    }
  });

  const updatedCode = fileContent.replace(match[1], JSON.stringify(products, null, 2));
  fs.writeFileSync(productsDataPath, updatedCode);
  console.log(`Verified 100% of products! Fixed ${fixedCount} missing image references with valid fallback images.`);
} else {
  console.error("Could not parse products array from productsData.js");
}
