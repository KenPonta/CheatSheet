#!/bin/bash

# CheeseSheet Setup Script
# Quick setup for development environment

set -e

echo "🧀 CheeseSheet Setup"
echo "==================="
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

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        print_status "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node --version)"
        print_status "Please update Node.js from https://nodejs.org/"
        exit 1
    fi
    
    print_success "Node.js $(node --version) is installed"
}

# Install dependencies
install_deps() {
    print_status "Installing dependencies..."
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    
    print_success "Dependencies installed"
}

# Setup environment file
setup_env() {
    if [ ! -f ".env.local" ]; then
        print_status "Creating environment file..."
        
        if [ -f ".env.example" ]; then
            cp .env.example .env.local
        else
            cat > .env.local << EOF
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key_here

# LaTeX Configuration
ENABLE_LATEX_PDF=true
LATEX_ENGINE=pdflatex
LATEX_TIMEOUT=60000

# Image Generation
ENABLE_PUPPETEER_FALLBACK=true

# Performance Settings
NODE_OPTIONS=--max-old-space-size=4096
PROCESSING_MODE=balanced

# Security (Generate random secrets)
NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "your-secret-key-here")
NEXTAUTH_URL=http://localhost:3000
EOF
        fi
        
        print_success "Environment file created: .env.local"
        print_warning "Please edit .env.local and add your OpenAI API key"
    else
        print_success "Environment file already exists"
    fi
}

# Check LaTeX installation
check_latex() {
    if command -v pdflatex &> /dev/null; then
        print_success "LaTeX is installed"
    else
        print_warning "LaTeX not found - PDF generation will use browser fallback"
        print_status "To install LaTeX:"
        echo "  macOS:   brew install --cask mactex"
        echo "  Ubuntu:  sudo apt-get install texlive-full"
        echo "  Windows: Download from https://miktex.org/"
        echo ""
    fi
}

# Create necessary directories
create_dirs() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p tmp
    mkdir -p public/generated
    
    print_success "Directories created"
}

# Run initial test
test_setup() {
    print_status "Testing setup..."
    
    if command -v pnpm &> /dev/null; then
        pnpm run dev --help &> /dev/null
    else
        npm run dev --help &> /dev/null
    fi
    
    print_success "Setup test passed"
}

# Main setup function
main() {
    print_status "Setting up CheeseSheet development environment..."
    echo ""
    
    check_node
    install_deps
    setup_env
    check_latex
    create_dirs
    test_setup
    
    echo ""
    print_success "🎉 CheeseSheet setup completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Edit .env.local and add your OpenAI API key"
    echo "2. Run 'npm run dev' or 'pnpm dev' to start development server"
    echo "3. Open http://localhost:3000 in your browser"
    echo "4. Upload a test PDF to verify everything works"
    echo ""
    print_status "For deployment, run: ./deploy.sh"
    print_status "For help, check: DEPLOYMENT_GUIDE.md"
}

main