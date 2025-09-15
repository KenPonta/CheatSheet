#!/bin/bash

# CheeseSheet Docker Deployment Script
# Usage: ./docker-deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
PROJECT_NAME="cheesesheet"

echo "🧀 CheeseSheet Docker Deployment"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check Docker installation
check_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [ ! -f ".env.docker" ]; then
        print_warning ".env.docker not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example .env.docker
        else
            print_error "No environment template found. Please create .env.docker manually."
            exit 1
        fi
    fi
    
    # Check for required environment variables
    if grep -q "your_openai_api_key_here" .env.docker; then
        print_warning "Please update .env.docker with your actual OpenAI API key"
        read -p "Press Enter to continue after editing .env.docker..."
    fi
    
    print_success "Environment setup complete"
}

# Build Docker image
build_image() {
    print_status "Building Docker image..."
    
    docker build -t "$PROJECT_NAME:$ENVIRONMENT" .
    
    print_success "Docker image built successfully"
}

# Deploy with Docker Compose
deploy_compose() {
    print_status "Deploying with Docker Compose..."
    
    # Stop existing containers
    docker-compose down
    
    # Start services
    docker-compose up -d
    
    print_success "Docker Compose deployment completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for services to start
    sleep 30
    
    # Check application health
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Health check passed - CheeseSheet is running!"
    else
        print_warning "Health check failed - application may still be starting"
        print_status "Check logs with: docker-compose logs -f cheesesheet"
    fi
}

# Show status
show_status() {
    print_status "Container status:"
    docker-compose ps
    
    echo ""
    print_status "Application URLs:"
    echo "  CheeseSheet: http://localhost:3000"
    echo "  Redis: localhost:6379"
    
    echo ""
    print_status "Useful commands:"
    echo "  View logs: docker-compose logs -f cheesesheet"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  Update deployment: ./docker-deploy.sh $ENVIRONMENT"
}

# Main deployment function
main() {
    check_docker
    setup_environment
    build_image
    deploy_compose
    health_check
    show_status
    
    echo ""
    print_success "🎉 CheeseSheet Docker deployment completed!"
    print_status "Access your application at: http://localhost:3000"
}

# Run main function
main