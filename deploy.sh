#!/bin/bash

# CheeseSheet Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: development, staging, production

set -e

ENVIRONMENT=${1:-development}
PROJECT_NAME="cheesesheet"

echo "🧀 CheeseSheet Deployment Script"
echo "================================="
echo "Environment: $ENVIRONMENT"
echo "Project: $PROJECT_NAME"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm/pnpm
    if command -v pnpm &> /dev/null; then
        PACKAGE_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
    else
        print_error "Neither npm nor pnpm is available."
        exit 1
    fi
    
    print_success "Prerequisites check passed. Using $PACKAGE_MANAGER"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install --frozen-lockfile
    else
        npm ci
    fi
    
    print_success "Dependencies installed"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm build
    else
        npm run build
    fi
    
    print_success "Application built successfully"
}

# Check environment variables
check_environment() {
    print_status "Checking environment configuration..."
    
    ENV_FILE=".env.local"
    if [ "$ENVIRONMENT" = "production" ]; then
        ENV_FILE=".env.production"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        ENV_FILE=".env.staging"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        print_warning "Environment file $ENV_FILE not found. Creating from template..."
        if [ -f ".env.example" ]; then
            cp .env.example "$ENV_FILE"
            print_warning "Please edit $ENV_FILE with your configuration before continuing."
            read -p "Press Enter to continue after editing the environment file..."
        else
            print_error "No environment template found. Please create $ENV_FILE manually."
            exit 1
        fi
    fi
    
    # Check for required environment variables
    REQUIRED_VARS=("OPENAI_API_KEY" "NEXTAUTH_SECRET")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE" || grep -q "^$var=$" "$ENV_FILE" || grep -q "^$var=your_" "$ENV_FILE"; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        print_error "Missing or incomplete environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        print_error "Please configure these variables in $ENV_FILE"
        exit 1
    fi
    
    print_success "Environment configuration looks good"
}

# Check LaTeX installation
check_latex() {
    print_status "Checking LaTeX installation..."
    
    if command -v pdflatex &> /dev/null; then
        LATEX_VERSION=$(pdflatex --version | head -n1)
        print_success "LaTeX found: $LATEX_VERSION"
    else
        print_warning "LaTeX not found. PDF generation will use Puppeteer fallback."
        print_warning "To install LaTeX:"
        print_warning "  macOS: brew install --cask mactex"
        print_warning "  Ubuntu: sudo apt-get install texlive-full"
        print_warning "  Windows: Download MiKTeX from https://miktex.org/"
    fi
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm test -- --passWithNoTests --watchAll=false
    else
        npm test -- --passWithNoTests --watchAll=false
    fi
    
    print_success "Tests passed"
}

# Deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        vercel --prod --yes
    else
        vercel --yes
    fi
    
    print_success "Deployed to Vercel"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Build Docker image
    print_status "Building Docker image..."
    docker build -t "$PROJECT_NAME:$ENVIRONMENT" .
    
    # Stop existing container if running
    if docker ps -q -f name="$PROJECT_NAME" | grep -q .; then
        print_status "Stopping existing container..."
        docker stop "$PROJECT_NAME"
        docker rm "$PROJECT_NAME"
    fi
    
    # Run new container
    print_status "Starting new container..."
    docker run -d \
        --name "$PROJECT_NAME" \
        --env-file ".env.local" \
        -p 3000:3000 \
        --restart unless-stopped \
        "$PROJECT_NAME:$ENVIRONMENT"
    
    print_success "Docker deployment completed"
}

# Deploy with PM2
deploy_pm2() {
    print_status "Deploying with PM2..."
    
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    fi
    
    # Create PM2 ecosystem file if it doesn't exist
    if [ ! -f "ecosystem.config.js" ]; then
        print_status "Creating PM2 ecosystem file..."
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '$PROJECT_NAME',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Start or restart with PM2
    if pm2 list | grep -q "$PROJECT_NAME"; then
        print_status "Restarting existing PM2 process..."
        pm2 restart "$PROJECT_NAME"
    else
        print_status "Starting new PM2 process..."
        pm2 start ecosystem.config.js
    fi
    
    # Save PM2 configuration
    pm2 save
    
    print_success "PM2 deployment completed"
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    # Wait for application to start
    sleep 5
    
    # Check if application is responding
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        print_success "Health check passed - application is running"
    else
        print_warning "Health check failed - application may still be starting"
        print_status "You can check the status manually at: http://localhost:3000"
    fi
}

# Main deployment function
main() {
    echo "Starting deployment process..."
    echo ""
    
    check_prerequisites
    check_environment
    check_latex
    install_dependencies
    build_application
    
    if [ "$ENVIRONMENT" != "development" ]; then
        run_tests
    fi
    
    # Ask user for deployment method
    echo ""
    print_status "Choose deployment method:"
    echo "1) Vercel (recommended for production)"
    echo "2) Docker"
    echo "3) PM2 (for VPS/dedicated servers)"
    echo "4) Manual (just build, don't deploy)"
    echo ""
    read -p "Enter your choice (1-4): " DEPLOY_METHOD
    
    case $DEPLOY_METHOD in
        1)
            deploy_vercel
            ;;
        2)
            deploy_docker
            health_check
            ;;
        3)
            deploy_pm2
            health_check
            ;;
        4)
            print_success "Build completed. You can now deploy manually."
            ;;
        *)
            print_error "Invalid choice. Exiting."
            exit 1
            ;;
    esac
    
    echo ""
    print_success "🎉 CheeseSheet deployment completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Test your deployment by uploading a PDF"
    echo "2. Verify PDF generation works"
    echo "3. Check image generation features"
    echo "4. Set up monitoring and backups"
    echo ""
    print_status "For troubleshooting, check DEPLOYMENT_GUIDE.md"
}

# Run main function
main