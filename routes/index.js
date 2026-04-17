const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const { register } = require("../controllers/registerController");
const simulationRoutes = require("./simulationRoutes");
const authMiddleware = require("../middleware/authMiddleware");

// Health check route
router.get("/health", healthCheck); //use to check server status

// Protect all routes below this point
router.use("/simulation", authMiddleware, simulationRoutes);

// Auth routes (login, register), no auth middleware
router.use("/", authRoutes);

// Redirect homepage to /simulation or protect / if it exists
router.get("/", authMiddleware, (req, res) => {
  res.redirect("/api/simulation/get"); // Or wherever the default simulation page is
});

module.exports = router;
