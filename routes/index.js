const express = require("express");
const router = express.Router();
const { welcome } = require("../controllers/homeController");
const apiRoutes = require("./apiRoutes");

// Home route
router.get("/", welcome);

// API routes
router.use("/api", apiRoutes);

module.exports = router;
