// Vercel Serverless Function: Secure Store Admin Authentication & Token Exchange
const crypto = require('crypto');

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

  try {
    const { email, password } = req.body || {};

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@hyperxgt.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "hx_admin_sec_2026_super_key";
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "hx_admin_sec_2026_super_key";

    if (!email || !password) {
      return res.status(400).json({ error: 'Admin email and password are required' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();

    if (cleanEmail === adminEmail && (cleanPassword === adminPassword || cleanPassword === adminSecretKey)) {
      return res.status(200).json({
        success: true,
        message: "Admin authentication successful ✓",
        admin_token: adminSecretKey,
        admin: {
          email: adminEmail,
          role: "super_admin"
        }
      });
    }

    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (err) {
    console.error("Admin Auth API Error:", err.message);
    return res.status(500).json({ error: "Admin authentication failed", details: err.message });
  }
};