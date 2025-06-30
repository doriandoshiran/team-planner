#!/bin/bash

# Team Planner Development Startup Script
# This script starts all services for development

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

# Check if MongoDB is running
check_mongodb() {
    if ! pgrep -x "mongod" > /dev/null; then
        print_message $YELLOW "MongoDB is not running. Starting MongoDB..."
        sudo systemctl start mongod
        sleep 2
    fi
    print_message $GREEN "✓ MongoDB is running"
}

# Check if .env exists
check_env() {
    if [ ! -f backend/.env ]; then
        print_message $RED "backend/.env file not found!"
        print_message $YELLOW "Creating from .env.example..."
        cp backend/.env.example backend/.env
        print_message $YELLOW "Please edit backend/.env with your configuration"
        exit 1
    fi
    print_message $GREEN "✓ Environment file exists"
}

# Start backend
start_backend() {
    print_message $BLUE "Starting backend server..."
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    sleep 5
    print_message $GREEN "✓ Backend started (PID: $BACKEND_PID)"
}

# Start frontend
start_frontend() {
    print_message $BLUE "Starting frontend server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    print_message $GREEN "✓ Frontend started (PID: $FRONTEND_PID)"
}

# Cleanup function
cleanup() {
    print_message $YELLOW "\nShutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    print_message $GREEN "Services stopped"
    exit 0
}

# Set up trap to cleanup on exit
trap cleanup EXIT INT TERM

# Main execution
print_message $BLUE "=== Team Planner Development Server ==="
echo ""

check_mongodb
check_env
start_backend
start_frontend

print_message $GREEN "\n✓ All services started successfully!"
print_message $BLUE "\nAccess the application at:"
print_message $GREEN "  Frontend: http://localhost:3000"
print_message $GREEN "  Backend API: http://localhost:5000"
print_message $YELLOW "\nPress Ctrl+C to stop all services"

# Keep script running
while true; do
    sleep 1
done