const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Kuukausittaiset lähetykset
router.get('/monthly', async (req, res) => {
  const months = Number(req.query.months) || 6;
  const sql = `
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
    FROM shipments
    WHERE type = 'outgoing' AND created_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
    GROUP BY month
    ORDER BY month
  `;
  const [rows] = await db.execute(sql, [months]);
  res.json(rows);
});

// Lähetykset aikavälillä, joustava ryhmittely
router.get('/summary', async (req, res) => {
  try {
    const { start, end, groupBy = 'month', type } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(created_at)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(created_at, 3)";
    else dateExpr = "DATE_FORMAT(created_at, '%Y-%m')";

    const conditions = [];
    const params = [];

    if (type) { conditions.push("type=?"); params.push(type); }
    if (start) { conditions.push("created_at >= ?"); params.push(start); }
    if (end) { conditions.push("created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }

    const whereClause = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const sql = `
      SELECT ${dateExpr} AS period, COUNT(*) AS count
      FROM shipments
      ${whereClause}
      GROUP BY ${dateExpr}
      ORDER BY ${dateExpr};
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shipment summary' });
  }
});

// Varaston statusjakauma
router.get('/product-status', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT status, COUNT(*) AS count
      FROM products
      GROUP BY status
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product status stats' });
  }
});

// Top liikkuneet tuotteet
router.get('/top-products', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.productname, SUM(si.quantity) AS total_sent
      FROM shipment_items si
      JOIN products p ON si.product_id = p.productID
      GROUP BY p.productID
      ORDER BY total_sent DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// Lähetykset käyttäjittäin
router.get('/shipments-by-user', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.userId, CONCAT(u.fname, ' ', u.lname) AS name, u.email, u.role, COUNT(s.shipment_id) AS total_shipments
      FROM shipments s
      JOIN users u ON s.created_by_user = u.userId
      GROUP BY u.userId
      ORDER BY total_shipments DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipments by user' });
  }
});

// Varastopaikkojen täyttöaste
router.get('/slot-fill', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ws.slot_code,
        ws.max_volume_m3,
        ws.max_weight,
        IFNULL(SUM(ps.quantity_in_slot * (p.length_cm * p.width_cm * p.height_cm / 1e6)), 0) AS used_volume_m3,
        IFNULL(SUM(ps.quantity_in_slot * p.weight), 0) AS used_weight,
        ROUND((IFNULL(SUM(ps.quantity_in_slot * (p.length_cm * p.width_cm * p.height_cm / 1e6)), 0) / ws.max_volume_m3) * 100, 1) AS volume_fill_percent,
        ROUND((IFNULL(SUM(ps.quantity_in_slot * p.weight), 0) / ws.max_weight) * 100, 1) AS weight_fill_percent
      FROM warehouse_slots ws
      LEFT JOIN product_slots ps ON ws.slot_id = ps.slot_id
      LEFT JOIN products p ON ps.productID = p.productID
      GROUP BY ws.slot_id
      ORDER BY ws.slot_code;
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch slot fill data' });
  }
});

// Saapuneet tuotteet aikavälillä
router.get('/arrivals', async (req, res) => {
  try {
    const { groupBy = 'month', start, end } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(arrivaltime)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(arrivaltime, 3)";
    else dateExpr = "DATE_FORMAT(arrivaltime, '%Y-%m')";

    const conditions = ["arrivaltime IS NOT NULL"];
    const params = [];

    if (start) { conditions.push("arrivaltime >= ?"); params.push(start); }
    if (end) { conditions.push("arrivaltime < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT ${dateExpr} AS period, COUNT(*) AS count
      FROM products
      ${whereClause}
      GROUP BY ${dateExpr}
      ORDER BY ${dateExpr};
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch arrival stats' });
  }
});

// Saapuneet tuotteet määrä / saapuneet lähetykset
router.get('/arrived-quantities', async (req, res) => {
  try {
    const { start, end, groupBy = 'month', metric = 'products' } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(arrivaltime)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(arrivaltime, 3)";
    else dateExpr = "DATE_FORMAT(arrivaltime, '%Y-%m')";

    let selectMetric;
    if (metric === 'weight') {
      selectMetric = 'SUM(quantity * weight) AS value';
    } else if (metric === 'volume') {
      selectMetric = 'SUM(quantity * (length_cm * width_cm * height_cm) / 1e6) AS value';
    } else if (metric === 'count') {
      selectMetric = 'COUNT(*) AS value'; // Saapuneiden lähetyksien määrä
    } else {
      selectMetric = 'SUM(quantity) AS value';
    }

    const conditions = ["arrivaltime IS NOT NULL"];
    const params = [];
    if (start) { conditions.push("arrivaltime >= ?"); params.push(start); }
    if (end) { conditions.push("arrivaltime < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT ${dateExpr} AS period, ${selectMetric}
      FROM products
      ${whereClause}
      GROUP BY ${dateExpr}
      ORDER BY ${dateExpr};
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch arrived quantities' });
  }
});

// Lähetetyt tuotteet määrä / lähetetyt lähetykset
router.get('/shipped-quantities', async (req, res) => {
  try {
    const { start, end, groupBy = 'month', metric = 'products' } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(s.created_at)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(s.created_at, 3)";
    else dateExpr = "DATE_FORMAT(s.created_at, '%Y-%m')";

    let selectMetric;
    if (metric === 'weight') {
      selectMetric = 'SUM(si.quantity * p.weight) AS value';
    } else if (metric === 'volume') {
      selectMetric = 'SUM(si.quantity * (p.length_cm * p.width_cm * p.height_cm) / 1e6) AS value';
    } else if (metric === 'count') {
      selectMetric = 'COUNT(DISTINCT s.shipment_id) AS value'; // Lähetettyjen lähetyksien määrä
    } else {
      selectMetric = 'SUM(si.quantity) AS value';
    }

    const conditions = ["s.type = 'outgoing'"];
    const params = [];
    if (start) { conditions.push("s.created_at >= ?"); params.push(start); }
    if (end) { conditions.push("s.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT ${dateExpr} AS period, ${selectMetric}
      FROM shipments s
      LEFT JOIN shipment_items si ON s.shipment_id = si.shipment_id
      LEFT JOIN products p ON si.product_id = p.productID
      ${whereClause}
      GROUP BY ${dateExpr}
      ORDER BY ${dateExpr};
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shipped quantities' });
  }
});

// Top tuotteet per aikajakso (päivä/viikko/kuukausi)
router.get('/top-products-by-period', async (req, res) => {
  try {
    const { start, end, groupBy = 'month' } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(s.created_at)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(s.created_at, 3)";
    else dateExpr = "DATE_FORMAT(s.created_at, '%Y-%m')";

    const conditions = ["s.type = 'outgoing'"];
    const params = [];
    if (start) { conditions.push("s.created_at >= ?"); params.push(start); }
    if (end) { conditions.push("s.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }
    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT ${dateExpr} AS period, p.productID, p.productname, SUM(si.quantity) AS total_sent
      FROM shipments s
      LEFT JOIN shipment_items si ON s.shipment_id = si.shipment_id
      LEFT JOIN products p ON si.product_id = p.productID
      ${whereClause}
      GROUP BY ${dateExpr}, p.productID
      ORDER BY ${dateExpr}, total_sent DESC;
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top products by period' });
  }
});

// Lähetykset käyttäjittäin aikavälillä ja haulla
router.get('/user-shipments', async (req, res) => {
  try {
    const { start, end, search = '' } = req.query;

    const conditions = ["s.type = 'outgoing'"];
    const params = [];

    if (start) { conditions.push("s.created_at >= ?"); params.push(start); }
    if (end) { conditions.push("s.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }

    if (search) {
      conditions.push("(u.fname LIKE ? OR u.lname LIKE ? OR CONCAT(u.fname, ' ', u.lname) LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT 
        u.userId,
        CONCAT(u.fname, ' ', u.lname) AS name,
        u.email,
        u.role,
        COUNT(s.shipment_id) AS total_shipments
      FROM shipments s
      JOIN users u ON s.created_by_user = u.userId
      ${whereClause}
      GROUP BY u.userId
      ORDER BY total_shipments DESC;
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Virhe haettaessa käyttäjien lähetyksiä:', err);
    res.status(500).json({ error: 'Failed to fetch user shipments' });
  }
});

// Lähetykset käyttäjittäin aikavälillä ja aikajaksolla (dynaaminen metriikka)
router.get('/user-shipments-timeline', async (req, res) => {
  try {
    const { start, end, groupBy = 'month', userIds, metric = 'count' } = req.query;

    let dateExpr;
    if (groupBy === 'day') dateExpr = "DATE(s.created_at)";
    else if (groupBy === 'week') dateExpr = "YEARWEEK(s.created_at, 3)";
    else dateExpr = "DATE_FORMAT(s.created_at, '%Y-%m')";

    let selectMetric;
    if (metric === 'products') {
      selectMetric = 'SUM(si.quantity) AS value';
    } else if (metric === 'weight') {
      selectMetric = 'SUM(si.quantity * p.weight) AS value';
    } else if (metric === 'volume') {
      selectMetric = 'SUM(si.quantity * (p.length_cm * p.width_cm * p.height_cm) / 1e6) AS value';
    } else {
      selectMetric = 'COUNT(DISTINCT s.shipment_id) AS value';
    }

    const conditions = ["s.type = 'outgoing'"];
    const params = [];

    if (start) { conditions.push("s.created_at >= ?"); params.push(start); }
    if (end) { conditions.push("s.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }
    if (userIds) {
      const ids = userIds.split(',').map(id => Number(id)).filter(Boolean);
      if (ids.length > 0) {
        conditions.push(`s.created_by_user IN (${ids.map(() => '?').join(',')})`);
        params.push(...ids);
      }
    }

    const whereClause = "WHERE " + conditions.join(" AND ");

    const sql = `
      SELECT ${dateExpr} AS period, s.created_by_user, 
             CONCAT(u.fname, ' ', u.lname) AS user,
             ${selectMetric}
      FROM shipments s
      LEFT JOIN shipment_items si ON s.shipment_id = si.shipment_id
      LEFT JOIN products p ON si.product_id = p.productID
      JOIN users u ON s.created_by_user = u.userId
      ${whereClause}
      GROUP BY ${dateExpr}, s.created_by_user
      ORDER BY ${dateExpr};
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user shipment timeline' });
  }
});

// Top tuotteet tietylle aikajänteelle (start..end)
router.get('/top-products-range', async (req, res) => {
  try {
    const { start, end } = req.query;

    const conditions = ["s.type = 'outgoing'"];
    const params = [];
    if (start) { conditions.push("s.created_at >= ?"); params.push(start); }
    if (end) { conditions.push("s.created_at < DATE_ADD(?, INTERVAL 1 DAY)"); params.push(end); }
    const whereClause = conditions.length ? ("WHERE " + conditions.join(" AND ")) : "";

    const sql = `
      SELECT p.productID, p.productname, SUM(si.quantity) AS total_sent
      FROM shipments s
      LEFT JOIN shipment_items si ON s.shipment_id = si.shipment_id
      LEFT JOIN products p ON si.product_id = p.productID
      ${whereClause}
      GROUP BY p.productID
      ORDER BY total_sent DESC
      LIMIT 5;
    `;
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch top products for range' });
  }
});

module.exports = router;