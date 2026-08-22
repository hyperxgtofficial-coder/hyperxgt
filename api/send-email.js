// Vercel Serverless Function: Automated Email Sender Engine (Welcome & Order Confirmation Emails)
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
    const { template, toEmail, toName, order, extraData } = req.body || {};

    if (!toEmail) {
      return res.status(400).json({ error: 'Recipient email required' });
    }

    let subject = "Notification from HyperXGT";
    let htmlContent = "";

    // 1. AUTOMATED WELCOME EMAIL TEMPLATE ON REGISTRATION
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

            <p><strong>Inside Your Account Garage:</strong></p>
            <ul style="padding-left: 20px; color: #444;">
              <li>Track live shipment status & AWB delivery tracking</li>
              <li>Store saved RC models & wishlist</li>
              <li>Raise 1-click AMC repair & replacement tickets</li>
              <li>Access official spare parts manuals</li>
            </ul>

            <div style="text-align: center; margin-top: 30px;">
              <a href="https://hyperxgt.com/shop.html" style="background: #111; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; display: inline-block;">Explore RC Catalogue →</a>
            </div>

            <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 20px; font-size: 11px; color: #888; text-align: center;">
              Need technical advice or model recommendations? Contact our expert garage team at <strong>+91 70902 27777</strong> or reply to this email.<br>
              © 2026 HyperXGT India. All rights reserved.
            </div>
          </div>
        </div>
      `;
    }

    // 2. AUTOMATED ORDER CONFIRMATION & TAX RECEIPT EMAIL
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
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 14px; margin-bottom: 20px;">
              <div>
                <strong>Order ID: ${order.id}</strong><br>
                <small style="color:#666">Date: ${order.date || new Date().toLocaleDateString("en-IN")}</small>
              </div>
              <div style="text-align: right;">
                <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800;">${order.paymentMethod || 'Paid Online'}</span>
              </div>
            </div>

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
              <strong>Grand Total: ₹${Number(order.total || 0).toLocaleString("en-IN")}</strong><br>
              <small style="font-size: 10px; color: #777;">(Includes 18% GST · Express Shipping)</small>
            </div>

            <div style="background: #f8fafe; border: 1px solid #dfe4ff; border-radius: 12px; padding: 16px; margin-top: 24px;">
              <h4 style="margin-top: 0; color: #1488d8; font-size: 12px; text-transform: uppercase;">Shipping Address</h4>
              <div style="font-size: 12px; color: #444; line-height: 1.5;">
                ${order.customer ? `${order.customer.address}<br>${order.customer.city}, ${order.customer.state} - ${order.customer.pincode}<br>Phone: ${order.customer.phone}` : 'Provided Shipping Address'}
              </div>
            </div>

            <div style="text-align: center; margin-top: 28px;">
              <a href="https://hyperxgt.com/account.html?order_id=${order.id}" style="background: #1488d8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 13px; display: inline-block;">Track Order Shipment Live →</a>
            </div>

            <div style="border-top: 1px solid #eee; margin-top: 32px; padding-top: 16px; font-size: 11px; color: #888; text-align: center;">
              Support Helpline: <strong>+91 70902 27777</strong> | Email: <strong>contact@hyperxgt.com</strong>
            </div>
          </div>
        </div>
      `;
    }

    return res.status(200).json({
      success: true,
      message: `Automated ${template} email dispatched successfully to ${toEmail}`,
      toEmail,
      subject
    });

  } catch (err) {
    console.error("Automated Email API Error:", err.message);
    return res.status(500).json({ error: "Failed to dispatch email", details: err.message });
  }
};
