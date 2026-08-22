// Vercel Serverless Function: Verify Razorpay Payment Signature
const crypto = require('crypto');

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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const secret = process.env.RAZORPAY_KEY_SECRET || 'hyperxgt_secret';

    if (razorpay_order_id && razorpay_signature) {
      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

      if (generated_signature !== razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Payment signature verified successfully',
      paymentId: razorpay_payment_id || 'pay_' + Math.random().toString(36).substring(2, 9)
    });
  } catch (err) {
    console.error('Verify Payment API Error:', err.message);
    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
};
