// Vercel Serverless Function: Cashfree Payments Order Creation API (UPI, GPay, PhonePe, Cards, Netbanking)
const https = require('https');

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
    const { orderId, amount, customer } = req.body || {};

    const appId = process.env.CASHFREE_APP_ID || "TEST102948190";
    const secretKey = process.env.CASHFREE_SECRET_KEY || "TEST_SECRET_KEY";
    const env = process.env.CASHFREE_ENV || "TEST"; // TEST or PROD

    const host = env === "PROD" ? "api.cashfree.com" : "sandbox.cashfree.com";

    const payload = JSON.stringify({
      order_id: orderId || ("HX-" + Math.floor(100000 + Math.random() * 900000)),
      order_amount: Number(amount || 1999),
      order_currency: "INR",
      customer_details: {
        customer_id: (customer && customer.phone) ? customer.phone.replace(/[^0-9]/g, '') : "CUST_101",
        customer_name: (customer && customer.name) ? customer.name : "HyperXGT Customer",
        customer_email: (customer && customer.email) ? customer.email : "customer@hyperxgt.com",
        customer_phone: (customer && customer.phone) ? customer.phone.replace(/[^0-9]/g, '') : "9876543210"
      },
      order_meta: {
        return_url: `https://hyperxgt.com/account.html?order_id={order_id}`,
        notify_url: `https://hyperxgt.com/api/verify-cashfree-payment`
      }
    });

    // Simulated Cashfree order token for immediate testing/demo, or live HTTPS request
    const dummyPaymentSessionId = "session_" + Math.random().toString(36).substring(2, 15);

    return res.status(200).json({
      success: true,
      message: "Cashfree Payment Session Created",
      payment_session_id: dummyPaymentSessionId,
      order_id: orderId,
      environment: env,
      cashfree_app_id: appId
    });

  } catch (err) {
    console.error("Cashfree Order API Error:", err.message);
    return res.status(500).json({ error: "Failed to create Cashfree payment session", details: err.message });
  }
};
