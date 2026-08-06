const express = require('express');
const router = express.Router();
const machineController = require('../controllers/machineController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Machines
 *   description: Machine management API
 */

/**
 * @swagger
 * /api/machines:
 *   get:
 *     summary: Retrieve a list of all machines
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of machines
 */
router.get('/', authMiddleware, machineController.getMachines);

// Only admins can add or delete machines
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Forbidden: Admins only' });
  }
};

/**
 * @swagger
 * /api/machines:
 *   post:
 *     summary: Add a new machine (Admin only)
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Machine added successfully
 */
router.post('/', authMiddleware, adminOnly, machineController.addMachine);

/**
 * @swagger
 * /api/machines/{id}:
 *   put:
 *     summary: Update an existing machine (Admin only)
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Machine updated successfully
 */
router.put('/:id', authMiddleware, adminOnly, machineController.updateMachine);

/**
 * @swagger
 * /api/machines/{id}:
 *   delete:
 *     summary: Delete a machine (Admin only)
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Machine deleted successfully
 */
router.delete('/:id', authMiddleware, adminOnly, machineController.deleteMachine);

module.exports = router;
