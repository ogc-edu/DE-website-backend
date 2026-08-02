const mongoose = require("mongoose");
//schema definition
//basic datatypes = String, Number, Boolean, Date

//validator function to validate if all numbers are integer
const isIntegerArray = (arr) => arr.length > 0 && arr.every(Number.isInteger);

const simulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
    index: true,
  },
  simulationData: {
    type: [
      {
        functionId: { type: Number, required: true },
        mutationId: { type: Number, required: true },
        crossoverId: { type: Number, required: true },
        selectionId: { type: Number, required: true },
        lowestFitness: { type: Number, default: null },
      },
    ],
    default: [],
  },
  status: {
    type: String,
    enum: {
        values: ["pending", "completed", "failed", "cancelled"],
        message: 'Status must be either pending, completed, failed, or cancelled',
    },
    default: "pending",
    required: true,
    index: true,
  },
  functions: {
    type: [Number],
    required: true,
    validate: {
      validator: isIntegerArray,
      message: 'Benchmark functions must be an array of integers',
    },
    min: [1, "Benchmark functions must be between 1 and 10"],
    max: [10, "Benchmark functions must be between 1 and 10"],
  },
  methods: {
    mutation: {
      type: [Number],
      required: true,
      validate: {
        validator: isIntegerArray,
        message: 'Mutation must be an array of integers',
      },
      min: [1, "Mutation must be between 1 and 10"],
      max: [10, "Mutation must be between 1 and 10"],
    },
    crossover: {
      type: [Number],
      validate: {
        validator: isIntegerArray,
        message: 'Crossover must be an array of integers',
      },
      required: true,
      min: [1, "Crossover must be between 1 and 4"],
      max: [4, "Crossover must be between 1 and 4"],
    },
    selection: {
      validate: {
        validator: isIntegerArray,
        message: 'Selection must be an array of integers',
      },
      type: [Number],
      min: [1, "Selection must be between 1 and 2"],
      max: [2, "Selection must be between 1 and 2"],
      required: true,
    },

  },
  totalModels: {
    type: Number,
    required: true,
    default: 0,
  },
  completedModels: {
    type: Number,
    default: 0,
    min: 0,
  },
  progress: {
    type: Number,
    default: 0,
    max: 100,
    min: 0,
  },
}, { timestamps: true });




simulationSchema.statics.createSimulation = async function (
  userId,
  functions,
  methods
) {
  const totalModels =
    functions.length *
    methods.mutation.length *
    methods.crossover.length *
    methods.selection.length;
  return await this.create({ userId, functions, methods, totalModels });
};

//return all simulations for user simulation page
simulationSchema.statics.getSimulation = async function (userId, options = {}) {
  const { page = 1, limit = 0, status } = options;
  const filter = { userId };
  if (status) {
    filter.status = status;
  }

  if (limit > 0) {
    const skip = (page - 1) * limit;
    const [simulations, total] = await Promise.all([
      this.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.countDocuments(filter),
    ]);
    return {
      simulations,
      simulationCount: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  const simulations = await this.find(filter).sort({ createdAt: -1 });
  return {
    simulations,
    simulationCount: simulations.length,
  };
};

//return single simulation for simulation-specific functionality
simulationSchema.statics.getSimulationById = async function (id) {
  return await this.findById(id);
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
  const success = await this.findByIdAndUpdate(
    simulationId,
    { status: "cancelled" },
    { new: true }
  );
  if (!success) {
    throw new Error("Simulation cancel failed");
  }
  return success._id.toString();
};

module.exports = mongoose.model("simulations", simulationSchema);
