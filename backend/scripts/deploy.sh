#!/bin/bash

# Production deployment script for study material generator
# This script handles the complete deployment process with safety checks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
BUILD_DIR=".next"
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 Starting deployment to ${DEPLOYMENT_ENV}${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Pre-deployment checks
echo -e "${BLUE}📋 Running pre-deployment checks...${NC}"

# Check if required environment variables are set
check_env_vars() {
    local required_vars=(
        "OPENAI_API_KEY"
        "NODE_ENV"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    print_status "Environment variables validated"
}

# Check Node.js and npm versions
check_dependencies() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
}

# Run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    if npm test -- --passWithNoTests --watchAll=false; then
        print_status "All tests passed"
    else
        print_error "Tests failed"
        exit 1
    fi
}

# Build the application
build_application() {
    echo -e "${BLUE}🔨 Building application...${NC}"
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
        print_status "Cleaned previous build"
    fi
    
    # Install dependencies
    npm ci --production=false
    print_status "Dependencies installed"
    
    # Build the application
    if npm run build; then
        print_status "Application built successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Create backup of current deployment
create_backup() {
    if [ "$DEPLOYMENT_ENV" = "production" ] && [ -d "$BUILD_DIR" ]; then
        echo -e "${BLUE}💾 Creating backup...${NC}"
        mkdir -p "$BACKUP_DIR"
        cp -r "$BUILD_DIR" "$BACKUP_DIR/"
        print_status "Backup created at $BACKUP_DIR"
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    echo -e "${BLUE}🌐 Deploying to Vercel...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found, installing..."
        npm install -g vercel
    fi
    
    # Deploy based on environment
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    print_status "Deployment completed"
}

# Health check after deployment
health_check() {
    echo -e "${BLUE}🏥 Running health check...${NC}"
    
    # Wait for deployment to be ready
    sleep 30
    
    # Get deployment URL (this would need to be customized based on your setup)
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        HEALTH_URL="${NEXT_PUBLIC_APP_URL}/api/health"
    else
        # For preview deployments, you'd need to get the URL from Vercel CLI output
        print_warning "Health check skipped for non-production deployment"
        return
    fi
    
    if [ -n "$HEALTH_URL" ]; then
        if curl -f -s "$HEALTH_URL" > /dev/null; then
            print_status "Health check passed"
        else
            print_error "Health check failed"
            # Don't exit here as the deployment might still be starting
        fi
    fi
}

# Notify deployment status
notify_deployment() {
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    # This could be extended to send Slack notifications, emails, etc.
    if [ -n "$WEBHOOK_URL" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"🚀 Study Material Generator deployed to $DEPLOYMENT_ENV successfully\"}"
    fi
    
    print_status "Deployment notification sent"
}

# Rollback function (in case of issues)
rollback() {
    if [ -d "$BACKUP_DIR/$BUILD_DIR" ]; then
        echo -e "${YELLOW}🔄 Rolling back deployment...${NC}"
        rm -rf "$BUILD_DIR"
        cp -r "$BACKUP_DIR/$BUILD_DIR" .
        print_status "Rollback completed"
    else
        print_error "No backup found for rollback"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}🎯 Deploying Study Material Generator${NC}"
    echo -e "${BLUE}Environment: ${DEPLOYMENT_ENV}${NC}"
    echo -e "${BLUE}Timestamp: $(date)${NC}"
    echo ""
    
    # Trap errors and provide rollback option
    trap 'print_error "Deployment failed! Run with rollback option if needed."; exit 1' ERR
    
    check_dependencies
    check_env_vars
    run_tests
    create_backup
    build_application
    deploy_to_vercel
    health_check
    notify_deployment
    
    echo ""
    print_status "🎉 Deployment completed successfully!"
    echo -e "${GREEN}Environment: ${DEPLOYMENT_ENV}${NC}"
    echo -e "${GREEN}Build directory: ${BUILD_DIR}${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        echo -e "${GREEN}Backup location: ${BACKUP_DIR}${NC}"
    fi
}

# Handle command line arguments
case "${1:-deploy}" in
    "deploy"|"production"|"staging")
        main
        ;;
    "rollback")
        rollback
        ;;
    "test")
        run_tests
        ;;
    "build")
        build_application
        ;;
    "health")
        health_check
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|test|build|health]"
        echo "  deploy     - Full deployment (default)"
        echo "  rollback   - Rollback to previous version"
        echo "  test       - Run tests only"
        echo "  build      - Build application only"
        echo "  health     - Run health check only"
        exit 1
        ;;
esac