const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_catalogue\\images';
const destDir = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\images';

console.log("=== COPYING CATALOGUE IMAGES TO WEBSITE PUBLIC DIRECTORY ===");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  let count = 0;
  files.forEach(file => {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(destDir, file);
    fs.copyFileSync(srcFile, destFile);
    count++;
  });
  console.log(`Successfully copied ${count} images to website images directory.`);
} else {
  console.error("Source images directory not found:", srcDir);
}

// Now update productsData.js to replace absolute paths with relative 'images/...' paths
const productsDataPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\productsData.js';
if (fs.existsSync(productsDataPath)) {
  let content = fs.readFileSync(productsDataPath, 'utf8');
  // Replace absolute path occurrences
  content = content.replace(/C:\/Users\/ICONIC DIGITALS\/\.gemini\/antigravity\/scratch\/hyperxgt_catalogue\/images\//g, 'images/');
  content = content.replace(/C:\\Users\\ICONIC DIGITALS\\\.gemini\\antigravity\\scratch\\hyperxgt_catalogue\\images\\/g, 'images/');
  fs.writeFileSync(productsDataPath, content);
  console.log("Updated productsData.js image paths to relative 'images/...'");
}

// Now update index.html to replace any remaining absolute paths
const htmlPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\index.html';
if (fs.existsSync(htmlPath)) {
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  htmlContent = htmlContent.replace(/C:\/Users\/ICONIC DIGITALS\/\.gemini\/antigravity\/scratch\/hyperxgt_catalogue\/images\//g, 'images/');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log("Updated index.html image paths to relative 'images/...'");
}
