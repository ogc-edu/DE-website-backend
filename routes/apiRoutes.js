const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const { register } = require("../controllers/registerController");
const simulationRoutes = require("./simulationRoutes");

// Health check route
router.get("/health", healthCheck);

//register route
router.post("/register", register);

//simulation routes
router.use("/simulation", simulationRoutes);

// Auth routes (mounted at root to match /api/login structure)
router.use("/", authRoutes);
module.exports = router;
