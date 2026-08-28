// Vercel Serverless Function: Supabase Storage & Image CDN Upload API
const https = require('https');

function httpsUpload(urlStr, headers, buffer) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Length': buffer.length,
          ...headers
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch(e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', err => reject(err));
      req.write(buffer);
      req.end();
    } catch(err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This endpoint writes to the shared storage bucket and was reachable by anyone.
  const adminKey = req.headers['x-admin-key'] || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '');
  if (!adminKey || adminKey !== (process.env.ADMIN_SECRET_KEY || "hx_admin_sec_2026_super_key")) {
    return res.status(401).json({ error: 'Unauthorized: Store Admin credentials required to upload media' });
  }

  try {
    const { base64, filename, contentType } = req.body || {};

    if (!base64) {
      return res.status(400).json({ error: 'Base64 media string is required' });
    }

    // The prefix strip was image-only, so video uploads kept their "data:video/mp4;base64,"
    // header inside the payload and came back double-prefixed and mislabelled as an image.
    const dataUrlMatch = /^data:([\w.+-]+\/[\w.+-]+)?;base64,/.exec(base64);
    const cleanBase64 = dataUrlMatch ? base64.slice(dataUrlMatch[0].length) : base64;
    const mimeType = (dataUrlMatch && dataUrlMatch[1]) || contentType || 'image/jpeg';
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (!buffer.length) {
      return res.status(400).json({ error: 'Media payload could not be decoded' });
    }

    const supabaseUrl = (process.env.SUPABASE_URL || "https://hyperxgt-db.supabase.co").replace(/\/$/, '');
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

    const ext = filename ? filename.split('.').pop() : 'jpg';
    const uniqueName = `prod_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;

    let publicUrl = "";

    // 1. UPLOAD TO SUPABASE STORAGE BUCKET ('products')
    if ((supabaseServiceKey || supabaseAnonKey) && supabaseUrl.includes("supabase")) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/products/${uniqueName}`;
        const activeKey = supabaseServiceKey || supabaseAnonKey;
        const headers = {
          'apikey': activeKey,
          'Authorization': `Bearer ${activeKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true'
        };

        const upRes = await httpsUpload(uploadUrl, headers, buffer);
        if (upRes.statusCode === 200 || upRes.statusCode === 201) {
          publicUrl = `${supabaseUrl}/storage/v1/object/public/products/${uniqueName}`;
        }
      } catch(e) {
        console.error("Supabase Storage Upload Error:", e.message);
      }
    }

    // Fallback: If Supabase Storage bucket isn't configured, save file to assets/uploads/ on local disk
    if (!publicUrl) {
      try {
        const fs = require('fs');
        const path = require('path');
        const uploadsDir = path.join(__dirname, '..', 'assets', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localFilePath = path.join(uploadsDir, uniqueName);
        fs.writeFileSync(localFilePath, buffer);
        publicUrl = `assets/uploads/${uniqueName}`;
      } catch(err) {
        console.error("Local disk storage write error:", err.message);
        publicUrl = `data:${mimeType};base64,${cleanBase64}`;
      }
    }

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: uniqueName
    });

  } catch (err) {
    console.error("Image Upload API Error:", err.message);
    return res.status(500).json({ error: "Failed to upload image", details: err.message });
  }
};
