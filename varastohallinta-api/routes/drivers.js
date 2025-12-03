const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Hae kaikki kuljettajat
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM drivers WHERE active = 1 ORDER BY last_name, first_name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Lisää uusi kuljettaja
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { first_name, last_name, phone_number,  company } = req.body;
    const sql = `
      INSERT INTO drivers (first_name, last_name, phone_number, company, active, created_at)
      VALUES (?, ?, ?, ?, 1, NOW())
    `;
    await db.query(sql, [first_name, last_name, phone_number, company]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add driver' });
  }
});



// Poista kuljettaja (aseta inactive)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE drivers SET active = 0 WHERE driver_id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});



module.exports = router;