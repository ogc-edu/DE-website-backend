const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");
const authRoutes = require("./authRoutes");

// Health check route
router.get("/health", healthCheck);

// Auth routes (mounted at root to match /api/login structure)
router.use("/", authRoutes);

module.exports = router;
