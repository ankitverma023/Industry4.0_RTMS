const express = require('express');
const router = express.Router();
const db = require('../database/db');

/**
 * @swagger
 * tags:
 *   name: Production
 *   description: Production work order management
 */

/**
 * @swagger
 * /api/production/work-orders:
 *   get:
 *     summary: Retrieve a list of all work orders
 *     tags: [Production]
 *     responses:
 *       200:
 *         description: A list of work orders
 */
router.get('/work-orders', (req, res) => {
  db.all("SELECT * FROM work_orders ORDER BY created_at ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

/**
 * @swagger
 * /api/production/dispatch:
 *   post:
 *     summary: Dispatch a new work order
 *     tags: [Production]
 *     responses:
 *       200:
 *         description: Work order dispatched successfully
 */
router.post('/dispatch', (req, res) => {
  const { machine_id, recipe, target } = req.body;
  if (!machine_id || !recipe || !target) return res.status(400).json({ error: 'Missing fields' });

  // Make sure it doesn't collide with a currently running job (optional, let's just queue it)
  db.get("SELECT COUNT(*) as count FROM work_orders WHERE machine_id = ? AND status = 'running'", [machine_id], (err, row) => {
    const status = (row && row.count > 0) ? 'queued' : 'running';
    
    db.run(
      `INSERT INTO work_orders (machine_id, recipe, target, status) VALUES (?, ?, ?, ?)`,
      [machine_id, recipe, target, status],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, machine_id, recipe, target, status });
      }
    );
  });
});

/**
 * @swagger
 * /api/production/speed/{id}:
 *   put:
 *     summary: Override machine operating speed
 *     tags: [Production]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Speed updated successfully
 */
router.put('/speed/:id', (req, res) => {
  const { speed } = req.body;
  const { id } = req.params;
  
  db.run("UPDATE work_orders SET speed = ? WHERE id = ?", [speed, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

/**
 * @swagger
 * /api/production/status/{id}:
 *   put:
 *     summary: Update work order status
 *     tags: [Production]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Status updated successfully
 */
router.put('/status/:id', (req, res) => {
  const { status } = req.body; // 'paused', 'running', 'completed', 'aborted'
  const { id } = req.params;
  
  db.run("UPDATE work_orders SET status = ? WHERE id = ?", [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const { forceRefreshMachines } = require('../simulationEngine');

/**
 * @swagger
 * /api/production/machine-override:
 *   post:
 *     summary: Override Machine Status
 *     tags: [Production]
 *     responses:
 *       200:
 *         description: Machine status updated successfully
 */
router.post('/machine-override', (req, res) => {
  const { machine_id, status } = req.body; // 'Running', 'Paused', 'Fault'
  db.run("UPDATE machines SET status = ? WHERE machine_id = ?", [status, machine_id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (forceRefreshMachines) forceRefreshMachines();
    res.json({ success: true });
  });
});

module.exports = router;
