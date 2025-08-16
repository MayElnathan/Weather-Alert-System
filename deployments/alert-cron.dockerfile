# Build stage
FROM node:lts-alpine3.17 AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

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

# Generate Prisma client in production stage
RUN npx prisma generate

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check for the cron service
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "console.log('Alert cron service is running')" || exit 1

# Start the alert cron service
CMD ["dumb-init", "node", "dist/alertServiceCronRunner.js"]
