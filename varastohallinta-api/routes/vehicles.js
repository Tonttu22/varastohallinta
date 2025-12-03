const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Hae kaikki autot
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehicles WHERE active = 1 ORDER BY vehicle_plate');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Lisää uusi auto
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      vehicle_plate, brand, model, max_weight_kg, max_volume_m3,
      inner_length_cm, inner_width_cm, inner_height_cm, notes
    } = req.body;
    await db.query(
      `INSERT INTO vehicles
      (vehicle_plate, brand, model, max_weight_kg, max_volume_m3, inner_length_cm, inner_width_cm, inner_height_cm, active, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [vehicle_plate, brand, model, max_weight_kg, max_volume_m3, inner_length_cm, inner_width_cm, inner_height_cm, notes]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});


// Poista auto (aseta inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE vehicles SET active = 0 WHERE vehicle_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});


module.exports = router;