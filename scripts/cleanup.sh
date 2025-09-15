#!/bin/bash

# CheeseSheet Repository Cleanup Script
# Usage: ./scripts/cleanup.sh

set -e

echo "🧹 CheeseSheet Repository Cleanup"
echo "================================="

# Colors for output
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

# Clean build artifacts
clean_build_artifacts() {
    print_status "Cleaning build artifacts..."
    
    rm -rf .next/
    rm -rf out/
    rm -rf build/
    rm -rf dist/
    rm -f *.tsbuildinfo
    rm -f .DS_Store
    
    print_success "Build artifacts cleaned"
}

# Clean node modules and reinstall
clean_dependencies() {
    print_status "Cleaning dependencies..."
    
    rm -rf node_modules/
    rm -f package-lock.json
    
    if command -v pnpm &> /dev/null; then
        pnpm install
    else
        npm install
    fi
    
    print_success "Dependencies cleaned and reinstalled"
}

# Clean temporary files
clean_temp_files() {
    print_status "Cleaning temporary files..."
    
    rm -rf tmp/
    rm -f *.tmp
    rm -f *.temp
    rm -f *.log
    
    print_success "Temporary files cleaned"
}

# Clean test outputs
clean_test_outputs() {
    print_status "Cleaning test outputs..."
    
    rm -rf coverage/
    rm -f test-results.xml
    rm -f junit.xml
    
    print_success "Test outputs cleaned"
}

# Organize files that might be misplaced
organize_files() {
    print_status "Organizing misplaced files..."
    
    # Move any test files to archive
    if ls test-*.js test-*.md debug-*.js 2>/dev/null; then
        mkdir -p archive/test-files/
        mv test-*.js test-*.md debug-*.js archive/test-files/ 2>/dev/null || true
        print_warning "Moved test files to archive"
    fi
    
    # Move any documentation files to docs
    if ls TASK_*.md *_SUMMARY.md 2>/dev/null; then
        mkdir -p archive/old-docs/
        mv TASK_*.md *_SUMMARY.md archive/old-docs/ 2>/dev/null || true
        print_warning "Moved old documentation to archive"
    fi
    
    print_success "File organization complete"
}

# Main cleanup function
main() {
    echo "Choose cleanup level:"
    echo "1) Light cleanup (build artifacts, temp files)"
    echo "2) Medium cleanup (+ test outputs, organize files)"
    echo "3) Full cleanup (+ reinstall dependencies)"
    echo ""
    read -p "Enter your choice (1-3): " CLEANUP_LEVEL
    
    case $CLEANUP_LEVEL in
        1)
            clean_build_artifacts
            clean_temp_files
            ;;
        2)
            clean_build_artifacts
            clean_temp_files
            clean_test_outputs
            organize_files
            ;;
        3)
            clean_build_artifacts
            clean_temp_files
            clean_test_outputs
            organize_files
            clean_dependencies
            ;;
        *)
            print_warning "Invalid choice. Running light cleanup..."
            clean_build_artifacts
            clean_temp_files
            ;;
    esac
    
    echo ""
    print_success "🎉 Repository cleanup completed!"
    print_status "Repository is now clean and organized"
}

# Run main function
main