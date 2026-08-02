const express = require("express");
const router = express.Router();
const { healthCheck } = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const simulationRoutes = require("./simulationRoutes");
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.get("/health", healthCheck);

router.use("/simulation", authMiddleware, simulationRoutes);
router.use("/admin", authMiddleware, adminMiddleware, adminRoutes);
router.use("/user", authMiddleware, userRoutes);

router.use("/", authRoutes);

router.get("/", authMiddleware, (req, res) => {
  res.redirect("/api/v1/simulation/get");
});

module.exports = router;
