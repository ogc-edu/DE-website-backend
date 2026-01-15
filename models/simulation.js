const mongoose = require("mongoose");

const simulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',  //reference to User model, used for populate
  },
  simulationData: {   //update later
    type: [],  //mixed data type array of objects
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
  status:{ //status for completion 
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  functions: {
    type: [Number], //1 to 10 map func1 to func10
    required: true
  },
  methods: {
    crossover: {
      type: [String],
      required: true
    },
    mutation: {
      type: [String],
      required: true
    },
    selection: {
      type: [String],
      required: true
    }
  }
})

simulationSchema.methods.createSimulation = async function(){
  

}

module.exports = mongoose.model('Simulation', simulationSchema);