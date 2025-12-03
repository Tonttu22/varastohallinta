const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM warehouse_slots');
    res.json(rows);
  } catch (err) {
    console.error('Virhe GET /api/users:', err); 
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { slot_code, location_description, max_weight, max_volume_m3 } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO warehouse_slots (slot_code, location_description, max_weight, max_volume_m3) VALUES (?, ?, ?, ?)',
      [slot_code, location_description, max_weight, max_volume_m3]
    );
    res.status(201).json({
      slot_id: result.insertId,
      slot_code,
      location_description,
      max_weight,
      max_volume_m3
    });
  } catch (err) {
    console.error('Virhe POST /api/warehouseslots:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM warehouse_slots WHERE slot_id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Varastopaikkaa ei löytynyt' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Virhe DELETE /api/users/:id:', err); 
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { slot_code, location_description, max_weight, max_volume_m3 } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE warehouse_slots SET slot_code = ?, location_description = ?, max_weight = ?, max_volume_m3 = ? WHERE slot_id = ?',
      [slot_code, location_description, max_weight, max_volume_m3, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Varastopaikkaa ei löytynyt' });
    }
    // Hae päivitetty rivi kannasta
    const [rows] = await db.query('SELECT * FROM warehouse_slots WHERE slot_id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Virhe PUT /api/warehouseslots/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;