// Vercel Serverless Function: Track Order API
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const orderId = (req.query.orderId || (req.body && req.body.orderId) || '').toUpperCase().trim();

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  // Simulated live courier tracking response
  const trackingData = {
    orderId,
    courier: 'Bluedart Express / Delhivery',
    trackingNumber: `AWB${Math.floor(100000000 + Math.random() * 900000000)}`,
    status: 'In Transit — Express Dispatch',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    origin: 'HyperXGT Warehouse, India',
    timeline: [
      { step: 'Order Placed & Verified', done: true, time: 'Just Now' },
      { step: 'Quality Checked & Packed in Collector Box', done: true, time: '2 hours ago' },
      { step: 'Dispatched via Express Courier', done: true, time: 'In Progress' },
      { step: 'Out for Doorstep Delivery', done: false, time: 'Pending' }
    ]
  };

  return res.status(200).json({
    success: true,
    tracking: trackingData
  });
};
