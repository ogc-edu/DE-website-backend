const simulations = require("../models/simulation");

const createSimulation = async (req, res, next) => {
  try {
    const { functions, methods } = req.body;
    const userId = req.userId;
    const simulation = await simulations.createSimulation(
      userId,
      functions,
      methods
    );
    res.status(201).json({
      message: "Simulation created successfully",
      simulationId: simulation._id.toString(),
    });
  } catch (err) {
    next(err);
  }
};

const getAllSimulations = async (req, res, next) => {
  try {
    const userId = req.userId;
    const simulation = await simulations.getSimulation(userId);
    const simulationCount = simulation.length;
    res.status(200).json({ simulationCount, simulation });
  } catch (err) {
    next(err);
  }
};

const deleteSimulation = async (req, res, next) => {
  try {
    const simulationId = req.params.simulationId;
    const userId = req.userId;
    const deletedSimulationId = await simulations.deleteSimulation(
      userId,
      simulationId
    );
    if (!deletedSimulationId) {
      throw new Error("Simulation delete failed");
    }
    res.status(200).json({
      message: "Simulation deleted successfully",
      simulationId: deletedSimulationId,
    });
  } catch (err) {
    next(err);
  }
};

const cancelSimulation = async (req, res, next) => {
  try {
    const { simulationId } = req.body;
    const userId = req.userId;
    const simulation = await simulations.getSimulationById(simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }
    if (simulation.userId.toString() !== userId) {
      throw new Error("user id not authorized to cancel this simulation");
    }
    const deletedSimulationId = await simulations.cancelSimulation(
      userId,
      simulationId
    );
    if (!deletedSimulationId) {
      throw new Error("Simulation cancel failed");
    }
    res.status(200).json({
      message: "Simulation cancelled successfully",
      deletedSimulationId,
    });
  } catch (err) {
    next(err);
  }
};

const getSingleSimulation = async (req, res, next) => {
  try {
    const simulationId = req.params.simulationId;
    const userId = req.userId;
    const simulation = await simulations.getSimulationById(simulationId);
    if (!simulation) {
      throw new Error("Simulation not found");
    }
    if (simulation.userId.toString() !== userId) {
      throw new Error("user id not authorized to access this simulation");
    }
    res.status(200).json({ simulation });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSimulation,
  getAllSimulations,
  deleteSimulation,
  cancelSimulation,
  getSingleSimulation,
};
