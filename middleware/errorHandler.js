const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(`Error name: ${err.name} | Code: ${err.code || "N/A"}`);
  if (err.stack) {
    logger.error(err.stack.split("\n")[1].trim());
  }

  if (err.name === "CastError") {
    const message = `Resource not found with id : ${err.value}`;
    error = { statusCode: 404, message };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value entered for field: ${field}`;
    error = { statusCode: 400, message };
  }

  if (err.name === "ValidationError") {
    const message = Object.keys(err.errors).map((key) => err.errors[key].message);
    error = { statusCode: 400, message: message.join(", ") };
  }

  if (err.name === "Error") {
    error.statusCode = 400;
  }

  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: error.message || "Server Error",
  });
};

module.exports = errorHandler;

