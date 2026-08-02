const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  toggleSuspendUser,
  getAllSimulations,
  deleteAnySimulation,
  getQueueStatus,
} = require("../controllers/adminController");

/**
 * @openapi
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Admin access required
 */
router.get("/users", getAllUsers);

/**
 * @openapi
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a single user by ID (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/users/:id", getUserById);

/**
 * @openapi
 * /api/v1/admin/users/{id}/suspend:
 *   patch:
 *     summary: Toggle user active/suspended status (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User status toggled
 *       400:
 *         description: Cannot suspend admin
 *       404:
 *         description: User not found
 */
router.patch("/users/:id/suspend", toggleSuspendUser);

/**
 * @openapi
 * /api/v1/admin/simulations:
 *   get:
 *     summary: List all simulations across all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of simulations
 */
router.get("/simulations", getAllSimulations);

/**
 * @openapi
 * /api/v1/admin/simulations/{id}:
 *   delete:
 *     summary: Delete any simulation (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Simulation deleted
 *       404:
 *         description: Simulation not found
 */
router.delete("/simulations/:id", deleteAnySimulation);

/**
 * @openapi
 * /api/v1/admin/queue:
 *   get:
 *     summary: Get SQS queue status (admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue status
 */
router.get("/queue", getQueueStatus);

module.exports = router;
