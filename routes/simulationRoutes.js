const express = require("express");
const router = express.Router();
const {
  createSimulation,
  getAllSimulations,
  deleteSimulation,
  cancelSimulation,
  getSingleSimulation,
} = require("../controllers/simulationController");

router.post("/create", createSimulation);
router.get("/get", getAllSimulations);
router.delete("/delete/:simulationId", deleteSimulation);
router.post("/cancel/:simulationId", cancelSimulation);
router.get("/get/:simulationId", getSingleSimulation);

module.exports = router;
