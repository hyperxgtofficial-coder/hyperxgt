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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { base64, filename, contentType } = req.body || {};

    if (!base64) {
      return res.status(400).json({ error: 'Base64 image string is required' });
    }

    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const supabaseUrl = (process.env.SUPABASE_URL || "https://hyperxgt-db.supabase.co").replace(/\/$/, '');
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

    const ext = filename ? filename.split('.').pop() : 'jpg';
    const uniqueName = `prod_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;

    let publicUrl = "";

    // 1. UPLOAD TO SUPABASE STORAGE BUCKET ('products')
    if (supabaseAnonKey && supabaseUrl.includes("supabase")) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/products/${uniqueName}`;
        const headers = {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': contentType || 'image/jpeg',
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

    // Fallback: If Supabase Storage bucket isn't created yet, compress data URL safely
    if (!publicUrl) {
      publicUrl = `data:image/${ext};base64,${cleanBase64}`;
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
