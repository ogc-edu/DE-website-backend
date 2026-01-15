const express = require("express");
const router = express.Router();
const {
  createSimulation,
  getAllSimulations,
  deleteSimulation,
  cancelSimulation,
  getSingleSimulation,
} = require("../controllers/simulationController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/create", authMiddleware, createSimulation);
router.get("/get", authMiddleware, getAllSimulations);
router.delete("/delete/:simulationId", authMiddleware, deleteSimulation);
router.put("/cancel", authMiddleware, cancelSimulation);
router.get("/get/:simulationId", authMiddleware, getSingleSimulation);

module.exports = router;
