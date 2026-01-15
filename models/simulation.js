const mongoose = require("mongoose");

const simulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User", //reference to User model, used for populate
  },
  simulationData: {
    //update later
    type: [], //mixed data type array of objects
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: null,
  },
  status: {
    //status for completion
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
  },
  functions: {
    type: [Number], //1 to 10 map func1 to func10
    required: true,
  },
  methods: {
    crossover: {
      type: [String],
      required: true,
    },
    mutation: {
      type: [String],
      required: true,
    },
    selection: {
      type: [String],
      required: true,
    },
  },
});

simulationSchema.statics.createSimulation = async function (
  userId,
  functions,
  methods
) {
  const simulation = await this.create({ userId, functions, methods });
  return simulation;
};

//return all simulations for user simulation page
simulationSchema.statics.getSimulation = async function (userId) {
  const simulation = await this.find({ userId }); //need to format what to return
  return simulation;
};

//return single simulatino for simulation specific functionality
simulationSchema.statics.getSimulationById = async function (id) {
  const simulation = await this.findById(id);
  return simulation;
};

simulationSchema.statics.deleteSimulation = async function (
  userId,
  simulationId
) {
  const simulation = await this.getSimulationById(simulationId);
  if (!simulation) {
    throw new Error("Simulation not found");
  }
  if (simulation.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  const deletedSimulation = await this.findByIdAndDelete(simulationId);
  if (!deletedSimulation) {
    throw new Error("Simulation not found or already deleted");
  }

  return deletedSimulation._id.toString();
};

//cancel simulation
simulationSchema.statics.cancelSimulation = async function (
  userId,
  simulationId
) {
  const simulation = await this.findById(simulationId);
  if (!simulation) {
    throw new Error("Simulation not found");
  }
  if (simulation.userId.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  const success = await this.findByIdAndUpdate(simulationId, {
    status: "cancelled",
  });
  if (!success) {
    throw new Error("Simulation cancel failed");
  }
  return success._id.toString();
};

module.exports = mongoose.model("simulations", simulationSchema);
