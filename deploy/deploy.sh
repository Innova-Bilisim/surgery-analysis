#!/bin/bash

# Surgery Analysis Deployment Script
# Usage: ./deploy.sh [start|stop|restart|logs|status|build]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="surgery-analysis"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE="environment.prod"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed!"
        exit 1
    fi
    
    log_success "Dependencies OK"
}

check_directories() {
    log_info "Checking required directories..."
    
    # Logs directory
    if [ ! -d "./logs" ]; then
        log_info "Creating logs directory..."
        mkdir -p ./logs
    fi
    
    # SSL directory (for nginx)
    if [ ! -d "./nginx/ssl" ]; then
        log_info "Creating SSL directory..."
        mkdir -p ./nginx/ssl
        log_warning "SSL certificates not found. Please place cert.pem and key.pem in ./nginx/ssl/"
    fi
    
    # Environment file check
    if [ ! -f ".env.production" ]; then
        log_info "Creating .env.production from template..."
        cp env.production .env.production
        log_warning ".env.production created from template. Please review and update values if needed."
    fi
    
    # Check if video files exist in project (kritik: Docker volume mount için gerekli)
    if [ ! -d "../public/videos" ]; then
        log_warning "Video directory not found: ../public/videos"
        log_info "Creating video directory..."
        mkdir -p ../public/videos
        log_info "📁 Video directory created: ../public/videos"
        log_warning "⚠️  Please copy your video files to this directory before deployment:"
        log_info "  cp /path/to/your/videos/*.mp4 ../public/videos/"
        log_info "  # Make sure video01.mp4 exists for default video"
        echo ""
        read -p "Press Enter after copying video files, or 'q' to quit: " user_input
        if [ "$user_input" = "q" ] || [ "$user_input" = "Q" ]; then
            log_info "Deployment cancelled. Please copy video files and run again."
            return 1
        fi
    fi
    
    # Check if video files exist
    if [ ! "$(ls -A ../public/videos 2>/dev/null)" ]; then
        log_error "Video directory is still empty: ../public/videos"
        log_error "Video files are required for the application to work!"
        log_info "Please copy video files (*.mp4) to the videos directory:"
        log_info "  cp /path/to/your/videos/*.mp4 ../public/videos/"
        log_info "  # Ensure video01.mp4 exists for default video"
        return 1
    else
        video_count=$(find ../public/videos -name "*.mp4" | wc -l)
        log_success "Found $video_count video file(s) in ../public/videos"
        
        # Check for default video
        if [ ! -f "../public/videos/video01.mp4" ]; then
            log_warning "Default video 'video01.mp4' not found"
            log_info "Application may not work properly without default video"
            log_info "Please ensure video01.mp4 exists or update NEXT_PUBLIC_DEFAULT_VIDEO"
        else
            log_success "Default video 'video01.mp4' found"
        fi
    fi
    
    log_success "Directories and files OK"
}

build_images() {
    log_info "Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    log_success "Images built successfully"
}

start_services() {
    log_info "Starting services..."
    docker-compose -f $COMPOSE_FILE up -d
    log_success "Services started"
    
    # Wait for health check
    log_info "Waiting for application to be ready..."
    sleep 30
    
    if check_health; then
        log_success "Application is ready!"
        show_status
    else
        log_error "Application failed to start properly"
        show_logs
        exit 1
    fi
}

start_with_nginx() {
    log_info "Starting services with Nginx..."
    docker-compose -f $COMPOSE_FILE --profile with-nginx up -d
    log_success "Services with Nginx started"
    
    # Wait for health check
    log_info "Waiting for application to be ready..."
    sleep 30
    
    if check_health; then
        log_success "Application is ready!"
        show_status
    else
        log_error "Application failed to start properly"
        show_logs
        exit 1
    fi
}

stop_services() {
    log_info "Stopping services..."
    docker-compose -f $COMPOSE_FILE down
    log_success "Services stopped"
}

restart_services() {
    log_info "Restarting services..."
    stop_services
    start_services
}

show_logs() {
    log_info "Showing logs..."
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
}

