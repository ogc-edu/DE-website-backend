const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const Simulation = require("../models/simulation");

describe("Simulation Endpoints", () => {
  let token;
  let userId;

  const testUser = {
    username: "researcher",
    email: "researcher@example.com",
    password: "password123",
  };

  const validSimInput = {
    functions: [1, 2],
    methods: {
      mutation: [1, 2],
      crossover: [1],
      selection: [1],
    },
  };

  beforeEach(async () => {
    const user = await User.register(testUser.username, testUser.email, testUser.password);
    userId = user._id.toString();
    token = user.generateJwtToken();
  });

  describe("POST /api/v1/simulation/create", () => {
    it("should create a simulation with valid params and return 201", async () => {
      const res = await request(app)
        .post("/api/v1/simulation/create")
        .set("Authorization", `Bearer ${token}`)
        .send(validSimInput);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("simulationId");
    });

    it("should compute totalModels as Cartesian product", async () => {
      const res = await request(app)
        .post("/api/v1/simulation/create")
        .set("Authorization", `Bearer ${token}`)
        .send(validSimInput);

      const sim = await Simulation.findById(res.body.simulationId);
      expect(sim.totalModels).toBe(2 * 2 * 1 * 1);
    });

    it("should return 401 without a token", async () => {
      const res = await request(app).post("/api/v1/simulation/create").send(validSimInput);

      expect(res.statusCode).toBe(401);
    });

    it("should return 400 with invalid input (Zod validation)", async () => {
      const res = await request(app)
        .post("/api/v1/simulation/create")
        .set("Authorization", `Bearer ${token}`)
        .send({ functions: [99], methods: { mutation: [1], crossover: [1], selection: [1] } });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });
  });

  describe("GET /api/v1/simulation/get", () => {
    it("should return all simulations for the user", async () => {
      await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      const res = await request(app)
        .get("/api/v1/simulation/get")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.simulationCount).toBe(1);
      expect(res.body.simulations).toHaveLength(1);
    });

    it("should return empty list when user has no simulations", async () => {
      const res = await request(app)
        .get("/api/v1/simulation/get")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.simulationCount).toBe(0);
      expect(res.body.simulations).toHaveLength(0);
    });

    it("should support pagination", async () => {
      for (let i = 0; i < 3; i++) {
        await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      }
      const res = await request(app)
        .get("/api/v1/simulation/get?page=1&limit=2")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.simulations).toHaveLength(2);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBe(2);
    });

    it("should support status filter", async () => {
      const sim = await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      await Simulation.findByIdAndUpdate(sim._id, { status: "completed" });
      await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);

      const res = await request(app)
        .get("/api/v1/simulation/get?status=completed")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.simulationCount).toBe(1);
    });

    it("should return 401 without a token", async () => {
      const res = await request(app).get("/api/v1/simulation/get");

      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/v1/simulation/get/:simulationId", () => {
    it("should return a single simulation", async () => {
      const sim = await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      const res = await request(app)
        .get(`/api/v1/simulation/get/${sim._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.simulation._id).toBe(sim._id.toString());
    });

    it("should not allow access to another user's simulation", async () => {
      const otherUser = await User.register("other", "other@example.com", "password123");
      const otherSim = await Simulation.createSimulation(
        otherUser._id.toString(),
        validSimInput.functions,
        validSimInput.methods
      );

      const res = await request(app)
        .get(`/api/v1/simulation/get/${otherSim._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/v1/simulation/get/:simulationId/results", () => {
    it("should return simulation results grid", async () => {
      const sim = await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      const res = await request(app)
        .get(`/api/v1/simulation/get/${sim._id}/results`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("simulationId");
      expect(res.body).toHaveProperty("totalModels");
      expect(res.body).toHaveProperty("completedModels");
      expect(res.body).toHaveProperty("progress");
      expect(res.body).toHaveProperty("simulationData");
    });
  });

  describe("DELETE /api/v1/simulation/delete/:simulationId", () => {
    it("should delete a simulation", async () => {
      const sim = await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      const res = await request(app)
        .delete(`/api/v1/simulation/delete/${sim._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Simulation deleted successfully");

      const deleted = await Simulation.findById(sim._id);
      expect(deleted).toBeNull();
    });

    it("should not delete another user's simulation", async () => {
      const otherUser = await User.register("other", "other@example.com", "password123");
      const otherSim = await Simulation.createSimulation(
        otherUser._id.toString(),
        validSimInput.functions,
        validSimInput.methods
      );

      const res = await request(app)
        .delete(`/api/v1/simulation/delete/${otherSim._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /api/v1/simulation/cancel/:simulationId", () => {
    it("should cancel a simulation", async () => {
      const sim = await Simulation.createSimulation(userId, validSimInput.functions, validSimInput.methods);
      const res = await request(app)
        .post(`/api/v1/simulation/cancel/${sim._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Simulation cancelled successfully");
    });
  });
});
