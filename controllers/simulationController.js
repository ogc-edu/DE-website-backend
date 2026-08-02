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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 0;
    const status = req.query.status;

    const result = await simulations.getSimulation(userId, { page, limit, status });
    res.status(200).json(result);
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
    const simulationId = req.params.simulationId;
    const userId = req.userId;
    const cancelledSimulationId = await simulations.cancelSimulation(
      userId,
      simulationId
    );
    if (!cancelledSimulationId) {
      throw new Error("Simulation cancel failed");
    }
    res.status(200).json({
      message: "Simulation cancelled successfully",
      cancelledSimulationId,
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

const getSimulationResults = async (req, res, next) => {
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
    res.status(200).json({
      simulationId: simulation._id,
      status: simulation.status,
      totalModels: simulation.totalModels,
      completedModels: simulation.completedModels,
      progress: simulation.progress,
      simulationData: simulation.simulationData,
    });
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
  getSimulationResults,
};
