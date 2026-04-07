// routes/portal.js — public customer order status portal (no auth required)
'use strict';
const router = require('express').Router();
const { getDb } = require('../db/connection');

// GET /api/portal/order/:order_number
// Public endpoint — returns safe subset of order info for customer-facing status page
router.get('/order/:order_number', (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT
      order_number, customer_name, description, status,
      platform, price_cad, shipping_cad, due_date,
      tracking_number, carrier, notes, created_at, updated_at,
      paid_at, payment_method
    FROM orders
    WHERE UPPER(order_number) = UPPER(?)
      AND is_historical = 0
  `).get(req.params.order_number.trim());

  if (!order) return res.status(404).json({ error: 'Order not found. Check your order number and try again.' });

  // Return status info only — no internal fields
  const STATUS_LABELS = {
    new:              'Received',
    queued:           'Queued for printing',
    quoted:           'Quote sent',
    confirmed:        'Confirmed',
    printing:         'Printing now',
    printed:          'Print complete',
    'post-processing':'Finishing',
    qc:               'Quality check',
    packed:           'Packed & ready',
    shipped:          'Shipped',
    delivered:        'Delivered',
    paid:             'Complete',
    cancelled:        'Cancelled',
  };

  res.json({
    order_number:   order.order_number,
    status:         order.status,
    status_label:   STATUS_LABELS[order.status] || order.status,
    description:    order.description,
    due_date:       order.due_date,
    tracking_number: order.tracking_number,
    carrier:        order.carrier,
    created_at:     order.created_at,
    updated_at:     order.updated_at,
    // Only expose notes if they're not empty (some may be internal)
    notes:          order.notes || null,
  });
});

// GET /api/portal/config — returns business name/branding for the portal page
router.get('/config', (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'company_config'").get();
    if (row?.value) {
      const cfg = JSON.parse(row.value);
      return res.json({
        name:    cfg.name    || 'PrintFlow',
        email:   cfg.email   || null,
        phone:   cfg.phone   || null,
        website: cfg.website || null,
      });
    }
  } catch {}
  res.json({ name: 'PrintFlow', email: null, phone: null, website: null });
});

module.exports = router;
