# Build stage
FROM node:lts-alpine3.17 AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy Prisma schema and migrations
COPY backend/prisma ./prisma

# Generate Prisma client for all binary targets
RUN npx prisma generate

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:lts-alpine3.17

WORKDIR /app

# Install OpenSSL 1.1 compatibility
RUN apk update && apk add openssl1.1-compat

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Copy environment file if it exists
COPY backend/.env* ./

# Generate Prisma client in production stage with OpenSSL 1.1
RUN npx prisma generate

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["dumb-init", "node", "dist/index.js"]
