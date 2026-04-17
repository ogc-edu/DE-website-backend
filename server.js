require("dotenv").config();
const express = require("express");
const { connectDB } = require("./config/database");
const routes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: true, //allow all origins in development
    credentials: true, //trust cookies from browser/frontend
  })
);

//Routes, start with /api, like /api/simulations
app.use("/api", routes);

// Redirect top-level homepage to /api
app.get("/", (req, res) => {
  res.redirect("/api");
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(port, () => {
      console.log(`🚀 Server is running on port ${port}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");
  const { closeDB } = require("./config/database");
  await closeDB();
  process.exit(0);
});

startServer();

