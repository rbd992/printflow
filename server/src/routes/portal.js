// routes/portal.js — public customer order tracking portal
// Serves a self-contained HTML page at /track and JSON API at /api/portal/*
// No authentication required on any route in this file.
'use strict';
const router = require('express').Router();
const { getDb } = require('../db/connection');

const STATUS_LABELS = {
  new:               'Received',
  queued:            'Queued for printing',
  quoted:            'Quote sent',
  confirmed:         'Confirmed',
  printing:          'Printing now',
  printed:           'Print complete',
  'post-processing': 'Finishing',
  qc:                'Quality check',
  packed:            'Packed & ready',
  shipped:           'Shipped',
  delivered:         'Delivered',
  paid:              'Complete',
  cancelled:         'Cancelled',
};

// GET /api/portal/order/:order_number — JSON lookup (used by the HTML page via fetch)
router.get('/order/:order_number', (req, res) => {
  const db = getDb();
  // Strip leading # and whitespace, try matching with and without #
  const raw = req.params.order_number.replace(/^#+/, '').trim();
  const order = db.prepare(`
    SELECT order_number, customer_name, description, status,
           due_date, tracking_number, carrier, notes, created_at, updated_at
    FROM orders
    WHERE UPPER(REPLACE(order_number, '#', '')) = UPPER(?)
    ORDER BY id DESC LIMIT 1
  `).get(raw);

  if (!order) return res.status(404).json({ error: 'Order not found. Check your order number and try again.' });

  res.json({
    order_number:    order.order_number,
    status:          order.status,
    status_label:    STATUS_LABELS[order.status] || order.status,
    description:     order.description,
    due_date:        order.due_date,
    tracking_number: order.tracking_number,
    carrier:         order.carrier,
    created_at:      order.created_at,
    updated_at:      order.updated_at,
    notes:           order.notes || null,
  });
});

// GET /api/portal/config — business branding (used by HTML page)
router.get('/config', (req, res) => {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'company_config'").get();
    if (row?.value) {
      const cfg = JSON.parse(row.value);
      return res.json({ name: cfg.name || 'PrintFlow', email: cfg.email || null, phone: cfg.phone || null });
    }
  } catch {}
  res.json({ name: 'PrintFlow', email: null, phone: null });
});

module.exports = router;
