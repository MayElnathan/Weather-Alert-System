# Weather Alert System - Docker Deployment

This directory contains Docker configurations for deploying the Weather Alert System.

## Services

### 1. Frontend (`frontend.dockerfile`)
- **Purpose**: Serves the React frontend application
- **Port**: 80
- **Base Image**: nginx:alpine
- **Features**: Multi-stage build, optimized production build, React Router support, API proxy to backend

### 2. Backend (`backend.dockerfile`)
- **Purpose**: Runs the Express.js API server
- **Port**: 3001
- **Base Image**: node:18-alpine
- **Features**: Multi-stage build, Prisma client generation, health checks, OpenSSL compatibility fixes

### 3. Alert Cron (`alert-cron.dockerfile`)
- **Purpose**: Runs the alert evaluation service
- **Base Image**: node:18-alpine
- **Features**: Runs `alertServiceCronRunner.ts` for periodic alert checks, OpenSSL compatibility fixes

### 4. PostgreSQL (`docker-compose.yml`)
- **Purpose**: Database for the application
- **Port**: 5432
- **Base Image**: postgres:15-alpine

## Frontend Configuration

### React Router Support
The frontend is configured with nginx to properly support React Router:

- **SPA Routing**: All routes serve `index.html` for client-side routing
- **Browser Refresh**: Direct URL access works correctly
- **API Proxy**: `/api/*` requests are automatically proxied to the backend
- **Static Assets**: Optimized caching for JS, CSS, and images
- **Gzip Compression**: Enabled for better performance

### Nginx Features
- **Security Headers**: XSS protection, frame options, content type sniffing
- **Caching**: Long-term caching for static assets, no-cache for HTML
- **Compression**: Gzip compression for text-based files
- **Error Handling**: 404 errors redirect to index.html for React Router
- **Health Check**: `/health` endpoint for container health monitoring

## Quick Start

1. **Use your existing .env file**:
   The docker-compose will automatically use your existing `.env` file from the project root.
   
   **Important**: The Docker setup uses these default database credentials:
   ```bash
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=password
   DATABASE_URL="postgresql://postgres:password@postgres:5432/weather_alerts"
   ```

2. **Build and run**:
   ```bash
   cd deployments
   docker-compose up --build
   ```

3. **Access services**:
   - Frontend: http://localhost
   - Backend API: http://localhost:3001
   - Database: localhost:5432

## Environment Variables

The docker-compose automatically uses your existing `.env` file from the project root. The Docker setup includes these defaults:

```bash
# Database Configuration (Docker defaults)
DATABASE_URL="postgresql://postgres:password@postgres:5432/weather_alerts"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=weather_alerts

# Tomorrow.io API Configuration
TOMORROW_API_KEY=
TOMORROW_API_BASE_URL=https://api.tomorrow.io/v4

# Server Configuration
PORT=3001
NODE_ENV=production

# Logging
LOG_LEVEL=INFO

# CORS
CORS_ORIGIN=*
```

## Docker Commands

### Build individual services:
```bash
# Frontend
docker build -f deployments/frontend.dockerfile -t weather-frontend ..

# Backend
docker build -f deployments/backend.dockerfile -t weather-backend ..

# Alert Cron
docker build -f deployments/alert-cron.dockerfile -t weather-alert-cron ..
```

### Run with docker-compose:
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Health Checks

- **Backend**: Checks `/health` endpoint every 30s
- **Alert Cron**: Logs status every 60s
- **PostgreSQL**: Checks database connectivity every 10s

## Production Considerations

1. **Environment Variables**: Never commit real API keys or secrets
2. **Database**: Use external database in production
3. **Volumes**: Configure proper backup strategies for database
4. **Networking**: Use reverse proxy (nginx/traefik) in production
5. **Monitoring**: Add logging and monitoring solutions

## Troubleshooting

### Common Issues:

1. **Port conflicts**: Ensure ports 80, 3001, and 5432 are available
2. **Database connection**: Check DATABASE_URL format and credentials
3. **API keys**: Verify Tomorrow.io API key is valid
4. **Build failures**: Ensure all source code is present in parent directory

### Prisma/OpenSSL Issues (Fixed):
The Dockerfiles now include `libc6-compat` to resolve Prisma client compatibility issues with Alpine Linux.

### Database Connection Issues:
The Docker setup uses these default credentials:
```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
DATABASE_URL="postgresql://postgres:password@postgres:5432/weather_alerts"
```

### Logs:
```bash
# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs alert-cron
docker-compose logs postgres
```
