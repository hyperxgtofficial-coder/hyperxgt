const fs = require('fs');
const path = require('path');

const userLogoPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\brain\\054cfeea-6471-45f8-921f-e697cd42feb2\\.user_uploaded\\media_1787060853616.png';
const webLogoPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\hyperxgt_logo.png';
const catLogoPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_catalogue\\hyperxgt_logo.png';

console.log("=== UPDATING BRAND LOGO ===");

if (fs.existsSync(userLogoPath)) {
  fs.copyFileSync(userLogoPath, webLogoPath);
  fs.copyFileSync(userLogoPath, catLogoPath);
  console.log("Successfully copied official logo to web and catalogue directories.");
} else {
  console.error("User logo path not found:", userLogoPath);
}

// Update index.html to use official logo image
const htmlPath = 'C:\\Users\\ICONIC DIGITALS\\.gemini\\antigravity\\scratch\\hyperxgt_website\\index.html';
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace text logo with official logo img tag
htmlContent = htmlContent.replace(
  /<a href="#" class="brand-logo" style="margin-bottom: 16px;">\s*HYPER <span class="logo-x">X<\/span> GT\s*<\/a>/g,
  `<a href="#" class="brand-logo" style="margin-bottom: 16px;"><img src="hyperxgt_logo.png" alt="HYPER X GT Official Logo" style="height: 48px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));" /></a>`
);

htmlContent = htmlContent.replace(
  /<a href="#" class="brand-logo">\s*HYPER <span class="logo-x">X<\/span> GT\s*<\/a>/g,
  `<a href="#" class="brand-logo"><img src="hyperxgt_logo.png" alt="HYPER X GT Official Logo" style="height: 48px; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.8));" /></a>`
);

fs.writeFileSync(htmlPath, htmlContent);
console.log("Updated index.html with official brand logo image.");
