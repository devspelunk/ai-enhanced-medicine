#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Medication Drug Information Platform Setup${NC}"
echo -e "${BLUE}=================================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check dependencies
check_dependencies() {
    echo -e "${BLUE}Checking system dependencies...${NC}"
    
    local deps_missing=false
    
    if ! command_exists docker; then
        echo -e "${RED}❌ Docker is not installed${NC}"
        deps_missing=true
    else
        echo -e "${GREEN}✅ Docker found${NC}"
    fi
    
    if ! command_exists docker-compose; then
        echo -e "${RED}❌ Docker Compose is not installed${NC}"
        deps_missing=true
    else
        echo -e "${GREEN}✅ Docker Compose found${NC}"
    fi
    
    if [ "$deps_missing" = true ]; then
        echo -e "${RED}Please install missing dependencies before continuing${NC}"
        echo -e "${YELLOW}Visit: https://docs.docker.com/get-docker/${NC}"
        exit 1
    fi
}

# Function to check for Labels.json
check_labels_file() {
    echo -e "${BLUE}Checking for FDA Labels data file...${NC}"
    
    if [ ! -f "Labels.json" ]; then
        echo -e "${YELLOW}⚠️  Labels.json file not found in the current directory${NC}"
        echo -e "${YELLOW}Please download the FDA Labels data file and place it in this directory${NC}"
        echo -e "${YELLOW}The file should be named 'Labels.json'${NC}"
        echo ""
        echo -e "${BLUE}You can download it from:${NC}"
        echo -e "${BLUE}https://open.fda.gov/drug/label/download/${NC}"
        echo ""
        read -p "Do you want to continue without the Labels.json file? (y/N): " continue_without
        if [[ ! $continue_without =~ ^[Yy]$ ]]; then
            echo -e "${RED}Setup cancelled. Please add Labels.json and run again.${NC}"
            exit 1
        fi
        echo -e "${YELLOW}⚠️  Continuing without Labels.json - seeder will not populate data${NC}"
    else
        echo -e "${GREEN}✅ Labels.json found${NC}"
        
        # Check file size
        local file_size=$(stat -c%s "Labels.json" 2>/dev/null || stat -f%z "Labels.json" 2>/dev/null || echo "0")
        local file_size_mb=$((file_size / 1024 / 1024))
        echo -e "${GREEN}   File size: ${file_size_mb}MB${NC}"
    fi
}

# Function to check environment variables
check_environment() {
    echo -e "${BLUE}Checking environment variables...${NC}"
    
    if [ -z "${OPENAI_API_KEY}" ]; then
        echo -e "${YELLOW}⚠️  OPENAI_API_KEY environment variable not set${NC}"
        echo -e "${YELLOW}AI content generation features will not work${NC}"
        echo -e "${YELLOW}You can set it with: export OPENAI_API_KEY=your_api_key${NC}"
        echo -e "${YELLOW}Or create a .env file in this directory${NC}"
    else
        echo -e "${GREEN}✅ OPENAI_API_KEY configured${NC}"
    fi
}

# Function to create .env file if it doesn't exist
create_env_file() {
    if [ ! -f ".env" ]; then
        echo -e "${BLUE}Creating .env file...${NC}"
        cat > .env << EOF
# Medication Environment Variables

# OpenAI API Key (required for AI content generation)
OPENAI_API_KEY=${OPENAI_API_KEY:-your_openai_api_key_here}

# Development settings
NODE_ENV=development
EOF
        echo -e "${GREEN}✅ .env file created${NC}"
        echo -e "${YELLOW}📝 Please edit .env file to add your OpenAI API key${NC}"
    else
        echo -e "${GREEN}✅ .env file exists${NC}"
    fi
}

# Function to start the services
start_services() {
    echo -e "${BLUE}Starting Docker services...${NC}"
    echo -e "${YELLOW}This may take a few minutes on first run...${NC}"
    
    # Build and start services
    docker-compose up --build -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Services started successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to start services${NC}"
        exit 1
    fi
}

