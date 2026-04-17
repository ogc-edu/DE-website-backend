const mongoose = require("mongoose");
const chalk = require("chalk");

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.DB_NAME || "Dashboard-Database";
    await mongoose.connect(mongoURI, { dbName });
    console.log(chalk.green.bold("Database connected successfully"));
  } catch (error) {
    console.error(chalk.red.bgWhite("31mDatabase connection error:"), error);
    process.exit(1);
  }
};

const closeDB = async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
};

module.exports = {
  connectDB,
  closeDB,
};
