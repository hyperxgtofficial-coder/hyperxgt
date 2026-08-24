// Vercel Serverless Function: Server-Side Cashfree Payment Verification API & Webhook
const https = require('https');
const crypto = require('crypto');

function httpsGet(urlStr, headers) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: headers || {}
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
          catch(e) { resolve({ statusCode: res.statusCode, body: data }); }
        });
      });

      req.on('error', err => reject(err));
      req.end();
    } catch(err) { reject(err); }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-signature');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const orderId = req.query.order_id || (req.body && (req.body.order_id || (req.body.data && req.body.data.order && req.body.data.order.order_id)));

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const env = process.env.CASHFREE_ENV || 'TEST';

    if (!appId || !secretKey) {
      return res.status(500).json({ error: 'Cashfree credentials not set in environment variables' });
    }

    const host = env === 'PROD' ? 'api.cashfree.com' : 'sandbox.cashfree.com';
    const verifyUrl = `https://${host}/pg/orders/${encodeURIComponent(orderId)}`;

    const cfHeaders = {
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': '2023-08-01'
    };

    const cfRes = await httpsGet(verifyUrl, cfHeaders);

    if (cfRes.statusCode === 200 && cfRes.body) {
      const b = cfRes.body;
      const paymentStatus = b.order_status; // PAID, ACTIVE, EXPIRED, TERMINATED

      if (paymentStatus === 'PAID') {
        return res.status(200).json({
          success: true,
          verified: true,
          status: 'PAID',
          order_id: b.order_id,
          order_amount: b.order_amount,
          message: 'Payment verified successfully with Cashfree servers ✓'
        });
      } else {
        return res.status(400).json({
          success: false,
          verified: false,
          status: paymentStatus,
          order_id: b.order_id,
          error: `Payment status is ${paymentStatus}. Not marked as PAID.`
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: 'Failed to fetch order verification details from Cashfree',
      details: cfRes.body
    });

  } catch(err) {
    console.error("Verify Cashfree Payment Error:", err.message);
    return res.status(500).json({ error: "Payment verification failed", details: err.message });
  }
};