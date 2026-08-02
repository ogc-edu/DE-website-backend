require("dotenv").config();
const app = require("./app");
const { connectDB, closeDB } = require("./config/database");
const logger = require("./config/logger");

const port = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  await closeDB();
  process.exit(0);
});

startServer();


