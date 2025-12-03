const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Apufunktio: laske paino ja tilavuus slotissa
async function getSlotWeightAndVolume(slot_id, excludeProductID = null) {
    let query = `
        SELECT ps.productID, ps.quantity_in_slot, p.weight, p.length_cm, p.width_cm, p.height_cm
        FROM product_slots ps
        JOIN products p ON ps.productID = p.productID
        WHERE ps.slot_id = ?
    `;
    let params = [slot_id];
    if (excludeProductID) {
        query += ' AND ps.productID != ?';
        params.push(excludeProductID);
    }
    const [rows] = await db.query(query, params);

    let totalWeight = 0;
    let totalVolume = 0;
    for (const row of rows) {
        const qty = Number(row.quantity_in_slot) || 0;
        const weight = Number(row.weight) || 0;
        const length = Number(row.length_cm) || 0;
        const width = Number(row.width_cm) || 0;
        const height = Number(row.height_cm) || 0;
        totalWeight += qty * weight;
        totalVolume += qty * ((length * width * height) / 1000000); // cm³ -> m³
    }
    return { totalWeight, totalVolume };
}

// Lisää tuotteita paikkaan ja päivitä slotted_quantity
router.post('/', authenticateToken, async (req, res) => {
    const { productID, slot_id, quantity_in_slot } = req.body;
    if (!productID || !slot_id || !quantity_in_slot) {
        return res.status(400).json({ error: 'Puuttuva tieto' });
    }
    try {
        // Hae tuotteen tiedot
        const [[product]] = await db.query(
            'SELECT quantity, slotted_quantity, weight, length_cm, width_cm, height_cm FROM products WHERE productID = ?',
            [productID]
        );
        if (!product) {
            return res.status(404).json({ error: 'Tuotetta ei löytynyt' });
        }
        const sijoittamattomat = product.quantity - product.slotted_quantity;

        if (quantity_in_slot > sijoittamattomat) {
            return res.status(400).json({ error: 'Yritetään sijoittaa enemmän kuin on sijoittamattomia tuotteita' });
        }

        // Hae slotin rajat
        const [[slot]] = await db.query('SELECT max_weight, max_volume_m3 FROM warehouse_slots WHERE slot_id = ?', [slot_id]);
        if (!slot) {
            return res.status(404).json({ error: 'Varastopaikkaa ei löytynyt' });
        }

        // Hae nykyinen määrä tälle tuotteelle tässä paikassa
        const [[existing]] = await db.query(
            'SELECT * FROM product_slots WHERE productID = ? AND slot_id = ?',
            [productID, slot_id]
        );
        const uusiMaara = (existing ? Number(existing.quantity_in_slot) : 0) + Number(quantity_in_slot);

        // Laske nykyinen paino ja tilavuus slotissa, mutta jätä tämä tuote pois
        const { totalWeight, totalVolume } = await getSlotWeightAndVolume(slot_id, productID);

        // Laske lisättävän tuotteen paino ja tilavuus (koko uusi määrä)
        const addWeight = (Number(product.weight) || 0) * uusiMaara;
        const addVolume = (Number(product.length_cm) || 0) * (Number(product.width_cm) || 0) * (Number(product.height_cm) || 0) / 1000000 * uusiMaara;

        // Tarkista rajat
        if (slot.max_weight && (totalWeight + addWeight) > slot.max_weight) {
            return res.status(400).json({ error: 'Varastopaikan painoraja ylittyy' });
        }
        if (slot.max_volume_m3 && (totalVolume + addVolume) > slot.max_volume_m3) {
            return res.status(400).json({ error: 'Varastopaikan tilavuusraja ylittyy' });
        }

        // Lisää/päivitä product_slots
        if (existing) {
            await db.query(
                'UPDATE product_slots SET quantity_in_slot = ? WHERE id = ?',
                [uusiMaara, existing.id]
            );
        } else {
            await db.query(
                'INSERT INTO product_slots (productID, slot_id, quantity_in_slot) VALUES (?, ?, ?)',
                [productID, slot_id, quantity_in_slot]
            );
        }
        await db.query(
            'UPDATE products SET slotted_quantity = slotted_quantity + ? WHERE productID = ?',
            [quantity_in_slot, productID]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SIIRTO: huomioi paino- ja tilavuusrajat uudessa paikassa
router.post('/move', authenticateToken, async (req, res) => {
    const { productID, fromSlotId, toSlotId, qty } = req.body;
    if (!productID || !fromSlotId || !toSlotId || !qty) {
        return res.status(400).json({ error: 'Puuttuva tieto' });
    }
    try {
        // Hae tuotteen tiedot
        const [[product]] = await db.query(
            'SELECT weight, length_cm, width_cm, height_cm FROM products WHERE productID = ?',
            [productID]
        );
        if (!product) {
            return res.status(404).json({ error: 'Tuotetta ei löytynyt' });
        }

        // Hae uuden slotin rajat
        const [[slot]] = await db.query('SELECT max_weight, max_volume_m3 FROM warehouse_slots WHERE slot_id = ?', [toSlotId]);
        if (!slot) {
            return res.status(404).json({ error: 'Varastopaikkaa ei löytynyt' });
        }

        // Hae nykyinen määrä tälle tuotteelle uudessa paikassa
        const [[existing]] = await db.query(
            'SELECT * FROM product_slots WHERE productID = ? AND slot_id = ?',
            [productID, toSlotId]
        );
        const uusiMaara = (existing ? Number(existing.quantity_in_slot) : 0) + Number(qty);

        // Laske nykyinen paino ja tilavuus uudessa slotissa, mutta jätä tämä tuote pois
        const { totalWeight, totalVolume } = await getSlotWeightAndVolume(toSlotId, productID);

        // Laske lisättävän tuotteen paino ja tilavuus (koko uusi määrä)
        const addWeight = (Number(product.weight) || 0) * uusiMaara;
        const addVolume = (Number(product.length_cm) || 0) * (Number(product.width_cm) || 0) * (Number(product.height_cm) || 0) / 1000000 * uusiMaara;

        // Tarkista rajat
        if (slot.max_weight && (totalWeight + addWeight) > slot.max_weight) {
            return res.status(400).json({ error: 'Varastopaikan painoraja ylittyy' });
        }
        if (slot.max_volume_m3 && (totalVolume + addVolume) > slot.max_volume_m3) {
            return res.status(400).json({ error: 'Varastopaikan tilavuusraja ylittyy' });
        }

        // Vähennä vanhasta paikasta
        const [[fromRow]] = await db.query(
            'SELECT * FROM product_slots WHERE productID = ? AND slot_id = ?',
            [productID, fromSlotId]
        );
        if (!fromRow || fromRow.quantity_in_slot < qty) {
            return res.status(400).json({ error: 'Ei tarpeeksi tuotetta siirrettäväksi' });
        }
        const uusiMaaraFrom = fromRow.quantity_in_slot - qty;
        if (uusiMaaraFrom > 0) {
            await db.query(
                'UPDATE product_slots SET quantity_in_slot = ? WHERE id = ?',
                [uusiMaaraFrom, fromRow.id]
            );
        } else {
            await db.query(
                'DELETE FROM product_slots WHERE id = ?',
                [fromRow.id]
            );
        }

        // Lisää/uudelle paikalle
        if (existing) {
            await db.query(
                'UPDATE product_slots SET quantity_in_slot = ? WHERE id = ?',
                [uusiMaara, existing.id]
            );
        } else {
            await db.query(
                'INSERT INTO product_slots (productID, slot_id, quantity_in_slot) VALUES (?, ?, ?)',
                [productID, toSlotId, qty]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Hae kaikki product_slots + tuotteiden tiedot
router.get('/with-products', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT ps.*, 
                   p.productname, p.productnumber, p.weight, p.length_cm, p.width_cm, p.height_cm, p.batch_number
            FROM product_slots ps
            JOIN products p ON ps.productID = p.productID
        `);
        res.json(rows);
    } catch (err) {
        console.error('Virhe /api/product_slots/with-products:', err);
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;