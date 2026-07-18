const request = require("supertest");
const app = require("../src/app");

describe("Security Tests", () => {

  // ── Security headers ──────────────────────────────────────────────────────
  describe("Security Headers", () => {
    test("should set X-Content-Type-Options header", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
    });

    test("should set X-Frame-Options header", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["x-frame-options"]).toBeDefined();
    });

    test("should not expose X-Powered-By header", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["x-powered-by"]).toBeUndefined();
    });

    test("should set Content-Security-Policy header", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["content-security-policy"]).toBeDefined();
    });

    test("should set Strict-Transport-Security header", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["strict-transport-security"]).toBeDefined();
    });
  });

  // ── Input validation ──────────────────────────────────────────────────────
  describe("Input Validation", () => {
    test("should sanitize XSS attempts in echo endpoint", async () => {
      const res = await request(app)
        .post("/api/echo")
        .send({ message: "<script>alert('xss')</script>" });

      expect(res.status).toBe(200);
      expect(res.body.echo).not.toContain("<script>");
      expect(res.body.sanitized).toBe(true);
    });

    test("should reject missing message field", async () => {
      const res = await request(app)
        .post("/api/echo")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("message field is required");
    });

    test("should reject non-string message", async () => {
      const res = await request(app)
        .post("/api/echo")
        .send({ message: { nested: "object" } });
      expect(res.status).toBe(400);
    });

    test("should reject oversized JSON body", async () => {
      const largePayload = { message: "x".repeat(20000) };
      const res = await request(app)
        .post("/api/echo")
        .send(largePayload);
      expect(res.status).toBe(413);
    });
  });

  // ── Safe data exposure ────────────────────────────────────────────────────
  describe("Data Exposure", () => {
    test("should never return passwords in user data", async () => {
      const res = await request(app).get("/api/users");
      expect(res.status).toBe(200);
      res.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
        expect(user.passwordHash).toBeUndefined();
        expect(user.token).toBeUndefined();
        expect(user.email).toBeUndefined();
      });
    });

    test("should return only safe user fields", async () => {
      const res = await request(app).get("/api/users");
      const allowedFields = ["id", "name", "role"];
      res.body.users.forEach(user => {
        Object.keys(user).forEach(key => {
          expect(allowedFields).toContain(key);
        });
      });
    });
  });

  // ── Error handling ────────────────────────────────────────────────────────
  describe("Error Handling", () => {
    test("should return 404 for unknown routes", async () => {
      const res = await request(app).get("/unknown-route");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Not found");
    });

    test("should not expose stack traces in errors", async () => {
      const res = await request(app).get("/unknown-route");
      expect(res.body.stack).toBeUndefined();
      expect(res.body.trace).toBeUndefined();
    });
  });

  // ── Health check ──────────────────────────────────────────────────────────
  describe("Health Check", () => {
    test("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("healthy");
      expect(res.body.timestamp).toBeDefined();
    });
  });

});
