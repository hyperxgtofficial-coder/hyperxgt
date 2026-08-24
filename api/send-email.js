// Vercel Serverless Function: Real Email Delivery Engine (Resend API + Custom Branded Sender)
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

  // SENDER BRANDING CONFIGURATION FROM ENVIRONMENT VARIABLES
  const brandName = process.env.BRAND_NAME || 'HyperXGT';
  const senderName = process.env.EMAIL_SENDER_NAME || 'HyperXGT Driver Support';
  const senderEmail = process.env.EMAIL_SENDER_ADDRESS || 'support@hyperxgt.com';
  const replyToEmail = process.env.REPLY_TO_ADDRESS || 'support@hyperxgt.com';

  // GET DEBUG ROUTE FOR 1-CLICK VERIFICATION TESTING
  if (req.method === 'GET') {
    const testEmail = req.query.email || "support@hyperxgt.com";
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return res.status(200).json({
        success: false,
        message: "RESEND_API_KEY environment variable is not configured in Vercel yet.",
        instructions: "Add RESEND_API_KEY in Vercel Settings -> Environment Variables & Redeploy"
      });
    }

    try {
      const resendHeaders = { 'Authorization': `Bearer ${resendApiKey}` };
      const fromHeader = process.env.VERIFIED_DOMAIN ? `${senderName} <${senderEmail}>` : `${senderName} <onboarding@resend.dev>`;
      const resendPayload = {
        from: fromHeader,
        to: [testEmail],
        reply_to: replyToEmail,
        subject: `${brandName} Live Branded Email Delivery Test 🏎️`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e4ec; border-radius: 16px; overflow: hidden; color: #111;">
            <div style="background: #0d0e11; padding: 28px; text-align: center; border-bottom: 3px solid #1488d8;">
              <img src="https://hyperxgt.com/assets/hyperxgt-logo.png" alt="${brandName} Logo" style="height: 44px; max-width: 200px; object-fit: contain;">
              <p style="color: #1488d8; font-size: 11px; margin-top: 4px; text-transform: uppercase; font-weight: 800;">RC PERFORMANCE · STORE · CLUB</p>
            </div>
            <div style="padding: 32px;">
              <h2 style="color: #111; margin-top: 0;">Branded Email Engine Active! 🏎️</h2>
              <p>Your custom branded email engine is 100% active and configured for <strong>${brandName}</strong>.</p>
              <p>Sender: <strong>${fromHeader}</strong></p>
            </div>
          </div>
        `
      };

      const rRes = await httpsPost('https://api.resend.com/emails', resendHeaders, resendPayload);
      return res.status(200).json({
        success: rRes.statusCode === 200 || rRes.statusCode === 201,
        statusCode: rRes.statusCode,
        senderUsed: fromHeader,
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
    const { template, toEmail, toName, order, confirmUrl } = req.body || {};
    const targetEmail = (toEmail || "support@hyperxgt.com").toLowerCase().trim();

    const resendApiKey = process.env.RESEND_API_KEY;
    let subject = `Notification from ${brandName}`;
    let htmlContent = "";

    // 1. REGISTRATION / CONFIRM SIGNUP / VERIFICATION EMAIL TEMPLATE
    if (template === 'verification' || template === 'welcome') {
      subject = `Welcome to ${brandName} Driver Garage, ${toName || 'Racer'}! 🏎️`;
      const verificationLink = confirmUrl || `https://hyperxgt.com/account.html`;

      htmlContent = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e4ec; border-radius: 16px; overflow: hidden; color: #111; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
          <div style="background: #0d0e11; padding: 32px 24px; text-align: center; border-bottom: 3px solid #1488d8;">
            <img src="https://hyperxgt.com/assets/hyperxgt-logo.png" alt="${brandName} Logo" style="height: 48px; max-width: 220px; object-fit: contain; margin-bottom: 6px;">
            <div style="color: #1488d8; font-size: 11px; margin-top: 4px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.15em;">RC PERFORMANCE · STORE · CLUB</div>
          </div>
          <div style="padding: 36px 32px; line-height: 1.6;">
            <div style="font-size: 11px; font-weight: 800; color: #2e7d32; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">ACCOUNT REGISTRATION</div>
            <h2 style="color: #111; margin-top: 0; font-size: 22px; font-weight: 900;">Welcome to the Driver Garage! 🏎️</h2>
            <p style="font-size: 15px;">Hi <strong>${toName || targetEmail}</strong>,</p>
            <p style="font-size: 14px; color: #444;">Thank you for creating your account with <strong>${brandName}</strong> — India's premier destination for high-speed RC racing cars, crawlers, drift platforms, and collector scale models.</p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verificationLink}" target="_blank" style="background: #1488d8; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(20,136,216,0.35);">Verify Email & Activate Account →</a>
            </div>

            <div style="background: #f4f6ff; border: 1.5px dashed #dfe4ff; border-radius: 14px; padding: 22px; margin: 28px 0; text-align: center;">
              <div style="font-size: 11px; color: #666; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">YOUR WELCOME GIFT CODE</div>
              <div style="font-size: 26px; font-weight: 900; color: #1488d8; letter-spacing: 0.12em; margin: 8px 0;">HYPERXGT10</div>
              <div style="font-size: 13px; color: #2e7d32; font-weight: 800;">Get 10% OFF on your first RC car or spare parts order!</div>
            </div>

            <div style="background: #fffbebf7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #92400e; margin-top: 24px;">
              <strong>Security Note:</strong> If you did not create an account at ${brandName}, you can safely ignore this email.
            </div>

            <div style="border-top: 1px solid #eee; margin-top: 36px; padding-top: 24px; font-size: 12px; color: #666; text-align: center;">
              <p style="margin: 0 0 6px;">Need assistance? Contact our Garage Team at <a href="mailto:${replyToEmail}" style="color: #1488d8; text-decoration: none; font-weight: 700;">${replyToEmail}</a> or Call/WhatsApp <strong>+91 70902 27777</strong></p>
              <p style="margin: 0;">© 2026 ${brandName} · All Rights Reserved · India</p>
            </div>
          </div>
        </div>
      `;
    }

    // 2. PASSWORD RESET EMAIL TEMPLATE
    else if (template === 'password_reset') {
      subject = `Reset your ${brandName} Account Password 🔒`;
      const resetLink = confirmUrl || `https://hyperxgt.com/account.html`;

      htmlContent = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e0e4ec; border-radius: 16px; overflow: hidden; color: #111;">
          <div style="background: #0d0e11; padding: 32px 24px; text-align: center; border-bottom: 3px solid #ed1c24;">
            <img src="https://hyperxgt.com/assets/hyperxgt-logo.png" alt="${brandName} Logo" style="height: 48px; max-width: 220px; object-fit: contain;">
            <div style="color: #ed1c24; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.15em; margin-top: 4px;">SECURITY CENTER</div>
          </div>
          <div style="padding: 36px 32px; line-height: 1.6;">
            <h2 style="color: #111; margin-top: 0;">Password Reset Request 🔒</h2>
            <p>Hi <strong>${toName || targetEmail}</strong>,</p>
            <p>We received a password reset request for your <strong>${brandName} Driver Garage</strong> account.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" target="_blank" style="background: #111; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 15px; display: inline-block;">Reset Account Password →</a>
            </div>
            <div style="background: #ffeeef; border-left: 4px solid #ed1c24; padding: 14px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #991b1b; margin-top: 24px;">
              <strong>Important:</strong> If you did not request a password reset, please ignore this message. Your account remains secure.
            </div>
            <div style="border-top: 1px solid #eee; margin-top: 36px; padding-top: 24px; font-size: 12px; color: #666; text-align: center;">
              <p style="margin: 0;">Support: <a href="mailto:${replyToEmail}" style="color: #1488d8; text-decoration: none;">${replyToEmail}</a> · © 2026 ${brandName}</p>
            </div>
          </div>
        </div>
      `;
    }

    // 3. ORDER CONFIRMATION TAX INVOICE EMAIL TEMPLATE
    else if (template === 'order_receipt' && order) {
      subject = `${brandName} Order Confirmation — ${order.id} (₹${Number(order.total || 0).toLocaleString("en-IN")})`;
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
            <img src="https://hyperxgt.com/assets/hyperxgt-logo.png" alt="${brandName} Logo" style="height: 40px; max-width: 200px; object-fit: contain; margin-bottom: 4px;">
            <h1 style="color: #ffffff; margin: 6px 0 0; font-size: 20px;">TAX INVOICE RECEIPT</h1>
            <p style="color: #2e7d32; font-size: 12px; margin-top: 4px; font-weight: 800;">✓ ORDER CONFIRMED & DISPATCH READY</p>
          </div>
          <div style="padding: 28px;">
            <p>Hi <strong>${(order.customer && order.customer.name) ? order.customer.name : (toName || 'Customer')}</strong>,</p>
            <p>Thank you for your order with ${brandName}! We have received your order and our store admin team is inspecting your items for express dispatch.</p>

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
        const fromHeader = process.env.VERIFIED_DOMAIN ? `${senderName} <${senderEmail}>` : `${senderName} <onboarding@resend.dev>`;
        const resendPayload = {
          from: fromHeader,
          to: [targetEmail],
          reply_to: replyToEmail,
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
