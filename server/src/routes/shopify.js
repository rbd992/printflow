// routes/shopify.js — proxy Shopify Admin API calls to avoid CORS
// The Electron app cannot call Shopify directly from a renderer process
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const https = require('https');

// POST /api/shopify/proxy
// Body: { storeUrl, apiKey, path, method, body }
router.post('/proxy', authenticate, async (req, res) => {
  const { storeUrl, apiKey, path, method = 'GET', body } = req.body;

  if (!storeUrl || !apiKey || !path) {
    return res.status(400).json({ error: 'storeUrl, apiKey, and path are required' });
  }

  const clean = storeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const url   = `https://${clean}${path.startsWith('/') ? path : '/' + path}`;

  try {
    const fetchOptions = {
      method,
      headers: {
        'X-Shopify-Access-Token': apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body && method !== 'GET') fetchOptions.body = JSON.stringify(body);

    const response = await fetch(url, fetchOptions);
    const data     = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.errors || `Shopify returned ${response.status}`,
        details: data,
      });
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `Could not reach Shopify store: ${err.message}` });
  }
});

module.exports = router;