show_status() {
    log_info "Service status:"
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    
    # Show service URLs
    echo -e "${GREEN}Service URLs:${NC}"
    echo "  • Application: http://localhost:3000"
    echo "  • With Nginx: https://localhost (if nginx profile is used)"
    echo ""
    
    # Show health status
    if check_health; then
        echo -e "${GREEN}✓ Application is healthy${NC}"
    else
        echo -e "${RED}✗ Application is not responding${NC}"
    fi
}

check_health() {
    # Check if container is running
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "surgery-analysis-web.*Up"; then
        return 1
    fi
    
    # Check HTTP endpoint
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

cleanup() {
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f
    docker volume prune -f
    log_success "Cleanup completed"
}

update() {
    log_info "Updating application..."
    git pull
    build_images
    restart_services
    log_success "Update completed"
}

check_videos() {
    log_info "Checking video files status..."
    echo ""
    
    # Check video directory
    if [ ! -d "../public/videos" ]; then
        log_error "❌ Video directory not found: ../public/videos"
        log_info "💡 Run 'mkdir -p ../public/videos' to create it"
        return 1
    else
        log_success "✅ Video directory exists: ../public/videos"
    fi
    
    # Check if directory is empty
    if [ ! "$(ls -A ../public/videos 2>/dev/null)" ]; then
        log_warning "⚠️  Video directory is empty!"
        log_info "💡 Copy your video files:"
        log_info "   cp /path/to/your/videos/*.mp4 ../public/videos/"
        return 1
    fi
    
    # Count and list video files
    video_count=$(find ../public/videos -name "*.mp4" | wc -l)
    log_success "📹 Found $video_count video file(s):"
    
    # List video files with sizes
    for video in ../public/videos/*.mp4; do
        if [ -f "$video" ]; then
            filename=$(basename "$video")
            filesize=$(du -h "$video" | cut -f1)
            echo "   📄 $filename ($filesize)"
        fi
    done
    
    # Check default video
    echo ""
    if [ -f "../public/videos/video01.mp4" ]; then
        default_size=$(du -h "../public/videos/video01.mp4" | cut -f1)
        log_success "🎯 Default video found: video01.mp4 ($default_size)"
    else
        log_warning "⚠️  Default video 'video01.mp4' not found!"
        log_info "💡 Copy your main video as video01.mp4:"
        log_info "   cp your-main-video.mp4 ../public/videos/video01.mp4"
    fi
    
    echo ""
    log_info "Video setup complete! ✨"
}

# Main script
case "$1" in
    start)
        check_dependencies
        check_directories
        start_services
        ;;
    start-nginx)
        check_dependencies
        check_directories
        start_with_nginx
        ;;
    stop)
        stop_services
        ;;
    restart)
        check_dependencies
        check_directories
        restart_services
        ;;
    build)
        check_dependencies
        build_images
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    health)
        if check_health; then
            log_success "Application is healthy"
            exit 0
        else
            log_error "Application is not healthy"
            exit 1
        fi
        ;;
    videos)
        check_videos
        ;;
    cleanup)
        cleanup
        ;;
    update)
        update
        ;;
    *)
        echo "🏥 Surgery Analysis - Docker Deployment Tool"
        echo ""
        echo "Usage: $0 {start|start-nginx|stop|restart|build|logs|status|health|videos|cleanup|update}"
        echo ""
        echo "Commands:"
        echo "  start       - Start the application"
        echo "  start-nginx - Start the application with Nginx reverse proxy"
        echo "  stop        - Stop the application"
        echo "  restart     - Restart the application"
        echo "  build       - Build Docker images"
        echo "  logs        - Show application logs"
        echo "  status      - Show service status"
        echo "  health      - Check application health"
        echo "  videos      - Check video files status (useful before deployment)"
        echo "  cleanup     - Clean up unused Docker resources"
        echo "  update      - Update from git and restart"
        echo ""
        echo "📹 Video Setup Flow:"
        echo "  1. Clone from GitHub (videos not included)"
        echo "  2. Run: ./deploy.sh videos  (check video status)"
        echo "  3. Copy videos: cp /path/to/videos/*.mp4 ../public/videos/"
        echo "  4. Run: ./deploy.sh start"
        exit 1
        ;;
esac 