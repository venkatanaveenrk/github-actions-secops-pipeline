# =============================================================================
#  Secure Dockerfile — DevSecOps best practices
#  - Multi-stage build (smaller final image)
#  - Non-root user
#  - Minimal base image (alpine)
#  - No unnecessary packages
#  - Health check included
#  - Read-only filesystem ready
# =============================================================================

# ── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install only production dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Final image ──────────────────────────────────────────────────────
FROM node:20-alpine AS final

# Security: run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy only what's needed from deps stage
COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup src ./src
COPY --chown=appuser:appgroup package.json ./

# Security: switch to non-root user
USER appuser

# Security: don't expose unnecessary ports
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

# Use exec form to ensure signals are handled correctly
CMD ["node", "src/app.js"]
