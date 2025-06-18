#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[MCP-AI]${NC} Starting Drug AI Content MCP Server..."

# Function to wait for postgres
wait_for_postgres() {
    echo -e "${BLUE}[MCP-AI]${NC} Waiting for PostgreSQL to be ready..."
    
    until python -c "
import asyncpg
import asyncio
import os
import sys

async def check_db():
    try:
        conn = await asyncpg.connect(
            host=os.getenv('DB_HOST', 'postgres'),
            port=int(os.getenv('DB_PORT', '5432')),
            user=os.getenv('DB_USERNAME', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'password'),
            database=os.getenv('DB_NAME', 'druginfo')
        )
        await conn.close()
        print('PostgreSQL is ready!')
        return True
    except Exception as e:
        print(f'PostgreSQL not ready: {e}')
        return False

if asyncio.run(check_db()):
    sys.exit(0)
else:
    sys.exit(1)
    "; do
        echo -e "${YELLOW}[MCP-AI]${NC} PostgreSQL is unavailable - sleeping for 2 seconds"
        sleep 2
    done
    
    echo -e "${GREEN}[MCP-AI]${NC} PostgreSQL is ready!"
}

# Function to check OpenAI API key
check_openai_key() {
    if [ -z "${OPENAI_API_KEY}" ]; then
        echo -e "${RED}[MCP-AI]${NC} Error: OPENAI_API_KEY environment variable is required"
        echo -e "${YELLOW}[MCP-AI]${NC} Please set OPENAI_API_KEY before starting the server"
        exit 1
    fi
    
    echo -e "${GREEN}[MCP-AI]${NC} OpenAI API key configured"
}

# Function to test OpenAI connection
test_openai_connection() {
    echo -e "${BLUE}[MCP-AI]${NC} Testing OpenAI API connection..."
    
    python -c "
import openai
import os
import sys

try:
    client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    # Make a simple test request
    response = client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': 'Hello'}],
        max_tokens=5
    )
    print('OpenAI API connection successful!')
    sys.exit(0)
except Exception as e:
    print(f'OpenAI API connection failed: {e}')
    sys.exit(1)
" 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[MCP-AI]${NC} OpenAI API connection verified"
    else
        echo -e "${YELLOW}[MCP-AI]${NC} Warning: Could not verify OpenAI API connection"
        echo -e "${YELLOW}[MCP-AI]${NC} Server will start but AI features may not work"
    fi
}

# Function to start the MCP server
start_mcp_server() {
    echo -e "${BLUE}[MCP-AI]${NC} Starting MCP AI Content Server..."
    
    # Create logs directory if it doesn't exist
    mkdir -p /app/logs
    
    # Check if we should run in development mode
    if [ "${MCP_DEV_MODE}" = "true" ]; then
        echo -e "${BLUE}[MCP-AI]${NC} Running in development mode with auto-reload"
        python src/main.py --dev 2>&1 | tee /app/logs/mcp-server.log
    else
        echo -e "${BLUE}[MCP-AI]${NC} Running in production mode"
        python src/main.py 2>&1 | tee /app/logs/mcp-server.log
    fi
    
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        echo -e "${RED}[MCP-AI]${NC} MCP server failed with exit code: $exit_code"
        echo "$(date): MCP server failed with exit code $exit_code" > /app/logs/server_failed.flag
        exit $exit_code
    fi
}

# Function to start health monitoring server
start_health_server() {
    echo -e "${BLUE}[MCP-AI]${NC} Starting health monitoring server on port 8080..."
    
    python -c "
import http.server
import socketserver
import json
import os
from datetime import datetime
import subprocess

class HealthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            try:
                # Check if main process is running
                main_running = self.check_main_process()
                
                # Check database connectivity
                db_status = self.check_database()
                
                # Check OpenAI API
                openai_status = self.check_openai()
                
                status = 'healthy' if (main_running and db_status and openai_status) else 'unhealthy'
                
                self.send_response(200 if status == 'healthy' else 503)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                response = {
                    'status': status,
                    'timestamp': datetime.now().isoformat(),
                    'components': {
                        'main_process': main_running,
                        'database': db_status,
                        'openai_api': openai_status
                    }
                }
                
                self.wfile.write(json.dumps(response, indent=2).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                
                response = {
                    'status': 'error',
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
                
                self.wfile.write(json.dumps(response, indent=2).encode())
        
        elif self.path == '/logs':
            self.send_response(200)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            
            try:
                with open('/app/logs/mcp-server.log', 'r') as f:
                    logs = f.read()
                self.wfile.write(logs.encode())
            except:
                self.wfile.write(b'No logs available')
        
        else:
            self.send_response(404)
            self.end_headers()
    
    def check_main_process(self):
        try:
            result = subprocess.run(['pgrep', '-f', 'src/main.py'], capture_output=True)
            return result.returncode == 0
        except:
            return False
    
    def check_database(self):
        try:
            import asyncpg
            import asyncio
            import os
            
            async def test_db():
                conn = await asyncpg.connect(
                    host=os.getenv('DB_HOST', 'postgres'),
                    port=int(os.getenv('DB_PORT', '5432')),
                    user=os.getenv('DB_USERNAME', 'postgres'),
                    password=os.getenv('DB_PASSWORD', 'password'),
                    database=os.getenv('DB_NAME', 'druginfo')
                )
                await conn.execute('SELECT 1')
                await conn.close()
                return True
            
            return asyncio.run(test_db())
        except:
            return False
    
    def check_openai(self):
        try:
            import openai
            import os
            
            if not os.getenv('OPENAI_API_KEY'):
                return False
            
            client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
            client.chat.completions.create(
                model='gpt-4o-mini',
                messages=[{'role': 'user', 'content': 'test'}],
                max_tokens=1
            )
            return True
        except:
            return False
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

PORT = 8080
with socketserver.TCPServer(('', PORT), HealthHandler) as httpd:
    print(f'Health monitoring server running on port {PORT}')
    httpd.serve_forever()
" &
    
    # Store health server PID
    echo $! > /tmp/health_server.pid
}

# Function to handle shutdown
cleanup() {
    echo -e "${YELLOW}[MCP-AI]${NC} Shutting down services..."
    
    # Kill health server if running
    if [ -f /tmp/health_server.pid ]; then
        kill $(cat /tmp/health_server.pid) 2>/dev/null || true
        rm -f /tmp/health_server.pid
    fi
    
    # Kill any remaining Python processes
    pkill -f "src/main.py" 2>/dev/null || true
    
    echo -e "${GREEN}[MCP-AI]${NC} Cleanup complete"
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main execution
main() {
    # Wait for dependencies
    wait_for_postgres
    
    # Check OpenAI configuration
    check_openai_key
    test_openai_connection
    
    # Start health monitoring in background
    if [ "${MCP_HEALTH_SERVER}" != "false" ]; then
        start_health_server
    fi
    
    # Start the main MCP server
    start_mcp_server
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
    "health")
        # Start only health server for debugging
        start_health_server
        ;;
    *)
        # Default: run the main MCP server
        main
        ;;
esac