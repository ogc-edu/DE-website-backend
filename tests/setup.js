const mongoose = require("mongoose");
const { connectDB, closeDB } = require("../config/database");

// Set before the app module is imported: config/s3.js / config/sqs.js read
// these eagerly at require time (dotenv does not override already-set vars).
process.env.AWS_REGION = "us-east-1";
process.env.S3_BUCKET_NAME = "test-bucket";
process.env.SQS_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue";

// Never hit real AWS in tests: mock the SQS SDK commands. `__sqsSendMock`
// lets individual tests assert on the sent payload or override the response.
jest.mock("@aws-sdk/client-sqs", () => {
  const __sqsSendMock = jest.fn().mockResolvedValue({});
  return {
    SQSClient: jest.fn().mockImplementation(() => ({ send: __sqsSendMock })),
    SendMessageCommand: jest
      .fn()
      .mockImplementation((input) => ({ command: "SendMessageCommand", input })),
    GetQueueAttributesCommand: jest
      .fn()
      .mockImplementation((input) => ({ command: "GetQueueAttributesCommand", input })),
    DeleteMessageCommand: jest
      .fn()
      .mockImplementation((input) => ({ command: "DeleteMessageCommand", input })),
    __sqsSendMock,
  };
});

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
