const mongoose = require("mongoose");
const { connectDB, closeDB } = require("../config/database");

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-jwt-refresh-secret";
  process.env.MONGODB_URI =
    process.env.MONGODB_URI_TEST ||
    "mongodb://root:password123@localhost:27017/Dashboard-Test-Database?directConnection=true&authSource=admin";
  process.env.DB_NAME = "Dashboard-Test-Database";

  await connectDB();
});

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

afterAll(async () => {
  await closeDB();
});
