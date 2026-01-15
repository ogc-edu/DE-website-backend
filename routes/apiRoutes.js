const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const { register } = require("../controllers/registerController");
// Health check route
router.get("/health", healthCheck);

//register route
router.post("/register", register);

// Auth routes (mounted at root to match /api/login structure)
router.use("/", authRoutes);
module.exports = router;
