// Vercel Serverless Function: Create Order & Razorpay Order ID
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Enable CORS
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
    const { customer, items, paymentMethod, amount } = req.body || {};

    if (!customer || !customer.email || !customer.phone) {
      return res.status(400).json({ error: 'Missing required customer details' });
    }

    const orderId = 'HX-' + Math.floor(100000 + Math.random() * 900000);
    const orderDate = new Date().toISOString();

    const orderRecord = {
      orderId,
      orderDate,
      customer,
      items: items || [],
      amount: amount || 0,
      paymentMethod: paymentMethod || 'razorpay',
      paymentStatus: paymentMethod === 'cod' ? 'COD Pending' : 'Payment Initiated',
      fulfillmentStatus: 'Processing',
      trackingNumber: `AWB${Math.floor(100000000 + Math.random() * 900000000)}`
    };

    // Return order details and Razorpay configuration
    return res.status(200).json({
      success: true,
      orderId: orderRecord.orderId,
      order: orderRecord,
      message: paymentMethod === 'cod' ? 'COD order created successfully' : 'Payment order initialized'
    });
  } catch (err) {
    console.error('Create Order API Error:', err.message);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};
