const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// haetaan kaikki tavarat
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('Virhe GET /api/products:', err);
    res.status(500).json({ error: err.message });
  }
});

// lisätään uusi tuote
router.post('/', authenticateToken, async (req, res) => {
  const { productnumber, productname, weight, length_cm, width_cm, height_cm, batch_number, added_by_user, quantity } = req.body;
  const arrivaltime = new Date(Date.now());
  try {
    const [result] = await db.query(
      'INSERT INTO products (productnumber, productname, arrivaltime, weight, length_cm, width_cm, height_cm, batch_number, added_by_user, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
      [productnumber, productname, arrivaltime, weight, length_cm, width_cm, height_cm, batch_number, added_by_user, quantity]
    );
    res.status(201).json({ id: result.insertId, productnumber, productname, arrivaltime, weight, length_cm, width_cm, height_cm, batch_number, added_by_user, quantity });
  } catch (err) {
    console.error('Virhe POST /api/products:', err);
    res.status(500).json({ error: err.message });
  }
});

// poistetaan tuote idn perusteella
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query('DELETE FROM products WHERE productID = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tuotetta ei löytynyt' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Virhe DELETE /api/products/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk', authenticateToken, async (req, res) => {
  const products = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Ei tuotteita' });
  }
  try {
    const values = products.map(p => [
      p.productnumber,
      p.productname,
      new Date(),
      p.weight,
      p.length_cm,
      p.width_cm,
      p.height_cm,
      p.batch_number,
      p.added_by_user
    ]);
    const [result] = await db.query(
      'INSERT INTO products (productnumber, productname, arrivaltime, weight, length_cm, width_cm, height_cm, batch_number, added_by_user) VALUES ?',
      [values]
    );
    res.status(201).json({ success: true, count: products.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// päivitetään tuotteelle varastopaikka ja tarkistetaan mahtuuko se sinne
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { slot_id } = req.body;
  try {
    if (slot_id) {
      // Hae tuotteen paino ja mitat
      const [[product]] = await db.query(
        'SELECT weight, length_cm, width_cm, height_cm FROM products WHERE productID = ?',
        [id]
      );
      if (!product) {
        return res.status(404).json({ error: 'Tuotetta ei löytynyt' });
      }
      // Lasketaan tilavuus kuutiosenttimetreinä ja muutetaan se kuutiometreiksi
      const productVolumeM3 = ((product.length_cm || 0) * (product.width_cm || 0) * (product.height_cm || 0)) / 1_000_000;

      // Hae varastopaikan maksimirajat (nyt max_volume_m3)
      const [[slot]] = await db.query(
        'SELECT max_weight, max_volume_m3 FROM warehouse_slots WHERE slot_id = ?',
        [slot_id]
      );
      if (!slot) {
        return res.status(404).json({ error: 'Varastopaikkaa ei löytynyt' });
      }

      // Hae kaikki muut tuotteet kyseisessä varastopaikassa
      const [productsInSlot] = await db.query(
        'SELECT weight, length_cm, width_cm, height_cm FROM products WHERE slot_id = ? AND productID != ?',
        [slot_id, id]
      );
      const usedWeight = productsInSlot.reduce((sum, p) => sum + (p.weight || 0), 0);
      const usedVolumeM3 = productsInSlot.reduce(
        (sum, p) => sum + (((p.length_cm || 0) * (p.width_cm || 0) * (p.height_cm || 0)) / 1_000_000),
        0
      );

      // debug tulostukset
      console.log('Tuote:', product);
      console.log('Tuotteen tilavuus (m3):', productVolumeM3);
      console.log('Varastopaikka:', slot);
      console.log('Käytetty paino:', usedWeight, 'Maksimi:', slot.max_weight);
      console.log('Käytetty tilavuus (m3):', usedVolumeM3, 'Maksimi:', slot.max_volume_m3);

      // Tarkista rajat
      if (slot.max_weight !== null && slot.max_weight > 0) {
        if ((usedWeight + (product.weight || 0)) > slot.max_weight) {
          return res.status(400).json({ error: 'Varastopaikan maksimipaino ylittyy' });
        }
      }
      if (slot.max_volume_m3 !== null && slot.max_volume_m3 > 0) {
        if ((usedVolumeM3 + productVolumeM3) > slot.max_volume_m3) {
          return res.status(400).json({ error: 'Varastopaikan maksimikapasiteetti ylittyy' });
        }
      }
    }

    // Päivitä slot_id ja status
    const [result] = await db.query(
      'UPDATE products SET slot_id = ?, status = ? WHERE productID = ?',
      [slot_id, slot_id ? 'in_stock' : 'arrived', id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tuotetta ei löytynyt' });
    }
    // Palauta päivitetty tuote
    const [rows] = await db.query('SELECT * FROM products WHERE productID = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;