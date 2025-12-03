const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

// Rekisteröinti
router.post('/', async (req, res) => {
  const { fname, lname, email, password, login, phone } = req.body;
  if (!fname || !lname || !email || !password || !login || !phone) {
    return res.status(400).json({ error: 'Kaikki kentät ovat pakollisia' });
  }
  try {
    // Tarkista onko käyttäjätunnus tai sähköposti jo käytössä
    const [existing] = await db.query(
      'SELECT userId FROM users WHERE login = ? OR email = ?',
      [login, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Käyttäjätunnus tai sähköposti on jo käytössä' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (login, email, password, fname, lname, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [login, email, hashedPassword, fname, lname, 'newuser', phone]
    );
    res.status(201).json({ id: result.insertId, login, email, fname, lname, role: 'newuser', phone });
  } catch (err) {
    console.error('Virhe POST /api/register:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;