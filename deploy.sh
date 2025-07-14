#!/bin/bash

# Team Planner Deployment Script
# This script helps you deploy the team planner application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_message $YELLOW "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        print_message $RED "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_message $RED "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        print_message $RED "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_message $GREEN "All prerequisites are installed and running!"
}

# Function to setup environment
setup_environment() {
    print_message $YELLOW "Setting up environment..."
    
    # Check if .env exists
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_message $GREEN "Created .env file from .env.example"
            print_message $YELLOW "Please edit .env file with your configuration"
            exit 0
        else
            print_message $RED ".env.example file not found!"
            exit 1
        fi
    fi
    
    print_message $GREEN "Environment setup completed!"
}

# Function to build application
build_application() {
    print_message $YELLOW "Building application..."
    
    # Clean up old images if requested
    if [ "$2" = "--clean" ]; then
        print_message $YELLOW "Cleaning up old images..."
        docker-compose down --rmi all --volumes --remove-orphans 2>/dev/null || true
    fi
    
    # Build with Docker Compose
    docker-compose build --no-cache
    
    print_message $GREEN "Build completed successfully!"
}

# Function to start application
start_application() {
    print_message $YELLOW "Starting application..."
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_message $YELLOW "Waiting for services to be ready..."
    
    # Check health endpoints
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:5000/api/health >/dev/null 2>&1; then
            print_message $GREEN "Backend is healthy!"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done
    
    if [ $attempt -eq $max_attempts ]; then
        print_message $RED "Backend failed to start properly. Check logs with: ./deploy.sh logs backend"
        exit 1
    fi
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_message $GREEN "Application started successfully!"
        print_message $GREEN "Frontend: http://localhost:3000"
        print_message $GREEN "Backend API: http://localhost:5000"
        print_message $GREEN "Backend Health: http://localhost:5000/api/health"
        print_message $GREEN "MongoDB: localhost:27017"
        print_message $BLUE "Use './deploy.sh logs' to monitor application logs"
    else
        print_message $RED "Some services failed to start. Check logs with: ./deploy.sh logs"
        exit 1
    fi
}

# Function to stop application
stop_application() {
    print_message $YELLOW "Stopping application..."
    docker-compose down
    print_message $GREEN "Application stopped!"
}

# Function to view logs
view_logs() {
    service=$1
    if [ -z "$service" ]; then
        print_message $BLUE "Showing logs for all services (Ctrl+C to exit)..."
        docker-compose logs -f
    else
        print_message $BLUE "Showing logs for $service (Ctrl+C to exit)..."
        docker-compose logs -f $service
    fi
}

# Function to check application health
check_health() {
    print_message $YELLOW "Checking application health..."
    
    echo "=== Docker Services Status ==="
    docker-compose ps
    
    echo -e "\n=== Backend Health Check ==="
    if curl -s http://localhost:5000/api/health | jq '.' 2>/dev/null; then
        print_message $GREEN "Backend is healthy!"
    else
        print_message $RED "Backend health check failed!"
        echo "Raw response:"
        curl -s http://localhost:5000/api/health || echo "No response"
    fi
    
    echo -e "\n=== Frontend Health Check ==="
    if curl -s http://localhost:3000/health >/dev/null 2>&1; then
        print_message $GREEN "Frontend is healthy!"
    else
        print_message $RED "Frontend health check failed!"
    fi
    
    echo -e "\n=== Database Connection ==="
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        print_message $GREEN "MongoDB is healthy!"
    else
        print_message $RED "MongoDB connection failed!"
    fi
}

# Function to backup database
backup_database() {
    print_message $YELLOW "Creating database backup..."
    
    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_dir="./backups"
    mkdir -p $backup_dir
    
    # Backup MongoDB
    docker-compose exec -T mongodb mongodump --archive=/tmp/backup.archive --gzip
    docker cp $(docker-compose ps -q mongodb):/tmp/backup.archive $backup_dir/backup_$timestamp.archive
    
    print_message $GREEN "Backup created: $backup_dir/backup_$timestamp.archive"
}

# Function to restore database
restore_database() {
    backup_file=$1
    
    if [ -z "$backup_file" ]; then
        print_message $RED "Please provide backup file path"
        print_message $YELLOW "Usage: ./deploy.sh restore <backup_file>"
        exit 1
    fi
    
    if [ ! -f "$backup_file" ]; then
        print_message $RED "Backup file not found: $backup_file"
        exit 1
    fi
    
    print_message $YELLOW "Restoring database from $backup_file..."
    
    # Copy backup to container and restore
    docker cp $backup_file $(docker-compose ps -q mongodb):/tmp/restore.archive
    docker-compose exec mongodb mongorestore --archive=/tmp/restore.archive --gzip --drop
    
    print_message $GREEN "Database restored successfully!"
}

# Function to update application
update_application() {
    print_message $YELLOW "Updating application..."
    
    # Pull latest changes if in git repo
    if [ -d ".git" ]; then
        git pull origin main
    fi
    
    # Rebuild and restart
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    
    print_message $GREEN "Application updated successfully!"
}

# Function to clean up
cleanup() {
    print_message $YELLOW "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker-compose down --volumes --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    print_message $GREEN "Cleanup completed!"
}

# Function to show help
show_help() {
    echo "Team Planner Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  setup       - Initial setup (create .env file)"
    echo "  build       - Build application containers"
    echo "  start       - Start the application"
    echo "  stop        - Stop the application"
    echo "  restart     - Restart the application"
    echo "  status      - Show application status"
    echo "  logs        - View application logs"
    echo "  health      - Check application health"
    echo "  backup      - Create database backup"
    echo "  restore     - Restore database from backup"
    echo "  update      - Update application to latest version"
    echo "  cleanup     - Clean up Docker resources"
    echo "  help        - Show this help message"
    echo ""
    echo "Options:"
    echo "  build --clean  - Clean build (remove old images)"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh setup"
    echo "  ./deploy.sh build --clean"
    echo "  ./deploy.sh start"
    echo "  ./deploy.sh logs backend"
    echo "  ./deploy.sh health"
    echo "  ./deploy.sh restore ./backups/backup_20240101_120000.archive"
}

# Main script logic
case "$1" in
    setup)
        check_prerequisites
        setup_environment
        ;;
    build)
        check_prerequisites
        build_application "$@"
        ;;
    start)
        check_prerequisites
        start_application
        ;;
    stop)
        stop_application
        ;;
    restart)
        stop_application
        sleep 2
        start_application
        ;;
    status)
        docker-compose ps
        ;;
    logs)
        view_logs $2
        ;;
    health)
        check_health
        ;;
    backup)
        backup_database
        ;;
    restore)
        restore_database $2
        ;;
    update)
        update_application
        ;;
    cleanup)
        cleanup
        ;;
    help)
        show_help
        ;;
    *)
        print_message $YELLOW "Unknown command. Use './deploy.sh help' for usage information."
        show_help
        exit 1
        ;;
esac
