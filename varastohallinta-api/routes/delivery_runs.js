const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Luo uusi delivery run
router.post('/', authenticateToken, async (req, res) => {
  const { driver_id, vehicle_id } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO delivery_runs (driver_id, vehicle_id) VALUES (?, ?)',
      [driver_id || null, vehicle_id || null]
    );
    res.json({ delivery_run_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create delivery run' });
  }
});

// Hae kaikki delivery runit kuljettaja- ja ajoneuvotiedoilla
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT dr.*, d.first_name AS driver_first_name, d.last_name AS driver_last_name,
             v.vehicle_plate, v.brand, v.model
      FROM delivery_runs dr
      LEFT JOIN drivers d ON dr.driver_id = d.driver_id
      LEFT JOIN vehicles v ON dr.vehicle_id = v.vehicle_id
      ORDER BY dr.delivery_id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch delivery runs' });
  }
});

// Hae yksittäinen delivery run kuljettaja- ja ajoneuvotiedoilla
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Hae kuljetuksen perustiedot + kuljettaja + auto
    const [runRows] = await db.query(`
      SELECT dr.*, d.first_name AS driver_first_name, d.last_name AS driver_last_name,
        v.vehicle_plate, v.brand, v.model
      FROM delivery_runs dr
      LEFT JOIN drivers d ON dr.driver_id = d.driver_id
      LEFT JOIN vehicles v ON dr.vehicle_id = v.vehicle_id
      WHERE dr.delivery_id = ?
    `, [id]);
    if (!runRows.length) return res.status(404).json({ error: 'Kuljetusta ei löytynyt' });
    const run = runRows[0];

    // Hae kaikki lähetykset tähän kuljetukseen
    const [shipments] = await db.query(`
      SELECT s.*, u.fname AS created_by_fname, u.lname AS created_by_lname
      FROM shipments s
      LEFT JOIN users u ON s.created_by_user = u.userId
      WHERE s.delivery_run_id = ?
    `, [id]);

    // Hae tuotteet jokaiseen lähetykseen
    for (const shipment of shipments) {
      const [items] = await db.query(`
        SELECT si.*, p.productname, p.productnumber
        FROM shipment_items si
        JOIN products p ON si.product_id = p.productID
        WHERE si.shipment_id = ?
      `, [shipment.shipment_id]);
      shipment.items = items;
    }

    run.shipments = shipments;
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: 'Kuljetuksen haku epäonnistui' });
  }
});

// Hae shipmentit ja tuotteet tälle delivery_runille
router.get('/:id/shipments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT s.*, si.*, p.productname, p.productnumber
      FROM shipments s
      LEFT JOIN shipment_items si ON s.shipment_id = si.shipment_id
      LEFT JOIN products p ON si.product_id = p.productID
      WHERE s.delivery_run_id = ?
    `, [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch shipments for delivery run' });
  }
});

module.exports = router;
