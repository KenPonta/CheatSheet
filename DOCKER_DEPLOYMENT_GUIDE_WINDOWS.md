# 🐳 Docker Deployment Guide for Windows

Complete guide for deploying CheeseSheet using Docker on Windows systems.

## 📋 Prerequisites

### System Requirements
- **Windows 10/11** (64-bit) with WSL2 enabled
- **Docker Desktop for Windows** 4.0+ 
- **Git for Windows** or **WSL2 with Git**
- **4GB RAM minimum** (8GB recommended)
- **10GB free disk space**

### Required Software Installation

#### 1. Install WSL2 (Recommended)
```powershell
# Run as Administrator in PowerShell
wsl --install
# Restart your computer
wsl --set-default-version 2
```

#### 2. Install Docker Desktop
1. Download from [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
2. Run installer with default settings
3. Enable WSL2 integration in Docker Desktop settings
4. Restart Docker Desktop

#### 3. Verify Installation
```powershell
# Check Docker version
docker --version
docker-compose --version

# Test Docker
docker run hello-world
```

## 🚀 Quick Deployment

### Option 1: Using Docker Compose (Recommended)

```powershell
# Clone the repository
git clone <your-repo-url>
cd cheesesheet

# Create environment file
copy .env.example .env.docker

# Edit .env.docker with your settings
notepad .env.docker

# Build and start services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Using Docker Run

```powershell
# Build the image
docker build -t cheesesheet .

# Run the container
docker run -d `
  --name cheesesheet `
  -p 3000:3000 `
  -e OPENAI_API_KEY=your_api_key_here `
  -e NEXTAUTH_SECRET=your_secret_here `
  -v cheesesheet_data:/app/data `
  cheesesheet
```

## ⚙️ Configuration

### Environment Variables (.env.docker)

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here
NEXTAUTH_SECRET=your_secure_random_string_32_chars_min

# Optional
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
ENABLE_LATEX_PDF=true
LATEX_ENGINE=pdflatex
ENABLE_PUPPETEER_FALLBACK=true

# Redis (if using external Redis)
REDIS_URL=redis://redis:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
POSTHOG_KEY=your_posthog_key_here
```

### Docker Compose Configuration

The included `docker-compose.yml` provides:
- **CheeseSheet application** on port 3000
- **Redis cache** on port 6379
- **Persistent volumes** for data
- **Health checks** and auto-restart
- **Resource limits** (2GB RAM, 1 CPU)

## 🔧 Windows-Specific Setup

### Using PowerShell

```powershell
# Set execution policy (if needed)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Navigate to project directory
cd C:\path\to\cheesesheet

# Create required directories
New-Item -ItemType Directory -Force -Path ".\logs"
New-Item -ItemType Directory -Force -Path ".\uploads"
New-Item -ItemType Directory -Force -Path ".\temp"

# Set environment variables
$env:OPENAI_API_KEY="your_api_key_here"
$env:NEXTAUTH_SECRET="your_secret_here"

# Build and run
docker-compose up -d
```

### Using Command Prompt

```cmd
REM Navigate to project directory
cd C:\path\to\cheesesheet

REM Create directories
mkdir logs uploads temp

REM Set environment variables
set OPENAI_API_KEY=your_api_key_here
set NEXTAUTH_SECRET=your_secret_here

REM Build and run
docker-compose up -d
```

### Using WSL2 (Recommended)

```bash
# Switch to WSL2
wsl

# Navigate to project (Windows drives are mounted under /mnt/)
cd /mnt/c/path/to/cheesesheet

# Use standard Linux commands
chmod +x scripts/*.sh
./scripts/setup.sh

# Or use Docker Compose
docker-compose up -d
```

## 📊 Monitoring & Management

### Check Application Status

```powershell
# View running containers
docker-compose ps

# Check logs
docker-compose logs -f cheesesheet

# Check health
curl http://localhost:3000/api/health
```

### Performance Monitoring

```powershell
# Container resource usage
docker stats cheesesheet

# Application metrics
curl http://localhost:3000/api/monitoring/stats
```

### Backup Data

```powershell
# Backup volumes
docker run --rm -v cheesesheet_logs:/data -v ${PWD}:/backup alpine tar czf /backup/logs-backup.tar.gz -C /data .
docker run --rm -v cheesesheet_uploads:/data -v ${PWD}:/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

## 🔄 Updates & Maintenance

### Update Application

```powershell
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Clean Up

```powershell
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes (careful!)
docker volume prune
```

## 🐛 Troubleshooting

### Common Windows Issues

#### Docker Desktop Not Starting
```powershell
# Restart Docker Desktop service
Restart-Service -Name "com.docker.service"

# Or restart from GUI
# Right-click Docker Desktop tray icon → Restart
```

#### WSL2 Integration Issues
```powershell
# Reset WSL2 integration
wsl --shutdown
# Restart Docker Desktop
# Re-enable WSL2 integration in settings
```

#### Port Already in Use
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (replace PID)
taskkill /PID <PID> /F

# Or use different port
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

#### Memory Issues
```powershell
# Increase Docker Desktop memory limit
# Docker Desktop → Settings → Resources → Advanced
# Set memory to 4GB+ and CPU to 2+
```

### Application Issues

#### LaTeX Not Working
```powershell
# Check LaTeX installation in container
docker exec cheesesheet which pdflatex

# Test LaTeX
docker exec cheesesheet pdflatex --version
```

#### OpenAI API Issues
```powershell
# Check API key
docker exec cheesesheet printenv OPENAI_API_KEY

# Test API connection
curl -H "Authorization: Bearer your_api_key" https://api.openai.com/v1/models
```

#### File Upload Issues
```powershell
# Check upload directory permissions
docker exec cheesesheet ls -la /app/uploads

# Fix permissions
docker exec cheesesheet chown -R nextjs:nodejs /app/uploads
```

## 🔒 Security Considerations

### Windows Firewall
```powershell
# Allow Docker through firewall
New-NetFirewallRule -DisplayName "Docker Desktop" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

### Environment Security
- Store sensitive environment variables in `.env.docker` (not in version control)
- Use Docker secrets for production deployments
- Regularly update base images and dependencies
- Enable Windows Defender or equivalent antivirus

### Network Security
```powershell
# Create isolated network
docker network create --driver bridge cheesesheet_secure

# Run with custom network
docker-compose -f docker-compose.secure.yml up -d
```

## 📈 Production Deployment

### Using Docker Swarm

```powershell
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml cheesesheet

# Scale services
docker service scale cheesesheet_cheesesheet=3
```

### Using Kubernetes (Windows)

```powershell
# Enable Kubernetes in Docker Desktop
# Docker Desktop → Settings → Kubernetes → Enable

# Deploy to Kubernetes
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n cheesesheet
```

## 📝 Logs & Debugging

### Access Logs

```powershell
# Application logs
docker-compose logs -f cheesesheet

# Redis logs
docker-compose logs -f redis

# System logs
docker logs cheesesheet --since 1h
```

### Debug Mode

```powershell
# Run in debug mode
docker-compose -f docker-compose.yml -f docker-compose.debug.yml up

# Access container shell
docker exec -it cheesesheet /bin/bash
```

## 🎯 Performance Optimization

### Windows-Specific Optimizations

```powershell
# Enable Hyper-V (if not using WSL2)
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All

# Optimize Docker Desktop settings
# Settings → Resources → Advanced
# - Memory: 4-8GB
# - CPU: 2-4 cores
# - Swap: 1GB
# - Disk image size: 64GB
```

### Container Optimizations

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  cheesesheet:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
    environment:
      - NODE_OPTIONS=--max-old-space-size=3072
```

## 📞 Support

### Getting Help

1. **Check logs first**: `docker-compose logs -f`
2. **Verify environment**: `docker exec cheesesheet printenv`
3. **Test connectivity**: `curl http://localhost:3000/api/health`
4. **Check Docker status**: `docker system info`

### Useful Commands

```powershell
# Complete system info
docker system info
docker-compose config

# Resource usage
docker system df
docker stats

# Network debugging
docker network ls
docker network inspect cheesesheet_default
```

---

## 🎉 Quick Start Summary

```powershell
# 1. Install Docker Desktop for Windows
# 2. Clone repository
git clone <repo-url> && cd cheesesheet

# 3. Configure environment
copy .env.example .env.docker
# Edit .env.docker with your API keys

# 4. Deploy
docker-compose up -d

# 5. Access application
start http://localhost:3000
```

Your CheeseSheet application should now be running at `http://localhost:3000`! 🧀✨