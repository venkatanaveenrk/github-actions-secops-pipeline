const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8080;

// ── Security middleware ────────────────────────────────────────────────────────

// Helmet sets secure HTTP headers automatically
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Rate limiting — prevents brute force and DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per window
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Stricter rate limit for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,
  message: { error: "API rate limit exceeded." },
});
app.use("/api/", apiLimiter);

// Request logging
app.use(morgan("combined"));

// Parse JSON with size limit
app.use(express.json({ limit: "10kb" }));

// ── Remove sensitive headers ───────────────────────────────────────────────────
app.disable("x-powered-by");

// ── Routes ─────────────────────────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "DevSecOps Sample App",
    security_features: [
      "Helmet security headers",
      "Rate limiting",
      "Input validation",
      "No sensitive data in responses",
      "JSON size limits",
    ],
    endpoints: {
      health: "GET /health",
      users: "GET /api/users",
      echo: "POST /api/echo",
    },
  });
});

// Input validation helper
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;
  return input
    .replace(/[<>]/g, "")       // Remove HTML tags
    .replace(/javascript:/gi, "") // Remove JS protocol
    .trim()
    .substring(0, 1000);         // Limit length
};

// Safe echo endpoint (demonstrates input sanitization)
app.post("/api/echo", (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "message field is required" });
  }

  if (typeof message !== "string") {
    return res.status(400).json({ error: "message must be a string" });
  }

  // Sanitize before echoing back
  const sanitized = sanitizeInput(message);
  res.json({ echo: sanitized, sanitized: sanitized !== message });
});

// Users endpoint — never returns passwords or sensitive fields
app.get("/api/users", (req, res) => {
  const users = [
    { id: 1, name: "Alice Smith", role: "admin" },
    { id: 2, name: "Bob Jones", role: "user" },
    { id: 3, name: "Carol White", role: "user" },
  ];
  // Only return safe fields — never return passwords, tokens, emails
  res.json({ users, count: users.length });
});

// ── Error handling ─────────────────────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — never expose stack traces in production
// eslint-disable-next-line no-unused-vars -- Express requires 4 args to detect error middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    // Client error messages (4xx) are safe to expose; 5xx details are not.
    error: status < 500 ? err.message : "Internal server error",
    // Stack trace intentionally excluded from response
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
// Guarded so requiring this module in tests (supertest) doesn't bind a real
// port and leave an open handle that hangs Jest.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DevSecOps sample app running on port ${PORT}`);
  });
}

module.exports = app;
