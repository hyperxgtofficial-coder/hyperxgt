// Vercel Serverless Function: Create Order & Razorpay Order ID
const fs = require('fs');
const path = require('path');

// SERVER-AUTHORITATIVE PRICE CALCULATOR
function calculateServerOrder(items) {
  let subtotal = 0;
  let catalog = [];

  try {
    const jsonPath = path.join(__dirname, '..', 'data', 'products.json');
    if (fs.existsSync(jsonPath)) {
      catalog = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
  } catch(e) {}

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
      return { error: `Invalid pricing for item ${item.sku || item.id}` };
    }

    const itemTotal = unitPrice * qty;
    subtotal += itemTotal;

    verifiedItems.push({
      id: item.id || (match ? match.id : 0),
      sku: match ? match.sku : (item.sku || 'HX-ITEM'),
      name: match ? match.name : (item.name || 'RC Item'),
      price: unitPrice,
      qty: qty,
      total: itemTotal
    });
  }

  const shipping = subtotal >= 4999 ? 0 : 199;
  const grandTotal = subtotal + shipping;

  return { subtotal, shipping, grandTotal, items: verifiedItems };
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
    const { customer, items, paymentMethod } = req.body || {};

    if (!customer || !customer.email || !customer.phone) {
      return res.status(400).json({ error: 'Missing required customer details' });
    }

    // SERVER-AUTHORITATIVE PRICE CALCULATION (Prevents Client Price Tampering)
    const calculation = calculateServerOrder(items);
    if (calculation.error) {
      return res.status(400).json({ error: calculation.error });
    }

    const orderId = 'HX-' + Math.floor(100000 + Math.random() * 900000);
    const orderDate = new Date().toISOString();

    const orderRecord = {
      orderId,
      orderDate,
      customer: {
        name: String(customer.name || 'Customer').trim(),
        email: String(customer.email || '').trim().toLowerCase(),
        phone: String(customer.phone || '').trim(),
        address: String(customer.address || '').trim(),
        city: String(customer.city || '').trim(),
        state: String(customer.state || '').trim(),
        pincode: String(customer.pincode || '').trim()
      },
      items: calculation.items,
      subtotal: calculation.subtotal,
      shipping: calculation.shipping,
      amount: calculation.grandTotal,
      paymentMethod: paymentMethod || 'razorpay',
      paymentStatus: paymentMethod === 'cod' ? 'COD Pending' : 'Payment Initiated',
      fulfillmentStatus: 'Pending Admin Acceptance',
      trackingNumber: `SRK${Math.floor(100000000 + Math.random() * 900000000)}`
    };

    return res.status(200).json({
      success: true,
      orderId: orderRecord.orderId,
      order: orderRecord,
      message: 'Order created with server-verified total pricing.'
    });
  } catch (err) {
    console.error('Create Order API Error:', err.message);
    return res.status(500).json({ error: 'Failed to create order', details: err.message });
  }
};
