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

function saveProductsToJsonDisk(arr) {
  try {
    if (!Array.isArray(arr) || !arr.length) return;
    const jsonPath = path.join(__dirname, '..', 'data', 'products.json');
    const dir = path.dirname(jsonPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2), 'utf8');
  } catch(e) {
    console.error("Disk save error:", e.message);
  }
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

function verifyAdminAuth(req) {
  const adminKey = req.headers['x-admin-key'] || (req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : '');
  const secretKey = process.env.ADMIN_SECRET_KEY || "hx_admin_sec_2026_super_key";
  return !!(adminKey && adminKey === secretKey);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = (process.env.SUPABASE_URL || "https://hyperxgt-db.supabase.co").replace(/\/$/, '');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  try {
    cachedProducts = getInitialProducts();

    // GET METHOD IS PUBLIC
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
        const item = cachedProducts.find(x => String(x.id) === String(id));
        return res.status(200).json({ success: true, product: item });
      }

      return res.status(200).json({
        success: true,
        count: cachedProducts ? cachedProducts.length : 0,
        products: cachedProducts || []
      });
    }

    // REQUIRE ADMIN AUTH FOR WRITE & DELETE OPERATIONS
    if (!verifyAdminAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized: Store Admin credentials required for database modifications' });
    }

    // 2. PUT: UPDATE EXISTING PRODUCT (STOCK, PRICE, SPECS)
    if (req.method === 'PUT') {
      const updatedProd = req.body || {};
      if (!updatedProd.id && !updatedProd.sku) {
        return res.status(400).json({ error: 'Product ID or SKU required for update' });
      }

      // Update in memory cache
      if (cachedProducts && Array.isArray(cachedProducts)) {
        const idx = cachedProducts.findIndex(x => String(x.id) === String(updatedProd.id) || (x.sku && x.sku.toLowerCase() === (updatedProd.sku || '').toLowerCase()));
        if (idx !== -1) {
          cachedProducts[idx] = { ...cachedProducts[idx], ...updatedProd };
        } else {
          cachedProducts.unshift(updatedProd);
        }
        saveProductsToJsonDisk(cachedProducts);
      }

      // Persist to Supabase DB if credentials set (use service_role key for writes - RLS requires it)
      if (supabaseServiceKey && supabaseUrl.includes("supabase")) {
        try {
          const dbItem = {
            id: Number(updatedProd.id),
            sku: String(updatedProd.sku || `HX-${updatedProd.id}`),
            name: String(updatedProd.name || ''),
            category: String(updatedProd.category || ''),
            price: Number(updatedProd.price || 0),
            regular_price: Number(updatedProd.mrp || 0),
            stock: Number(updatedProd.stock !== undefined ? updatedProd.stock : 25),
            image: String(updatedProd.image || ''),
            images: Array.isArray(updatedProd.images) ? updatedProd.images : [],
            no_image: Boolean(updatedProd.no_image)
          };
          await httpsRequest(`${supabaseUrl}/rest/v1/products`, 'POST', {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'resolution=merge-duplicates, return=minimal'
          }, [dbItem]);
        } catch(e) { console.error('Supabase PUT error:', e.message); }
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
        saveProductsToJsonDisk(cachedProducts);

        if (supabaseServiceKey && supabaseUrl.includes("supabase")) {
          try {
            const dbPayload = payload.map(p => ({
              id: Number(p.id),
              sku: String(p.sku || `HX-${p.id}`),
              name: String(p.name || ''),
              category: String(p.category || ''),
              price: Number(p.price || 0),
              regular_price: Number(p.mrp || 0),
              stock: Number(p.stock !== undefined ? p.stock : 25),
              image: String(p.image || ''),
              images: Array.isArray(p.images) ? p.images : [],
              no_image: Boolean(p.no_image)
            }));

            await httpsRequest(`${supabaseUrl}/rest/v1/products`, 'POST', {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Prefer': 'resolution=merge-duplicates, return=minimal'
            }, dbPayload);
          } catch(e) { console.error('Supabase bulk POST error:', e.message); }
        }

        return res.status(200).json({ success: true, message: `Bulk updated ${payload.length} products to live database!` });
      }

      const newProd = payload;
      if (cachedProducts && Array.isArray(cachedProducts)) {
        cachedProducts.unshift(newProd);
        saveProductsToJsonDisk(cachedProducts);
      }

      if (supabaseServiceKey && supabaseUrl.includes("supabase")) {
        try {
          const dbItem = {
            id: Number(newProd.id),
            sku: String(newProd.sku || `HX-${newProd.id}`),
            name: String(newProd.name || ''),
            category: String(newProd.category || ''),
            price: Number(newProd.price || 0),
            regular_price: Number(newProd.mrp || 0),
            stock: Number(newProd.stock !== undefined ? newProd.stock : 25),
            image: String(newProd.image || ''),
            images: Array.isArray(newProd.images) ? newProd.images : [],
            no_image: Boolean(newProd.no_image)
          };
          await httpsRequest(`${supabaseUrl}/rest/v1/products`, 'POST', {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'resolution=merge-duplicates, return=minimal'
          }, [dbItem]);
        } catch(e) { console.error('Supabase POST error:', e.message); }
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
        saveProductsToJsonDisk(cachedProducts);
      }

      if (supabaseServiceKey && supabaseUrl.includes("supabase")) {
        try {
          await httpsRequest(`${supabaseUrl}/rest/v1/products?id=eq.${deleteId}`, 'DELETE', {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          });
        } catch(e) { console.error('Supabase DELETE error:', e.message); }
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
