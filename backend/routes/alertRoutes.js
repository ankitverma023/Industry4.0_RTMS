const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert management API
 */

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Retrieve a list of the latest 50 alerts
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: A list of alerts
 */
router.get('/', authMiddleware, alertController.getAlerts);

/**
 * @swagger
 * /api/alerts/{id}/acknowledge:
 *   post:
 *     summary: Acknowledge a specific alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 */
router.post('/:id/acknowledge', authMiddleware, alertController.acknowledgeAlert);

/**
 * @swagger
 * /api/alerts/{id}/resolve:
 *   post:
 *     summary: Resolve a specific alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 */
router.post('/:id/resolve', authMiddleware, alertController.resolveAlert);

module.exports = router;
