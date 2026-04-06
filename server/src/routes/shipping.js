'use strict';
const router     = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const { getRates, createShipment } = require('../services/shipping/canadapost');
const { getDb }  = require('../db/connection');
const { audit }  = require('../db/audit');
const { broadcast } = require('../services/socket');
const logger     = require('../services/logger');

// POST /api/shipping/rates — get rate quotes for a parcel
router.post('/rates',
  authenticate,
  authorize('owner', 'manager'),
  body('to_postal').notEmpty(),
  body('weight_kg').isFloat({ min: 0.001 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { to_postal, weight_kg, dimensions } = req.body;
    try {
      const rates = await getRates({ toPostal: to_postal, weightKg: weight_kg, dimensions });
      res.json(rates);
    } catch (err) {
      logger.error('Shipping rates error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/shipping/label — create shipment + label for an order
router.post('/label',
  authenticate,
  authorize('owner', 'manager'),
  body('order_id').isInt(),
  body('weight_kg').isFloat({ min: 0.001 }),
  body('service_code').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const db    = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.body.order_id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { weight_kg, dimensions, service_code, to_address } = req.body;
    try {
      const result = await createShipment({
        order,
        toAddress:   to_address || {},
        weightKg:    weight_kg,
        dimensions,
        serviceCode: service_code,
      });

      // Save tracking number to the order
      db.prepare(`
        UPDATE orders SET tracking_number = ?, carrier = 'Canada Post', status = 'packed', updated_at = ?
        WHERE id = ?
      `).run(result.tracking_number, new Date().toISOString(), order.id);

      // Record shipping expense
      const rates = await getRates({ toPostal: to_address?.postal || 'L4L1A1', weightKg: weight_kg });
      const rate  = rates.find(r => r.service_code === service_code) || rates[0];
      if (rate) {
        db.prepare(`
          INSERT INTO transactions (date, description, category, type, amount_cad, hst_amount, order_id, created_by)
          VALUES (date('now'), ?, 'shipping', 'expense', ?, ?, ?, ?)
        `).run(
          `Shipping label — ${order.order_number} via ${rate.service_name}`,
          rate.price_cad,
          parseFloat((rate.price_cad * 0.13).toFixed(2)),
          order.id,
          req.user.id,
        );
      }

      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
      audit({ userId: req.user.id, userName: req.user.name, action: 'update', tableName: 'orders', recordId: order.id, newValue: { tracking_number: result.tracking_number, carrier: 'Canada Post' } });
      broadcast('order:updated', updated);

      logger.info(`[Shipping] Label created for ${order.order_number}: ${result.tracking_number}`);
      res.json({ ...result, order: updated });
    } catch (err) {
      logger.error('Label creation error:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/shipping — all shipments (orders with tracking numbers)
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const shipments = db.prepare(`
    SELECT id, order_number, customer_name, carrier, tracking_number, status, updated_at, price_cad, shipping_cad
    FROM orders
    WHERE tracking_number IS NOT NULL
    ORDER BY updated_at DESC
    LIMIT 100
  `).all();
  res.json(shipments);
});

// GET /api/shipping/config — check if Canada Post is configured
router.get('/config', authenticate, authorize('owner'), (req, res) => {
  res.json({
    configured: !!(process.env.CANADAPOST_USERNAME && process.env.CANADAPOST_PASSWORD),
    sandbox:    process.env.CANADAPOST_SANDBOX === 'true',
    from_postal: process.env.CANADAPOST_FROM_POSTAL || 'Not set',
  });
});

module.exports = router;
