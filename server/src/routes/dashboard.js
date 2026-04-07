const router = require('express').Router();
const { getDb } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard  — summary metrics for the dashboard page
router.get('/', authenticate, (req, res) => {
  const db = getDb();

  // Revenue MTD = all income transactions this month (historical orders count as real revenue)
  const revenue_mtd = db.prepare(`
    SELECT COALESCE(SUM(amount_cad), 0) as total
    FROM transactions t
    WHERE t.type = 'income'
      AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
  `).get().total;

  const expenses_mtd = db.prepare(`
    SELECT COALESCE(SUM(amount_cad), 0) as total
    FROM transactions
    WHERE type = 'expense' AND strftime('%Y-%m', date) = strftime('%Y-%m', 'now')
  `).get().total;

  // Active orders = live orders not yet paid or cancelled
  const active_orders = db.prepare(`
    SELECT COUNT(*) as n FROM orders
    WHERE status NOT IN ('delivered','paid','cancelled') AND is_historical = 0
  `).get().n;

  const orders_due_today = db.prepare(`
    SELECT COUNT(*) as n FROM orders
    WHERE due_date = date('now')
      AND status NOT IN ('delivered','paid','cancelled','shipped')
      AND is_historical = 0
  `).get().n;

  const low_filament = db.prepare(`
    SELECT COUNT(*) as n FROM filament_spools WHERE remaining_g <= reorder_at_g
  `).get().n;

  const total_filament_kg = db.prepare(`
    SELECT COALESCE(SUM(remaining_g), 0) / 1000.0 as kg FROM filament_spools
  `).get().kg;

  const recent_orders = db.prepare(`
    SELECT o.id, o.order_number, o.customer_name, o.platform, o.description, o.price_cad, o.status, o.due_date
    FROM orders o
    ORDER BY o.created_at DESC LIMIT 8
  `).all();

  const recent_transactions = db.prepare(`
    SELECT t.*, o.order_number
    FROM transactions t
    LEFT JOIN orders o ON t.order_id = o.id
    ORDER BY t.created_at DESC LIMIT 10
  `).all();

  const weekly_revenue = db.prepare(`
    SELECT t.date, SUM(t.amount_cad) as total
    FROM transactions t
    WHERE t.type = 'income'
      AND t.date >= date('now', '-6 days')
    GROUP BY t.date ORDER BY t.date
  `).all();

  const orders_by_status = db.prepare(`
    SELECT status, COUNT(*) as n FROM orders GROUP BY status
  `).all();

  res.json({
    metrics: {
      revenue_mtd: Math.round(revenue_mtd * 100) / 100,
      expenses_mtd: Math.round(expenses_mtd * 100) / 100,
      profit_mtd: Math.round((revenue_mtd - expenses_mtd) * 100) / 100,
      margin_pct: revenue_mtd > 0 ? Math.round(((revenue_mtd - expenses_mtd) / revenue_mtd) * 100) : 0,
      active_orders,
      orders_due_today,
      low_filament,
      total_filament_kg: Math.round(total_filament_kg * 10) / 10,
    },
    recent_orders,
    recent_transactions,
    weekly_revenue,
    orders_by_status,
  });
});

module.exports = router;
