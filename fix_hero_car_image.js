const fs = require('fs');
const path = require('path');

const imgDir = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\images';
const files = fs.readdirSync(imgDir);

console.log("=== FINDING NON-LOGO RC CAR IMAGES ===");
const carImages = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));

console.log(`Total image files: ${carImages.length}`);
console.log("Sample files:", carImages.slice(0, 20));

// Let's find an actual car image file (e.g. 1-10.png, 1-15.png, 1-20.png, etc.)
// And update index.html hero image to point to images/1-10.png
const htmlPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace hero card image with images/1-10.png
htmlContent = htmlContent.replace(/<div class="hero-img-wrap">\s*<img src="[^"]*"/g, '<div class="hero-img-wrap">\n            <img src="images/1-10.png"');

fs.writeFileSync(htmlPath, htmlContent);
console.log("Updated index.html hero card image to images/1-10.png");
