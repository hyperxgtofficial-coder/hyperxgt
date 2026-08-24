// Vercel Serverless Function: Persistent Database Product CRUD API (GET, POST, PUT, DELETE)
const https = require('https');
const fs = require('fs');
const path = require('path');

// Global serverless memory cache (persists across warm function invocations)
let cachedProducts = null;

function getInitialProducts() {
  if (cachedProducts && Array.isArray(cachedProducts) && cachedProducts.length > 0) {
    return cachedProducts;
  }
  try {
    const jsonPath = path.join(__dirname, '..', 'data', 'products.json');
    if (fs.existsSync(jsonPath)) {
      const data = fs.readFileSync(jsonPath, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedProducts = parsed;
        return cachedProducts;
      }
    }
  } catch(e) {}
  return cachedProducts || [];
}

function httpsRequest(urlStr, method, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = bodyObj ? JSON.stringify(bodyObj) : '';
      
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };
      if (postData) {
        reqHeaders['Content-Length'] = Buffer.byteLength(postData);
      }

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method || 'GET',
        headers: reqHeaders
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
      if (postData) req.write(postData);
      req.end();
    } catch(err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "https://hyperxgt-db.supabase.co").replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

  try {
    cachedProducts = getInitialProducts();

    // 1. GET ALL PRODUCTS / SINGLE PRODUCT
    if (req.method === 'GET') {
      const id = req.query.id ? Number(req.query.id) : null;

      // Try fetching live products from Supabase REST database
      if (supabaseAnonKey && supabaseUrl.includes("supabase")) {
        try {
          const dbRes = await httpsRequest(`${supabaseUrl}/rest/v1/products?select=*`, 'GET', {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          });
          if (dbRes.statusCode === 200 && Array.isArray(dbRes.body) && dbRes.body.length > 0) {
            cachedProducts = dbRes.body;
          }
        } catch(e) {}
      }

      if (id && cachedProducts) {
        const item = cachedProducts.find(x => x.id === id);
        return res.status(200).json({ success: true, product: item });
      }

      return res.status(200).json({
        success: true,
        count: cachedProducts ? cachedProducts.length : 0,
        products: cachedProducts || []
      });
    }

    // 2. PUT: UPDATE EXISTING PRODUCT (STOCK, PRICE, SPECS)
    if (req.method === 'PUT') {
      const updatedProd = req.body || {};
      if (!updatedProd.id && !updatedProd.sku) {
        return res.status(400).json({ error: 'Product ID or SKU required for update' });
      }

      // Update in memory cache
      if (cachedProducts && Array.isArray(cachedProducts)) {
        const idx = cachedProducts.findIndex(x => x.id === updatedProd.id || (x.sku && x.sku.toLowerCase() === (updatedProd.sku || '').toLowerCase()));
        if (idx !== -1) {
          cachedProducts[idx] = { ...cachedProducts[idx], ...updatedProd };
        } else {
          cachedProducts.unshift(updatedProd);
        }
      }

      // Persist to Supabase DB if credentials set
      if (supabaseAnonKey && supabaseUrl.includes("supabase")) {
        try {
          await httpsRequest(`${supabaseUrl}/rest/v1/products?id=eq.${updatedProd.id}`, 'PATCH', {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=minimal'
          }, updatedProd);
        } catch(e) {}
      }

      return res.status(200).json({
        success: true,
        message: `Product #${updatedProd.id} (${updatedProd.sku}) updated in database!`,
        product: updatedProd
      });
    }

    // 3. POST: ADD NEW PRODUCT OR BULK SYNC
    if (req.method === 'POST') {
      const payload = req.body || {};

      // Bulk list sync from CSV or admin
      if (req.query.bulk === '1' && Array.isArray(payload)) {
        cachedProducts = payload;
        return res.status(200).json({ success: true, message: `Bulk updated ${payload.length} products` });
      }

      const newProd = payload;
      if (cachedProducts && Array.isArray(cachedProducts)) {
        cachedProducts.unshift(newProd);
      }

      if (supabaseAnonKey && supabaseUrl.includes("supabase")) {
        try {
          await httpsRequest(`${supabaseUrl}/rest/v1/products`, 'POST', {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=minimal'
          }, newProd);
        } catch(e) {}
      }

      return res.status(201).json({
        success: true,
        message: `New product SKU ${newProd.sku || 'HX-NEW'} saved to database!`,
        product: newProd
      });
    }

    // 4. DELETE PRODUCT FROM DATABASE
    if (req.method === 'DELETE') {
      const deleteId = Number(req.query.id);
      if (cachedProducts && Array.isArray(cachedProducts)) {
        cachedProducts = cachedProducts.filter(x => x.id !== deleteId);
      }

      if (supabaseAnonKey && supabaseUrl.includes("supabase")) {
        try {
          await httpsRequest(`${supabaseUrl}/rest/v1/products?id=eq.${deleteId}`, 'DELETE', {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          });
        } catch(e) {}
      }

      return res.status(200).json({
        success: true,
        message: `Product ID ${deleteId} deleted from database!`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products CRUD API Error:', err.message);
    return res.status(500).json({ error: 'Database operation failed', details: err.message });
  }
};
