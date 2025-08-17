### Weather-Alert-System

### Technology Stack Overview

## Frontend Technologies
React - Modern UI framework with component-based architecture
Vite - Ultra-fast build tool for development
TypeScript - Type-safe JavaScript development
Tailwind CSS - Utility-first CSS framework
TanStack React Query - Server state management and caching
React Hook Form - High-performance form handling


## Backend Technologies
Node.js - JavaScript runtime for server-side development
Express.js - Minimal web framework with middleware support
PostgreSQL - Advanced relational database
Prisma - Type-safe database ORM
node-cache - fast in-memory caching for frequently accessed data
node-cron - Schedule recurring tasks for weather alert evaluation


## Infrastructure & DevOps
Docker - Containerization for consistent deployments
Docker Compose - Multi-service orchestration
Nginx - Reverse proxy and static file serving
Alpine Linux - Lightweight container images


## External Services
Tomorrow.io API - Hyperlocal weather data provider
Geocoding Services - Location coordinate conversion


## 📋 Step-by-Step Setup Instructions

### 1. Install Docker and Docker Compose

#### **macOS (Recommended)**
```bash
# Install Docker Desktop (includes Docker Compose)
brew install --cask docker
```
Or download from [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

#### **Windows**
```bash
# Install Docker Desktop (includes Docker Compose)
winget install Docker.DockerDesktop
```
Or download from [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)

#### **Linux (Ubuntu/Debian)**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
```

#### **Verify Installation**
```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Start Docker service (if needed)
sudo systemctl start docker
sudo systemctl enable docker
```

---

### 2. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/MayElnathan/Weather-Alert-System.git

# Navigate to project directory
cd Weather-Alert-System

# Verify the structure
ls -la
```

**Expected directory structure:**
```
Weather-Alert-System/
├── backend/           # Backend API source code
├── frontend/          # React frontend source code
├── deployments/       # Docker configuration files
├── docker-compose.yml # Root docker-compose file
└── README.md
```

---

### 3. Configure Environment Variables

#### **Navigate to deployments folder**
```bash
cd deployments
```

#### **Create .env file**
```bash
# Create .env file
touch .env

# Open with your preferred editor
nano .env
# or
code .env
```

#### **Add required environment variables**
```bash
# Required: Tomorrow.io API Key
TOMORROW_API_KEY=your_actual_api_key_here
```

#### **Get Tomorrow.io API Key**
Copy your API key
Replace `your_actual_api_key_here` in the .env file

---

### 4. Build and Run the Project

#### **Run the Project**
```bash
# From the deployments directory
cd deployments
docker-compose up --build
```

---

#### **Access the Application**
- **Frontend**: http://localhost (or http://localhost:80)
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health
- **Database**: localhost:5432

---


*Follow these instructions step-by-step to get your Weather Alert System up and running quickly!*



