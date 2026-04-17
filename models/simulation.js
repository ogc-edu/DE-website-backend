const mongoose = require("mongoose");
//schema definition
//basic datatypes = String, Number, Boolean, Date

//validator function to validate if all numbers are integer
const isIntegerArray = (arr) => arr.length > 0 && arr.every(Number.isInteger);

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
    required: true,
  },
  updatedAt: {
    type: Date,
    default: null,
    required: true,
  },
  status: {
    //status for simulation, pending, completed, failed, cancelled
    type: String,
    enum: {
        values: ["pending", "completed", "failed", "cancelled"],
        message: 'Status must be either pending, completed, failed, or cancelled',
    },
    default: "pending",
    required: true,
  },
  functions: {
    type: [Number], //1 to 10 map func1 to func10
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
    selection: {    //
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
  progress: {   //show progress of simulation, 0 - 100%
    type: Number,
    default: 0,
    max: 100,
    min: 0,
  },
});




simulationSchema.statics.createSimulation = async function (
  userId,
  functions,
  methods
) {
  return await this.create({userId, functions, methods});
};

//return all simulations for user simulation page
simulationSchema.statics.getSimulation = async function (userId) {
  //need to format what to return
  return await this.find({userId});
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
  const success = await this.findByIdAndUpdate(simulationId, {
    status: "cancelled",
  });
  if (!success) {
    throw new Error("Simulation cancel failed");
  }
  return success._id.toString();
};

module.exports = mongoose.model("simulations", simulationSchema);
