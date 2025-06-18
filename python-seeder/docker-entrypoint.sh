#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[SEEDER]${NC} Starting FDA Drug Labels Database Seeder..."

# Function to wait for postgres
wait_for_postgres() {
    echo -e "${BLUE}[SEEDER]${NC} Waiting for PostgreSQL to be ready..."
    
    until python -c "
import psycopg2
import os
import sys
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'postgres'),
        port=int(os.getenv('DB_PORT', '5432')),
        user=os.getenv('DB_USERNAME', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'password'),
        database=os.getenv('DB_NAME', 'druginfo')
    )
    conn.close()
    print('PostgreSQL is ready!')
    sys.exit(0)
except Exception as e:
    print(f'PostgreSQL not ready: {e}')
    sys.exit(1)
    "; do
        echo -e "${YELLOW}[SEEDER]${NC} PostgreSQL is unavailable - sleeping for 2 seconds"
        sleep 2
    done
    
    echo -e "${GREEN}[SEEDER]${NC} PostgreSQL is ready!"
}

# Function to check if Labels.json exists
check_labels_file() {
    if [ ! -f "/app/Labels.json" ]; then
        echo -e "${RED}[SEEDER]${NC} Error: Labels.json file not found at /app/Labels.json"
        echo -e "${YELLOW}[SEEDER]${NC} Please mount the Labels.json file as a volume:"
        echo -e "${YELLOW}[SEEDER]${NC} docker run -v /path/to/Labels.json:/app/Labels.json ..."
        exit 1
    fi
    
    echo -e "${GREEN}[SEEDER]${NC} Labels.json file found"
}

# Function to run database seeding
run_seeding() {
    echo -e "${BLUE}[SEEDER]${NC} Starting database seeding process..."
    
    # Check if we should run in batch mode or interactive mode
    if [ "${SEEDER_MODE}" = "auto" ]; then
        echo -e "${BLUE}[SEEDER]${NC} Running in automatic mode"
        python src/main.py /app/Labels.json --no-progress 2>&1 | tee /app/logs/seeder.log
    else
        echo -e "${BLUE}[SEEDER]${NC} Running in interactive mode"
        python src/main.py /app/Labels.json 2>&1 | tee /app/logs/seeder.log
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}[SEEDER]${NC} Database seeding completed successfully!"
        
        # Create success marker file
        touch /app/logs/seeding_complete.flag
        echo "$(date)" > /app/logs/seeding_complete.flag
        
    else
        echo -e "${RED}[SEEDER]${NC} Database seeding failed with exit code: $exit_code"
        echo "$(date): Seeding failed with exit code $exit_code" > /app/logs/seeding_failed.flag
        exit $exit_code
    fi
}

# Function to start monitoring mode (for keeping container alive)
start_monitoring() {
    echo -e "${BLUE}[SEEDER]${NC} Starting monitoring mode..."
    echo -e "${YELLOW}[SEEDER]${NC} Container will stay alive for monitoring. Use docker logs to view output."
    
    # Simple HTTP server for health checks
    python -c "
import http.server
import socketserver
import os
from datetime import datetime

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            if os.path.exists('/app/logs/seeding_complete.flag'):
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                with open('/app/logs/seeding_complete.flag', 'r') as f:
                    completion_time = f.read().strip()
                
                response = f'{{\"status\": \"completed\", \"completion_time\": \"{completion_time}\"}}'
                self.wfile.write(response.encode())
            elif os.path.exists('/app/logs/seeding_failed.flag'):
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                with open('/app/logs/seeding_failed.flag', 'r') as f:
                    failure_time = f.read().strip()
                
                response = f'{{\"status\": \"failed\", \"failure_time\": \"{failure_time}\"}}'
                self.wfile.write(response.encode())
            else:
                self.send_response(202)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                response = f'{{\"status\": \"running\", \"current_time\": \"{datetime.now().isoformat()}\"}}'
                self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

PORT = 8080
with socketserver.TCPServer(('', PORT), HealthHandler) as httpd:
    print(f'Health check server running on port {PORT}')
    httpd.serve_forever()
"
}

# Main execution
main() {
    # Wait for dependencies
    wait_for_postgres
    
    # Check for required files
    check_labels_file
    
    # Create logs directory if it doesn't exist
    mkdir -p /app/logs
    
    # Run the seeding process
    run_seeding
    
    # Check if we should keep the container running
    if [ "${SEEDER_KEEP_ALIVE}" = "true" ]; then
        start_monitoring
    else
        echo -e "${GREEN}[SEEDER]${NC} Seeding process completed. Container will exit."
    fi
}

# Handle different commands
case "$1" in
    "python")
        # If python command is passed, run it directly
        exec "$@"
        ;;
    "bash"|"sh")
        # If shell is requested, start it
        exec "$@"
        ;;
    *)
        # Default: run the main seeding process
        main
        ;;
esac