const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, changePassword } = require("../controllers/userController");
const validate = require("../middleware/validate");
const { updateProfileSchema, changePasswordSchema } = require("../validators/authValidators");

/**
 * @openapi
 * /api/v1/user/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       404:
 *         description: User not found
 */
router.get("/profile", getProfile);

/**
 * @openapi
 * /api/v1/user/profile:
 *   patch:
 *     summary: Update current user's profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Email already in use
 */
router.patch("/profile", validate(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /api/v1/user/password:
 *   patch:
 *     summary: Change current user's password
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Current password incorrect
 */
router.patch("/password", validate(changePasswordSchema), changePassword);

module.exports = router;
