const request = require("supertest");
const app = require("../app");
const User = require("../models/user");

describe("User Profile Endpoints", () => {
  let token;
  let userId;

  const testUser = {
    username: "profileuser",
    email: "profile@example.com",
    password: "password123",
  };

  beforeEach(async () => {
    const user = await User.register(testUser.username, testUser.email, testUser.password);
    userId = user._id.toString();
    token = user.generateJwtToken();
  });

  describe("GET /api/v1/user/profile", () => {
    it("should return the current user's profile", async () => {
      const res = await request(app)
        .get("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("username", testUser.username);
      expect(res.body.user).toHaveProperty("email", testUser.email);
      expect(res.body.user).not.toHaveProperty("password");
      expect(res.body.user).not.toHaveProperty("refreshToken");
    });

    it("should return 401 without a token", async () => {
      const res = await request(app).get("/api/v1/user/profile");

      expect(res.statusCode).toBe(401);
    });
  });

  describe("PATCH /api/v1/user/profile", () => {
    it("should update username", async () => {
      const res = await request(app)
        .patch("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ username: "newusername" });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("username", "newusername");
    });

    it("should update email", async () => {
      const res = await request(app)
        .patch("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "newemail@example.com" });

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toHaveProperty("email", "newemail@example.com");
    });

    it("should not update to an email already in use", async () => {
      await User.register("other", "taken@example.com", "password123");
      const res = await request(app)
        .patch("/api/v1/user/profile")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "taken@example.com" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("already in use");
    });
  });

  describe("PATCH /api/v1/user/password", () => {
    it("should change password with correct current password", async () => {
      const res = await request(app)
        .patch("/api/v1/user/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: testUser.password, newPassword: "newpass123" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("message", "Password changed successfully");
    });

    it("should not change password with incorrect current password", async () => {
      const res = await request(app)
        .patch("/api/v1/user/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: "wrongpassword", newPassword: "newpass123" });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("incorrect");
    });

    it("should verify new password works for login", async () => {
      await request(app)
        .patch("/api/v1/user/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: testUser.password, newPassword: "newpass123" });

      const res = await request(app)
        .post("/api/v1/login")
        .send({ email: testUser.email, password: "newpass123" });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
    });

    it("should reject new password exceeding 12 characters (Zod validation)", async () => {
      const res = await request(app)
        .patch("/api/v1/user/password")
        .set("Authorization", `Bearer ${token}`)
        .send({ currentPassword: testUser.password, newPassword: "toolongpassword123" });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });
  });
});
