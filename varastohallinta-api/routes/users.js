const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 
const { authenticateToken } = require('../middleware/auth');

// Hae kaikki käyttäjät
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Virhe GET /api/users:', err); 
    res.status(500).json({ error: err.message });
  }
});

// Luo uusi käyttäjä
router.post('/', async (req, res) => {
  const { login, email, password, fname, lname, phone } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (login, email, password, fname, lname, phone) VALUES (?, ?, ?, ?, ?, ?)', 
      [login, email, hashedPassword, fname, lname, phone]
    );
    res.status(201).json({ userid: result.insertId, login, email, fname, lname, phone });
  } catch (err) {
    console.error('Virhe POST /api/users:', err); 
    res.status(500).json({ error: err.message });
  }
});

// Kirjautumisroutti
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE login = ?', [login]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Väärä käyttäjätunnus tai salasana' });
    }
    const user = rows[0];
    if (user.active === 'no') {
      return res.status(403).json({ error: 'Käyttäjätili on deaktivoitu' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Väärä käyttäjätunnus tai salasana' });
    }
    // Luo JWT-token
    const token = jwt.sign(
      { userid: user.userid, login: user.login },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ 
      token, 
      user: { 
        userId: user.userId, 
        login: user.login, 
        email: user.email, 
        fname: user.fname, 
        lname: user.lname,
        role: user.role
      } 
    });
  } catch (err) {
    console.error('Virhe POST /api/users/login:', err);
    res.status(500).json({ error: err.message });
  }
});

// Päivitä käyttäjän rooli
router.put('/:id/role', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!role) {
    return res.status(400).json({ error: 'Rooli puuttuu' });
  }
  try {
    const [result] = await db.query(
      'UPDATE users SET role = ? WHERE userid = ?',
      [role, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Käyttäjää ei löytynyt' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Virhe PUT /api/users/:id/role:', err);
    res.status(500).json({ error: err.message });
  }
});

// Deaktivoi käyttäjä
router.put('/:id/deactivate', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "UPDATE users SET active='no' WHERE userId=?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Käyttäjää ei löytynyt' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Virhe PUT /api/users/:id/deactivate:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;