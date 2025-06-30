#!/bin/bash

# Team Planner Quick Start Script
# One command to set up and run everything

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

print_message $BLUE "=== Team Planner Quick Start ==="

# Check if this is first run
if [ ! -f backend/.env ] || [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then
    print_message $YELLOW "First time setup detected. Running initial setup..."
    
    # Install backend dependencies
    print_message $YELLOW "Installing backend dependencies..."
    cd backend
    npm install
    
    # Create .env if doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        print_message $YELLOW "Created backend/.env - Please configure it!"
    fi
    cd ..
    
    # Install frontend dependencies
    print_message $YELLOW "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    print_message $GREEN "✓ Initial setup complete!"
fi

# Update .env for development
print_message $YELLOW "Configuring for local development..."
cd backend
sed -i 's/NODE_ENV=production/NODE_ENV=development/g' .env 2>/dev/null || \
sed -i '' 's/NODE_ENV=production/NODE_ENV=development/g' .env 2>/dev/null || true
sed -i 's/MONGODB_URI=.*/MONGODB_URI=mongodb:\/\/localhost:27017\/team-planner/g' .env 2>/dev/null || \
sed -i '' 's/MONGODB_URI=.*/MONGODB_URI=mongodb:\/\/localhost:27017\/team-planner/g' .env 2>/dev/null || true
cd ..

# Start services
print_message $BLUE "Starting services..."
./start-dev.sh