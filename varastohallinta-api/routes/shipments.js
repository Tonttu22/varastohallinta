const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Luo uusi lähetys
router.post('/', authenticateToken, async (req, res) => {
  const { created_by_user, type, recipients_name, recipients_address, recipients_phone_number, items, driver_id, delivery_run_id } = req.body;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    let used_delivery_run_id = delivery_run_id;

    if (!used_delivery_run_id) {
      const [delivery_results] = await connection.query(
        'INSERT INTO delivery_runs (driver_id) VALUES (?)',
        [driver_id || null]
      );
      used_delivery_run_id = delivery_results.insertId;
    }

    // Luo uusi lähetys käyttäen käytössä olevaa delivery_run_id:tä
    const [shipmentResult] = await connection.query(
      'INSERT INTO shipments (type, created_by_user, created_at, recipients_name, recipients_address, recipients_phone_number, driver_id, delivery_run_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [type, created_by_user, new Date(), recipients_name, recipients_address, recipients_phone_number, driver_id || null, used_delivery_run_id]
    );
    const shipmentId = shipmentResult.insertId;

    // Lisää rivit shipment_items-tauluun ja vähennä tuotteet kaikista sloteista
    for (const item of items) {
      await connection.query(
        'INSERT INTO shipment_items (shipment_id, product_id, quantity, product_status_before, product_status_after) VALUES (?, ?, ?, ?, ?)',
        [
          shipmentId,
          item.product_id,
          item.quantity,
          item.oldStatus || 'in_stock',
          type === 'outgoing' ? 'departed' : 'arrived'
        ]
      );

      // Vähennä product_slotsista oikea määrä (voi olla useassa slotissa)
      let qtyToRemove = item.quantity;
      // Jos slot_id annettu, vähennä vain siitä slotista
      if (item.slot_id) {
        const [[slotRow]] = await connection.query(
          'SELECT * FROM product_slots WHERE productID = ? AND slot_id = ?',
          [item.product_id, item.slot_id]
        );
        if (!slotRow || slotRow.quantity_in_slot < qtyToRemove) {
          throw new Error(`Tuotetta ${item.product_id} ei löydy tarpeeksi slotista ${item.slot_id}`);
        }
        if (slotRow.quantity_in_slot > qtyToRemove) {
          await connection.query(
            'UPDATE product_slots SET quantity_in_slot = quantity_in_slot - ? WHERE id = ?',
            [qtyToRemove, slotRow.id]
          );
        } else {
          await connection.query(
            'DELETE FROM product_slots WHERE id = ?',
            [slotRow.id]
          );
        }
      } else {
        // Jos slot_id ei annettu, vähennä kaikista sloteista järjestyksessä
        const [slotRows] = await connection.query(
          'SELECT * FROM product_slots WHERE productID = ? ORDER BY quantity_in_slot DESC',
          [item.product_id]
        );
        let totalAvailable = slotRows.reduce((sum, row) => sum + row.quantity_in_slot, 0);
        if (totalAvailable < qtyToRemove) {
          throw new Error(`Tuotetta ${item.product_id} ei löydy tarpeeksi varastosta`);
        }
        for (const slotRow of slotRows) {
          if (qtyToRemove <= 0) break;
          if (slotRow.quantity_in_slot > qtyToRemove) {
            await connection.query(
              'UPDATE product_slots SET quantity_in_slot = quantity_in_slot - ? WHERE id = ?',
              [qtyToRemove, slotRow.id]
            );
            qtyToRemove = 0;
          } else {
            await connection.query(
              'DELETE FROM product_slots WHERE id = ?',
              [slotRow.id]
            );
            qtyToRemove -= slotRow.quantity_in_slot;
          }
        }
      }
    }

    // Päivitä products-taulun statukset mutta ei saapumisaikoja lähteville tuotteille
    const productIds = items.map(i => i.product_id);
    if (productIds.length > 0) {
      await connection.query(
        `UPDATE products 
         SET status = ?, 
             departuretime = ?, 
             last_modified = ?
         WHERE productID IN (${productIds.map(() => '?').join(',')})`,
        [
          type === 'outgoing' ? 'departed' : 'in_stock',
          type === 'outgoing' ? new Date() : null,
          new Date(),
          ...productIds
        ]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, shipment_id: shipmentId, delivery_run_id: used_delivery_run_id });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create shipment' });
  } finally {
    connection.release();
  }
});

// Hae kaikki lähetykset (kuljettajan nimi ja rekisterinumero mukaan)
router.get('/', async (req, res) => {
  try {
    const [shipments] = await db.query(`
      SELECT 
        s.*, 
        CONCAT(u.fname, ' ', u.lname) as created_by,
        d.first_name as driver_first_name, d.last_name as driver_last_name,
        v.vehicle_plate, v.brand, v.model
      FROM shipments s
      JOIN users u ON s.created_by_user = u.userId
      LEFT JOIN delivery_runs dr ON s.delivery_run_id = dr.delivery_id
      LEFT JOIN drivers d ON dr.driver_id = d.driver_id
      LEFT JOIN vehicles v ON dr.vehicle_id = v.vehicle_id
      ORDER BY s.shipment_id DESC
    `);
    res.json(shipments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// Päivitä lähetyksen status
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    if (status === 'failed') {
      // Hae kaikki tuotteet ja määrät tässä lähetyksessä
      const [items] = await db.query(`
        SELECT p.productname, si.quantity
        FROM shipment_items si
        JOIN products p ON si.product_id = p.productID
        WHERE si.shipment_id = ?
      `, [id]);
      // Muodosta pilkulla erotettu lista: Tuote (kpl)
      const notes = items.map(i => `${i.productname} (${i.quantity} kpl)`).join(', ');
      // Päivitä status ja notes
      await db.query(
        'UPDATE shipments SET status = ? WHERE shipment_id = ?',
        [status, id]
      );
      // Palauta tuotteet varastoon takaisin
      for (const item of items) {
        await db.query(
          'UPDATE products SET slotted_quantity = slotted_quantity - ? WHERE productname = ?',
          [item.quantity, item.productname]
        );
      }
    } else {
      // Päivitä vain status
      await db.query('UPDATE shipments SET status = ? WHERE shipment_id = ?', [status, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Statuspäivitys epäonnistui' });
  }
});

// Hae yksittäinen lähetys ja sen tuotteet + kuljettajan tiedot
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [shipmentRows] = await db.query(`
      SELECT 
        s.*, 
        d.first_name, d.last_name, d.phone_number, d.company,
        v.vehicle_plate, v.brand, v.model
      FROM shipments s
      LEFT JOIN delivery_runs dr ON s.delivery_run_id = dr.delivery_id
      LEFT JOIN drivers d ON dr.driver_id = d.driver_id
      LEFT JOIN vehicles v ON dr.vehicle_id = v.vehicle_id
      WHERE s.shipment_id = ?
    `, [id]);
    const shipment = shipmentRows[0];
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    const [items] = await db.query(`
      SELECT shipment_items.*, 
             products.productname, products.productnumber,
             products.weight, products.length_cm, products.width_cm, products.height_cm
      FROM shipment_items
      JOIN products ON shipment_items.product_id = products.productID
      WHERE shipment_id = ?
    `, [id]);
    res.json({ ...shipment, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

module.exports = router;