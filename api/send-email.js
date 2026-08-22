// Vercel Serverless Function: Real Email Delivery Engine (Resend API)
const https = require('https');

function httpsPost(urlStr, headers, bodyObj) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify(bodyObj);
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
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
      req.write(postData);
      req.end();
    } catch(err) {
      reject(err);
    }
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET DEBUG ROUTE FOR 1-CLICK TESTING
  if (req.method === 'GET') {
    const testEmail = req.query.email || "contact@hyperxgt.com";
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return res.status(200).json({
        success: false,
        message: "RESEND_API_KEY is not set in Vercel Environment Variables yet.",
        instructions: "Add RESEND_API_KEY in Vercel Settings -> Environment Variables & Redeploy"
      });
    }

    try {
      const resendHeaders = { 'Authorization': `Bearer ${resendApiKey}` };
      const resendPayload = {
        from: 'onboarding@resend.dev',
        to: [testEmail],
        subject: 'HyperXGT Live Email Delivery Test 🏎️',
        html: '<h2>Welcome to HyperXGT!</h2><p>Your email delivery engine is 100% active and working!</p>'
      };

      const rRes = await httpsPost('https://api.resend.com/emails', resendHeaders, resendPayload);
      return res.status(200).json({
        success: rRes.statusCode === 200 || rRes.statusCode === 201,
        statusCode: rRes.statusCode,
        resendResponse: rRes.body
      });
    } catch(err) {
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { template, toEmail, toName, order } = req.body || {};
    const targetEmail = toEmail || "contact@hyperxgt.com";

    const resendApiKey = process.env.RESEND_API_KEY;
    let subject = "Notification from HyperXGT";
    let htmlContent = "";

    // 1. WELCOME EMAIL TEMPLATE
    if (template === 'welcome') {
      subject = `Welcome to HyperXGT Driver Garage, ${toName || 'Racer'}! 🏎️`;
      htmlContent = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e4ec; border-radius: 16px; overflow: hidden; color: #111;">
          <div style="background: #0d0e11; padding: 28px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 0.05em;">HYPERXGT</h1>
            <p style="color: #1488d8; font-size: 11px; margin-top: 4px; text-transform: uppercase; font-weight: 800;">RC PERFORMANCE · STORE · CLUB</p>
          </div>
          <div style="padding: 32px; line-height: 1.6;">
            <h2 style="color: #111; margin-top: 0;">Welcome to the Driver Garage! 🏎️</h2>
            <p>Hi <strong>${toName || 'Valued Racer'}</strong>,</p>
            <p>Thank you for creating your account at <strong>HyperXGT</strong> — India's premier destination for high-speed RC racing cars, crawlers, drift platforms, and collector scale models.</p>
            
            <div style="background: #f4f6ff; border: 1px solid #dfe4ff; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 700;">Your Welcome Gift Code</div>
              <div style="font-size: 24px; font-weight: 900; color: #1488d8; letter-spacing: 0.1em; margin: 8px 0;">HYPERXGT10</div>
              <div style="font-size: 12px; color: #2e7d32; font-weight: 700;">Get 10% OFF on your first RC car or spare parts order!</div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://hyperxgt.com/shop.html" style="background: #111; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; display: inline-block;">Explore RC Catalogue →</a>
            </div>
          </div>
        </div>
      `;
    }

    // 2. ORDER CONFIRMATION TAX INVOICE EMAIL TEMPLATE
    else if (template === 'order_receipt' && order) {
      subject = `HyperXGT Order Confirmation — ${order.id} (₹${Number(order.total || 0).toLocaleString("en-IN")})`;
      const itemsList = (order.items || []).map(it => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;"><strong>${it.name}</strong><br><small style="color:#777">SKU: ${it.sku}</small></td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${it.qty}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(it.price * it.qty).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");

      htmlContent = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e4ec; border-radius: 16px; overflow: hidden; color: #111;">
          <div style="background: #111; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">HYPERXGT TAX INVOICE</h1>
            <p style="color: #2e7d32; font-size: 12px; margin-top: 4px; font-weight: 800;">✓ ORDER CONFIRMED & DISPATCH READY</p>
          </div>
          <div style="padding: 28px;">
            <p>Hi <strong>${(order.customer && order.customer.name) ? order.customer.name : (toName || 'Customer')}</strong>,</p>
            <p>Thank you for your order with HyperXGT! We have received your order and our store admin team is inspecting your items for express dispatch.</p>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left;">Item Description</th>
                  <th style="padding: 10px; text-align: center;">Qty</th>
                  <th style="padding: 10px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>

            <div style="text-align: right; font-size: 15px; margin-top: 14px;">
              <strong>Grand Total: ₹${Number(order.total || 0).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        </div>
      `;
    }

    let apiResult = null;

    if (resendApiKey) {
      try {
        const resendHeaders = { 'Authorization': `Bearer ${resendApiKey}` };
        const resendPayload = {
          from: 'onboarding@resend.dev',
          to: [targetEmail],
          subject: subject,
          html: htmlContent
        };
        const rRes = await httpsPost('https://api.resend.com/emails', resendHeaders, resendPayload);
        apiResult = rRes.body;
      } catch(err) {
        apiResult = { error: err.message };
      }
    }

    return res.status(200).json({
      success: true,
      targetEmail,
      subject,
      resendResult: apiResult
    });

  } catch (err) {
    console.error("Email API Error:", err.message);
    return res.status(500).json({ error: "Failed to process email delivery", details: err.message });
  }
};
