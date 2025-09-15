# CheeseSheet Docker Deployment Guide

Complete guide for deploying CheeseSheet using Docker containers.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Docker Configuration](#docker-configuration)
4. [Environment Setup](#environment-setup)
5. [Building the Image](#building-the-image)
6. [Running Containers](#running-containers)
7. [Docker Compose Setup](#docker-compose-setup)
8. [Production Deployment](#production-deployment)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- 4GB+ RAM available
- 10GB+ disk space
- OpenAI API key

### Install Docker

**Ubuntu/Debian:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS:**
```bash
brew install --cask docker
```

**Windows:**
Download Docker Desktop from https://docker.com

## Quick Start

1. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd cheesesheet
   cp .env.example .env.local
   ```

2. **Configure environment:**
   ```bash
   # Edit .env.local with your settings
   nano .env.local
   ```

3. **Build and run:**
   ```bash
   docker-compose up -d
   ```

4. **Access application:**
   Open http://localhost:3000

## Docker Configuration

### Dockerfile

Create an optimized `Dockerfile`:```docke
rfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install system dependencies including LaTeX
RUN apk add --no-cache \
    texlive \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texmf-dist-latexextra \
    texmf-dist-mathextra \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm install -g pnpm && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create nextjs user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create necessary directories
RUN mkdir -p /tmp/cheesesheet_latex && chown nextjs:nodejs /tmp/cheesesheet_latex
RUN mkdir -p /app/logs && chown nextjs:nodejs /app/logs

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```### 
.dockerignore

Create a `.dockerignore` file to optimize build:

```dockerignore
# Dependencies
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output

# Next.js
.next/
out/

# Production
build

# Misc
.DS_Store
*.pem

# Debug
*.log

# Local env files
.env*.local
.env.development
.env.staging
.env.production

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# IDE
.vscode
.idea

# Git
.git
.gitignore

# Documentation
*.md
docs/

# Test files
test/
__tests__/
*.test.*
*.spec.*

# Temporary files
tmp/
temp/
Material_test/
```

## Environment Setup

### Environment Variables

Create `.env.docker` for Docker-specific configuration:

```bash
# Application
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# OpenAI (Required)
OPENAI_API_KEY=your_openai_api_key_here

# LaTeX Configuration
ENABLE_LATEX_PDF=true
LATEX_ENGINE=pdflatex
LATEX_TIMEOUT=120000
LATEX_TEMP_DIR=/tmp/cheesesheet_latex

# Image Generation
ENABLE_PUPPETEER_FALLBACK=true
IMAGE_GENERATION_TIMEOUT=60000

# Performance
NODE_OPTIONS=--max-old-space-size=2048
PROCESSING_MODE=memory_optimized

# Security
NEXTAUTH_SECRET=your_secure_random_string_here
NEXTAUTH_URL=http://localhost:3000

# Monitoring (Optional)
SENTRY_DSN=your_sentry_dsn_here
POSTHOG_KEY=your_posthog_key_here

# Database (if using)
DATABASE_URL=postgresql://user:password@postgres:5432/cheesesheet

# Redis (if using)
REDIS_URL=redis://redis:6379
```

### Secrets Management

For production, use Docker secrets:

```bash
# Create secrets
echo "your_openai_api_key" | docker secret create openai_api_key -
echo "your_nextauth_secret" | docker secret create nextauth_secret -

# Reference in docker-compose.yml
secrets:
  - openai_api_key
  - nextauth_secret
```## 
Building the Image

### Development Build

```bash
# Build development image
docker build -t cheesesheet:dev .

# Build with build args
docker build \
  --build-arg NODE_ENV=development \
  --build-arg NEXT_TELEMETRY_DISABLED=1 \
  -t cheesesheet:dev .
```

### Production Build

```bash
# Build production image
docker build -t cheesesheet:latest .

# Build with specific tag
docker build -t cheesesheet:v1.0.0 .

# Build with cache optimization
docker build \
  --cache-from cheesesheet:latest \
  -t cheesesheet:latest .
```

### Multi-platform Build

```bash
# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t cheesesheet:latest \
  --push .
```

## Running Containers

### Single Container

```bash
# Run with environment file
docker run -d \
  --name cheesesheet \
  --env-file .env.docker \
  -p 3000:3000 \
  -v cheesesheet_latex:/tmp/cheesesheet_latex \
  -v cheesesheet_logs:/app/logs \
  --restart unless-stopped \
  cheesesheet:latest

# Run with individual environment variables
docker run -d \
  --name cheesesheet \
  -e OPENAI_API_KEY=your_key \
  -e ENABLE_LATEX_PDF=true \
  -p 3000:3000 \
  cheesesheet:latest
```

### Container Management

```bash
# View logs
docker logs -f cheesesheet

# Execute commands in container
docker exec -it cheesesheet bash

# Stop container
docker stop cheesesheet

# Remove container
docker rm cheesesheet

# Update container
docker pull cheesesheet:latest
docker stop cheesesheet
docker rm cheesesheet
docker run -d --name cheesesheet ... cheesesheet:latest
```

## Docker Compose Setup

### Basic docker-compose.yml

```yaml
version: '3.8'

services:
  cheesesheet:
    build: .
    container_name: cheesesheet
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.docker
    volumes:
      - cheesesheet_latex:/tmp/cheesesheet_latex
      - cheesesheet_logs:/app/logs
    restart: unless-stopped
    depends_on:
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  redis:
    image: redis:7-alpine
    container_name: cheesesheet_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  cheesesheet_latex:
  cheesesheet_logs:
  redis_data:

networks:
  default:
    name: cheesesheet_network
```### Advanced
 docker-compose.yml

```yaml
version: '3.8'

services:
  cheesesheet:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        - NODE_ENV=production
    container_name: cheesesheet
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
    env_file:
      - .env.docker
    volumes:
      - cheesesheet_latex:/tmp/cheesesheet_latex
      - cheesesheet_logs:/app/logs
      - cheesesheet_uploads:/app/uploads
    restart: unless-stopped
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    container_name: cheesesheet_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: cheesesheet_postgres
    environment:
      - POSTGRES_DB=cheesesheet
      - POSTGRES_USER=cheesesheet
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cheesesheet"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: cheesesheet_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - cheesesheet
    restart: unless-stopped

volumes:
  cheesesheet_latex:
  cheesesheet_logs:
  cheesesheet_uploads:
  redis_data:
  postgres_data:

networks:
  default:
    name: cheesesheet_network
    driver: bridge
```

### Nginx Configuration

Create `nginx.conf` for reverse proxy:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream cheesesheet {
        server cheesesheet:3000;
    }

    server {
        listen 80;
        server_name localhost;

        client_max_body_size 50M;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;

        location / {
            proxy_pass http://cheesesheet;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/ {
            proxy_pass http://cheesesheet;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
        }
    }
}
```## Produ
ction Deployment

### Docker Swarm

Initialize and deploy with Docker Swarm:

```bash
# Initialize swarm
docker swarm init

# Create secrets
echo "your_openai_api_key" | docker secret create openai_api_key -
echo "your_nextauth_secret" | docker secret create nextauth_secret -

# Deploy stack
docker stack deploy -c docker-compose.prod.yml cheesesheet
```

### Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  cheesesheet:
    image: cheesesheet:latest
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    secrets:
      - openai_api_key
      - nextauth_secret
    volumes:
      - cheesesheet_data:/app/data
    networks:
      - cheesesheet_network

secrets:
  openai_api_key:
    external: true
  nextauth_secret:
    external: true

volumes:
  cheesesheet_data:
    driver: local

networks:
  cheesesheet_network:
    driver: overlay
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cheesesheet
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cheesesheet
  template:
    metadata:
      labels:
        app: cheesesheet
    spec:
      containers:
      - name: cheesesheet
        image: cheesesheet:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: cheesesheet-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: cheesesheet-service
spec:
  selector:
    app: cheesesheet
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Monitoring and Logs

### Log Management

```bash
# View logs
docker-compose logs -f cheesesheet

# View logs with timestamps
docker-compose logs -f -t cheesesheet

# View specific number of lines
docker-compose logs --tail=100 cheesesheet

# Export logs
docker-compose logs cheesesheet > cheesesheet.log
```

### Monitoring Setup

Add monitoring services to docker-compose.yml:

```yaml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```## Troub
leshooting

### Common Issues

**1. Container fails to start:**
```bash
# Check logs
docker logs cheesesheet

# Check container status
docker ps -a

# Inspect container
docker inspect cheesesheet
```

**2. LaTeX compilation fails:**
```bash
# Check LaTeX installation in container
docker exec -it cheesesheet pdflatex --version

# Install missing packages
docker exec -it cheesesheet apk add texlive-latex-extra
```

**3. Out of memory errors:**
```bash
# Increase memory limit
docker run --memory=4g cheesesheet:latest

# Or in docker-compose.yml:
deploy:
  resources:
    limits:
      memory: 4G
```

**4. Permission issues:**
```bash
# Fix volume permissions
docker exec -it cheesesheet chown -R nextjs:nodejs /tmp/cheesesheet_latex
```

**5. Network connectivity issues:**
```bash
# Check network
docker network ls
docker network inspect cheesesheet_network

# Test connectivity
docker exec -it cheesesheet curl -f http://localhost:3000/api/health
```

### Performance Optimization

**1. Multi-stage builds:**
- Use multi-stage Dockerfile to reduce image size
- Only include production dependencies in final image

**2. Layer caching:**
```bash
# Build with cache
docker build --cache-from cheesesheet:latest -t cheesesheet:latest .
```

**3. Resource limits:**
```yaml
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 1G
      cpus: '0.5'
```

**4. Volume optimization:**
```bash
# Use named volumes for better performance
volumes:
  cheesesheet_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/cheesesheet/data
```

### Debugging

**1. Enable debug mode:**
```bash
docker run -e DEBUG=cheesesheet:* cheesesheet:latest
```

**2. Interactive debugging:**
```bash
# Run with bash
docker run -it --entrypoint bash cheesesheet:latest

# Attach to running container
docker exec -it cheesesheet bash
```

**3. Health checks:**
```bash
# Manual health check
curl -f http://localhost:3000/api/health

# Container health status
docker inspect --format='{{.State.Health.Status}}' cheesesheet
```

### Backup and Recovery

**1. Backup volumes:**
```bash
# Backup volume
docker run --rm -v cheesesheet_data:/data -v $(pwd):/backup alpine tar czf /backup/cheesesheet_backup.tar.gz -C /data .

# Restore volume
docker run --rm -v cheesesheet_data:/data -v $(pwd):/backup alpine tar xzf /backup/cheesesheet_backup.tar.gz -C /data
```

**2. Database backup:**
```bash
# Backup PostgreSQL
docker exec cheesesheet_postgres pg_dump -U cheesesheet cheesesheet > backup.sql

# Restore PostgreSQL
docker exec -i cheesesheet_postgres psql -U cheesesheet cheesesheet < backup.sql
```

## Security Best Practices

1. **Use non-root user in container**
2. **Scan images for vulnerabilities:**
   ```bash
   docker scan cheesesheet:latest
   ```
3. **Use secrets for sensitive data**
4. **Keep base images updated**
5. **Limit container resources**
6. **Use read-only root filesystem where possible**

## Maintenance

### Updates

```bash
# Update images
docker-compose pull

# Restart services
docker-compose up -d

# Clean up old images
docker image prune -a
```

### Cleanup

```bash
# Remove unused containers
docker container prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Complete cleanup
docker system prune -a
```

---

**CheeseSheet Docker Deployment Guide**
*Complete Docker deployment solution for CheeseSheet*