# HYPERXGT — PRODUCTION DEPLOYMENT GUIDE 🌐

This project is 100% prepared for instant static deployment to **Vercel**, **Netlify**, **GitHub Pages**, or **Cloudflare Pages**.

---

## ⚡ Option 1: Deploy to Vercel (Recommended - 60 Seconds)

### Method A: Via Vercel CLI (Fastest)
1. Open PowerShell / Terminal inside `C:\Users\ICONIC DIGITALS\.gemini\antigravity\scratch\hyperxgt_website`:
   ```bash
   npx vercel
   ```
2. Follow the on-screen prompts (press `Enter` for defaults).
3. For production deployment:
   ```bash
   npx vercel --prod
   ```

### Method B: Via GitHub & Vercel Dashboard
1. Create a new GitHub repository named `hyperxgt-website`.
2. Push your project folder to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial HyperXGT Production Build"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/hyperxgt-website.git
   git push -u origin main
   ```
3. Go to [https://vercel.com/new](https://vercel.com/new), select your `hyperxgt-website` repository, and click **Deploy**.

---

## ⚡ Option 2: Deploy to Netlify

### Method A: Drag & Drop (No Code Needed)
1. Open [https://app.netlify.com/drop](https://app.netlify.com/drop) in your browser.
2. Drag and drop the folder `C:\Users\ICONIC DIGITALS\.gemini\antigravity\scratch\hyperxgt_website` onto the page.
3. Your site will be live instantly with SSL HTTPS enabled!

### Method B: Via Netlify CLI
```bash
npx netlify-cli deploy --prod
```

---

## ⚡ Option 3: Deploy to GitHub Pages

1. Push your code to GitHub repository `hyperxgt-website`.
2. In GitHub, go to **Settings** → **Pages**.
3. Under **Source**, select `main` branch and `/ (root)` folder.
4. Click **Save**. Your site will be published at `https://YOUR_USERNAME.github.io/hyperxgt-website/`.

---

## 📁 Included Deployment Configurations

- `vercel.json`: Vercel static routing & caching header rules.
- `netlify.toml`: Netlify headers & publish directory setup.
- `sitemap.xml`: Auto-generated XML sitemap containing all 338 products for Google Indexing.
- `robots.txt`: Search engine crawler instructions.
