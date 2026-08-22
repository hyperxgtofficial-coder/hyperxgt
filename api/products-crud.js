// Vercel Serverless Function: Product CRUD API (GET, POST, PUT, DELETE)
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const id = req.query.id ? Number(req.query.id) : null;
      if (id) {
        return res.status(200).json({ success: true, message: `Fetched product ID ${id}` });
      }
      return res.status(200).json({ success: true, message: 'Fetched catalogue products' });
    }

    if (req.method === 'POST') {
      const newProd = req.body || {};
      return res.status(201).json({
        success: true,
        message: `New product SKU ${newProd.sku || 'HX-NEW'} added successfully`,
        product: newProd
      });
    }

    if (req.method === 'PUT') {
      const updatedProd = req.body || {};
      return res.status(200).json({
        success: true,
        message: `Product ID ${updatedProd.id || 1} updated successfully`,
        product: updatedProd
      });
    }

    if (req.method === 'DELETE') {
      const deleteId = req.query.id;
      return res.status(200).json({
        success: true,
        message: `Product ID ${deleteId} deleted successfully`
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products CRUD API Error:', err.message);
    return res.status(500).json({ error: 'Database operation failed', details: err.message });
  }
};