# Function to show service status
show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}Available Endpoints:${NC}"
    echo -e "${GREEN}🌐 Web Application:     http://localhost:3000${NC}"
    echo -e "${GREEN}🔌 API Server:          http://localhost:3001${NC}"
    echo -e "${GREEN}📊 API Documentation:   http://localhost:3001/api/docs${NC}"
    echo -e "${GREEN}🗄️  Database:            localhost:5432${NC}"
    echo -e "${GREEN}🔴 Redis Cache:         localhost:6379${NC}"
    echo -e "${GREEN}🌱 Seeder Health:       http://localhost:8080/health${NC}"
    echo -e "${GREEN}🤖 AI Content Server:   http://localhost:8000${NC}"
    echo -e "${GREEN}🔍 AI Health Monitor:   http://localhost:8081/health${NC}"
}

# Function to wait for services to be ready
wait_for_services() {
    echo -e "${BLUE}Waiting for services to be ready...${NC}"
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3001/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ API server is ready${NC}"
            break
        fi
        
        echo -e "${YELLOW}⏳ Waiting for API server... (attempt $attempt/$max_attempts)${NC}"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        echo -e "${YELLOW}⚠️  API server may still be starting up${NC}"
    fi
}

# Function to show helpful commands
show_commands() {
    echo ""
    echo -e "${BLUE}Helpful Commands:${NC}"
    echo -e "${GREEN}View logs:              docker-compose logs -f [service_name]${NC}"
    echo -e "${GREEN}Stop services:          docker-compose down${NC}"
    echo -e "${GREEN}Restart services:       docker-compose restart${NC}"
    echo -e "${GREEN}View seeder logs:       docker-compose logs -f drug-seeder${NC}"
    echo -e "${GREEN}View AI server logs:    docker-compose logs -f ai-content-server${NC}"
    echo -e "${GREEN}Shell into container:   docker-compose exec [service_name] bash${NC}"
    echo ""
    echo -e "${BLUE}Service Names:${NC}"
    echo -e "• postgres            (PostgreSQL database)"
    echo -e "• redis               (Redis cache)"
    echo -e "• api                 (NestJS API server)"
    echo -e "• web                 (Next.js web application)"
    echo -e "• drug-seeder         (Python FDA data seeder)"
    echo -e "• ai-content-server   (MCP AI content generation)"
}

# Function to handle cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Setup interrupted${NC}"
    exit 1
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    echo -e "${BLUE}Starting setup process...${NC}"
    echo ""
    
    # Run all checks
    check_dependencies
    check_labels_file
    check_environment
    create_env_file
    
    echo ""
    echo -e "${BLUE}All checks passed! Starting services...${NC}"
    echo ""
    
    # Start services
    start_services
    
    # Wait for readiness
    wait_for_services
    
    # Show status
    echo ""
    show_status
    
    # Show helpful commands
    show_commands
    
    echo ""
    echo -e "${GREEN}🎉 Setup complete! Your drug information platform is running.${NC}"
    echo -e "${BLUE}Visit http://localhost:3000 to get started${NC}"
}

# Handle command line arguments
case "${1:-}" in
    "check")
        check_dependencies
        check_labels_file
        check_environment
        ;;
    "start")
        start_services
        show_status
        ;;
    "status")
        show_status
        ;;
    "stop")
        echo -e "${BLUE}Stopping all services...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Services stopped${NC}"
        ;;
    "logs")
        if [ -n "${2:-}" ]; then
            docker-compose logs -f "$2"
        else
            docker-compose logs -f
        fi
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (default)  Run full setup process"
        echo "  check      Check dependencies and requirements"
        echo "  start      Start all services"
        echo "  stop       Stop all services"
        echo "  status     Show service status and endpoints"
        echo "  logs       Show logs for all services"
        echo "  logs <service>  Show logs for specific service"
        echo "  help       Show this help message"
        ;;
    *)
        main
        ;;
esac