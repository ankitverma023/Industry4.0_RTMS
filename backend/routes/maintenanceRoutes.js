const express = require('express');
const router = express.Router();
const db = require('../database/db');
const verifyToken = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Maintenance
 *   description: Maintenance log tracking
 */

/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     summary: Retrieve a list of all maintenance logs
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of maintenance logs
 */
router.get('/', verifyToken, (req, res) => {
  db.all("SELECT * FROM maintenance_logs ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/maintenance:
 *   post:
 *     summary: Add a new maintenance log
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Log added successfully
 */
router.post('/', verifyToken, (req, res) => {
  const { machine_id, type, technician, parts_replaced, duration_hrs, cost } = req.body;
  
  if (!machine_id || !type || !technician || !duration_hrs || !cost) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const query = `INSERT INTO maintenance_logs (machine_id, type, technician, parts_replaced, duration_hrs, cost) VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(query, [machine_id, type, technician, parts_replaced || 'None', duration_hrs, cost], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Fetch the newly created log
    db.get("SELECT * FROM maintenance_logs WHERE id = ?", [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

module.exports = router;
