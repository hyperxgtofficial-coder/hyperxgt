const fs = require('fs');
const path = require('path');
const https = require('https');

console.log("=== CHECKING HYPERXGT.COM STORE DETAILS ===");

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

async function audit() {
  const homepageHtml = await fetchUrl('https://www.hyperxgt.com/');
  console.log("Homepage fetched. Length:", homepageHtml.length);

  // Check for contact details
  const emails = homepageHtml.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const phones = homepageHtml.match(/\+?\d[\d\s-]{8,}\d/g) || [];
  const socialLinks = homepageHtml.match(/https?:\/\/(www\.)?(instagram|facebook|youtube|tiktok|linkedin)\.com\/[a-zA-Z0-9._-]+/g) || [];

  console.log("Extracted Emails:", [...new Set(emails)]);
  console.log("Extracted Phones:", [...new Set(phones)]);
  console.log("Extracted Social Links:", [...new Set(socialLinks)]);

  // Check category links
  const categoryLinks = homepageHtml.match(/href=["'](https:\/\/hyperxgt\.com\/product-category\/[^"']+)["']/g) || [];
  console.log("Category Links found:", [...new Set(categoryLinks)]);
}

audit();
