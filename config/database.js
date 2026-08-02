const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DB_NAME || "Dashboard-Database";
    await mongoose.connect(mongoURI, { dbName });
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Database connection error:", error);
    process.exit(1);
  }
};

const closeDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  }
};

module.exports = {
  connectDB,
  closeDB,
};
