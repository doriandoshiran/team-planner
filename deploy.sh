#!/bin/bash

# Team Planner Deployment Script
# This script helps you deploy the team planner application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    
    # Check Git
    if ! command_exists git; then
        print_message $RED "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_message $GREEN "All prerequisites are installed!"
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
}

# Function to build application
build_application() {
    print_message $YELLOW "Building application..."
    
    # Build with Docker Compose
    docker-compose build
    
    print_message $GREEN "Build completed successfully!"
}

# Function to start application
start_application() {
    print_message $YELLOW "Starting application..."
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    print_message $YELLOW "Waiting for services to be ready..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_message $GREEN "Application started successfully!"
        print_message $GREEN "Frontend: http://localhost:3000"
        print_message $GREEN "Backend API: http://localhost:5000"
        print_message $GREEN "MongoDB: localhost:27017"
    else
        print_message $RED "Some services failed to start. Check logs with: docker-compose logs"
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
        docker-compose logs -f
    else
        docker-compose logs -f $service
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
    
    # Pull latest changes
    git pull origin main
    
    # Rebuild and restart
    docker-compose down
    docker-compose build
    docker-compose up -d
    
    print_message $GREEN "Application updated successfully!"
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
    echo "  backup      - Create database backup"
    echo "  restore     - Restore database from backup"
    echo "  update      - Update application to latest version"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh setup"
    echo "  ./deploy.sh start"
    echo "  ./deploy.sh logs backend"
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
        build_application
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
        start_application
        ;;
    status)
        docker-compose ps
        ;;
    logs)
        view_logs $2
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
    help)
        show_help
        ;;
    *)
        print_message $YELLOW "Unknown command. Use './deploy.sh help' for usage information."
        show_help
        exit 1
        ;;
esac