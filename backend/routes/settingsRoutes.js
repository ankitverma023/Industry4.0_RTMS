const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: System settings management
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get all system settings
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Key-value pairs of settings
 */
router.get('/', (req, res) => {
  db.all("SELECT * FROM settings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Convert array of {key, value} to object
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    res.json(settings);
  });
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update a system setting
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Setting updated successfully
 */
router.put('/', (req, res) => {
  const { key, value } = req.body;
  
  if (!key || value === undefined) {
    return res.status(400).json({ error: 'Missing key or value' });
  }

  // Upsert pattern
  db.run("UPDATE settings SET value = ? WHERE key = ?", [String(value), key], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    
    if (this.changes === 0) {
      // It didn't exist, insert it
      db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, String(value)], function(err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });
});

module.exports = router;
