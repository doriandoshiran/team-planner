#!/bin/bash

# Team Planner Production Build Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_message() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

print_message $BLUE "=== Building Team Planner for Production ==="

# Build frontend
print_message $YELLOW "Building frontend..."
cd frontend
npm install
npm run build
cd ..
print_message $GREEN "✓ Frontend built successfully"

# Prepare backend
print_message $YELLOW "Preparing backend..."
cd backend
npm install --production
cd ..
print_message $GREEN "✓ Backend prepared"

# Create deployment directory
print_message $YELLOW "Creating deployment structure..."
rm -rf dist
mkdir -p dist/backend
mkdir -p dist/frontend

# Copy backend files
cp -r backend/* dist/backend/
rm -rf dist/backend/node_modules
cd dist/backend
npm install --production
cd ../..

# Copy frontend build
cp -r frontend/build/* dist/frontend/

# Copy deployment files
cp backend/.env.example dist/
cp -r nginx dist/

print_message $GREEN "\n✓ Build completed successfully!"
print_message $BLUE "\nDeployment files are in the 'dist' directory"
print_message $YELLOW "\nNext steps:"
echo "1. Copy the 'dist' directory to your server"
echo "2. Configure .env file on the server"
echo "3. Set up Nginx to serve the frontend and proxy API requests"
echo "4. Use PM2 to run the backend: pm2 start dist/backend/src/server.js"