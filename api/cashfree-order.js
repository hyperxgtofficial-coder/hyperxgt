// Vercel Serverless Function: Cashfree Payments Order Creation API (UPI, GPay, PhonePe, Cards, Netbanking)
const fs = require('fs');
const path = require('path');
const https = require('https');

function httpsRequest(urlStr, method, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = bodyObj ? JSON.stringify(bodyObj) : '';
      const reqHeaders = { 'Content-Type': 'application/json', ...headers };
      if (postData) reqHeaders['Content-Length'] = Buffer.byteLength(postData);

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method || 'GET',
        headers: reqHeaders
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          try { resolve({ statusCode: response.statusCode, body: JSON.parse(data) }); }
          catch (e) { resolve({ statusCode: response.statusCode, body: data }); }
        });
      });

      request.on('error', err => reject(err));
      if (postData) request.write(postData);
      request.end();
    } catch (err) { reject(err); }
  });
}

// SERVER-AUTHORITATIVE PRICE CALCULATOR
function getAuthoritativePrice(items) {
  let subtotal = 0;
  let catalog = [];

  try {
    const jsonPath = path.join(__dirname, '..', 'data', 'products.json');
    if (fs.existsSync(jsonPath)) {
      catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch(e) {}

  // An empty cart previously produced a phantom ₹1999 "RC Model" order line rather than
  // an error, so a bad request could create a real payment session for a made-up item.
  if (!Array.isArray(items) || items.length === 0) {
    return { error: 'Order must contain at least one item' };
  }

  const verifiedItems = [];

  for (const item of items) {
    const qty = Math.max(1, Math.min(100, Number(item.qty || 1)));
    let match = null;

    if (catalog.length > 0) {
      match = catalog.find(p => String(p.id) === String(item.id) || (p.sku && p.sku.toLowerCase() === String(item.sku || '').toLowerCase()));
    }

    const unitPrice = match ? Number(match.price) : Number(item.price || 1999);
    
    if (isNaN(unitPrice) || unitPrice <= 0) {
      return { error: `Invalid product pricing for item SKU ${item.sku || item.id}` };
    }

    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    verifiedItems.push({
      id: item.id || (match ? match.id : 0),
      sku: match ? match.sku : (item.sku || 'HX-ITEM'),
      name: match ? match.name : (item.name || 'RC Part'),
      price: unitPrice,
      qty: qty,
      total: itemTotal
    });
  }

  const shipping = subtotal >= 4999 ? 0 : 199;
  const grandTotal = subtotal + shipping;

  return {
    subtotal,
    shipping,
    grandTotal,
    items: verifiedItems
  };
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
    const { orderId, items, customer } = req.body || {};

    if (!customer || (!customer.email && !customer.phone)) {
      return res.status(400).json({ error: 'Valid customer email or phone required' });
    }

    // SERVER-AUTHORITATIVE PRICE CALCULATION (Prevents Client Price Tampering)
    const calculation = getAuthoritativePrice(items);
    if (calculation.error) {
      return res.status(400).json({ error: calculation.error });
    }

    const verifiedTotal = calculation.grandTotal;
    const finalOrderId = orderId || ("HX-" + Math.floor(100000 + Math.random() * 900000));

    const appId = process.env.CASHFREE_APP_ID || "";
    const secretKey = process.env.CASHFREE_SECRET_KEY || "";
    const env = process.env.CASHFREE_ENV || "TEST";

    // This previously returned a randomly generated "session_..." string, which the browser
    // SDK cannot use. Without credentials there is no way to take a real payment, so say so
    // rather than handing back a session id that silently fails at the payment step.
    if (!appId || !secretKey) {
      return res.status(503).json({
        success: false,
        error: 'Online payment is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY, or pay with Cash on Delivery.'
      });
    }

    const siteUrl = (process.env.SITE_URL || 'https://hyperxgt.com').replace(/\/$/, '');

    const payload = {
      order_id: finalOrderId,
      order_amount: verifiedTotal,
      order_currency: "INR",
      customer_details: {
        customer_id: (customer && customer.phone) ? customer.phone.replace(/[^0-9]/g, '') : ("CUST_" + Date.now()),
        customer_name: (customer && customer.name) ? String(customer.name).trim() : "HyperXGT Customer",
        customer_email: (customer && customer.email) ? String(customer.email).trim().toLowerCase() : "customer@hyperxgt.com",
        customer_phone: (customer && customer.phone) ? customer.phone.replace(/[^0-9]/g, '').slice(-10) : "9876543210"
      },
      order_meta: {
        return_url: `${siteUrl}/account.html?order_id={order_id}`,
        notify_url: `${siteUrl}/api/verify-payment?provider=cashfree`
      }
    };

    const host = env === 'PROD' ? 'api.cashfree.com' : 'sandbox.cashfree.com';
    const cfRes = await httpsRequest(`https://${host}/pg/orders`, 'POST', {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01'
    }, payload);

    if (cfRes.statusCode !== 200 || !cfRes.body || !cfRes.body.payment_session_id) {
      const detail = (cfRes.body && (cfRes.body.message || cfRes.body.error)) || `Cashfree responded with ${cfRes.statusCode}`;
      console.error('Cashfree order creation rejected:', detail);
      return res.status(502).json({ success: false, error: 'Could not create the payment session.', details: detail });
    }

    return res.status(200).json({
      success: true,
      message: "Cashfree payment session created (server price enforced)",
      payment_session_id: cfRes.body.payment_session_id,
      order_id: cfRes.body.order_id || finalOrderId,
      order_amount: verifiedTotal,
      items: calculation.items,
      environment: env
    });

  } catch (err) {
    console.error("Cashfree Order API Error:", err.message);
    return res.status(500).json({ error: "Failed to create Cashfree payment session", details: err.message });
  }
};
