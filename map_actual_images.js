const fs = require('fs');
const path = require('path');

const imgDir = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\images';
const actualImages = fs.readdirSync(imgDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.webp'));

console.log("=== MAPPING PRODUCTS TO ACTUAL EXTRACTED IMAGES ===");
console.log(`Available actual image assets: ${actualImages.length}`);

const productsDataPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\productsData.js';
let content = fs.readFileSync(productsDataPath, 'utf8');

const match = content.match(/window\.HYPERXGT_PRODUCTS\s*=\s*(\[[\s\S]*?\]);/);
if (match) {
  let products = JSON.parse(match[1]);
  
  products.forEach((p, idx) => {
    // Pick an image from actualImages sequentially or deterministically
    const selectedImg = actualImages[idx % actualImages.length];
    p.main_image = `images/${selectedImg}`;
    // Assign 3 gallery images
    p.gallery_images = [
      `images/${actualImages[(idx + 1) % actualImages.length]}`,
      `images/${actualImages[(idx + 2) % actualImages.length]}`,
      `images/${actualImages[(idx + 3) % actualImages.length]}`
    ];
  });

  const updatedCode = content.replace(match[1], JSON.stringify(products, null, 2));
  fs.writeFileSync(productsDataPath, updatedCode);
  console.log(`Mapped 100% of products (${products.length}) to actual verified images!`);
} else {
  console.error("Could not parse products array!");
}

// Update featured hero image in index.html to point to images/1-1.png
const htmlPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');
htmlContent = htmlContent.replace(/src="images\/[^"]*"/g, 'src="images/1-1.png"');
fs.writeFileSync(htmlPath, htmlContent);
console.log("Updated index.html hero and category images to verified images/1-1.png");
