#!/bin/bash

# FDA Drug Labels Database Seeder Script
# Usage: ./run-seeder.sh [OPTIONS]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
LABELS_FILE="../Labels.json"
BATCH_SIZE=100
RESUME_FROM=0
CREATE_INDEXES=true
SHOW_PROGRESS=true

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
usage() {
    cat << EOF
FDA Drug Labels Database Seeder

Usage: $0 [OPTIONS]

OPTIONS:
    -f, --file FILE         Path to Labels.json file (default: ../Labels.json)
    -b, --batch-size SIZE   Number of records per batch (default: 100)
    -r, --resume-from NUM   Resume from specific record number (default: 0)
    --no-indexes           Skip creating database indexes (faster for testing)
    --no-progress          Disable progress bar (useful for logging)
    -h, --help             Show this help message

EXAMPLES:
    # Basic usage
    $0

    # Custom batch size
    $0 --batch-size 200

    # Resume from interruption
    $0 --resume-from 1500

    # Fast mode (no indexes)
    $0 --no-indexes

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            LABELS_FILE="$2"
            shift 2
            ;;
        -b|--batch-size)
            BATCH_SIZE="$2"
            shift 2
            ;;
        -r|--resume-from)
            RESUME_FROM="$2"
            shift 2
            ;;
        --no-indexes)
            CREATE_INDEXES=false
            shift
            ;;
        --no-progress)
            SHOW_PROGRESS=false
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main script
main() {
    print_info "🚀 Starting FDA Drug Labels Database Seeder"
    
    # Check if Labels.json exists
    if [[ ! -f "$LABELS_FILE" ]]; then
        print_error "Labels file not found: $LABELS_FILE"
        print_info "Please ensure the Labels.json file exists at the specified path"
        exit 1
    fi
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        print_warning ".env file not found"
        if [[ -f ".env.example" ]]; then
            print_info "Copying .env.example to .env"
            cp .env.example .env
            print_warning "Please update .env with your database credentials"
        else
            print_error "No .env or .env.example file found"
            exit 1
        fi
    fi
    
    # Check if Python dependencies are installed
    print_info "Checking Python dependencies..."
    if ! python3 -c "import ijson, psycopg2, sqlalchemy, bs4, tqdm" 2>/dev/null; then
        print_warning "Some dependencies are missing. Installing..."
        python3 -m pip install -r requirements.txt
    fi
    
    # Check database connectivity
    print_info "Testing database connection..."
    if ! python3 -c "
import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', '5432')),
        user=os.getenv('DB_USERNAME', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'password'),
        database=os.getenv('DB_NAME', 'druginfo')
    )
    conn.close()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
    exit(1)
" 2>/dev/null; then
        print_error "Database connection failed!"
        print_info "Make sure PostgreSQL is running: 'pnpm docker:up' from project root"
        print_info "Check .env file for correct database credentials"
        exit 1
    fi
    
    # Build command
    cmd="python3 src/main.py \"$LABELS_FILE\""
    
    if [[ $BATCH_SIZE -ne 100 ]]; then
        cmd="$cmd --batch-size $BATCH_SIZE"
    fi
    
    if [[ $RESUME_FROM -ne 0 ]]; then
        cmd="$cmd --resume-from $RESUME_FROM"
    fi
    
    if [[ "$CREATE_INDEXES" == "false" ]]; then
        cmd="$cmd --no-indexes"
    fi
    
    if [[ "$SHOW_PROGRESS" == "false" ]]; then
        cmd="$cmd --no-progress"
    fi
    
    # Show configuration
    print_info "Configuration:"
    print_info "  📁 Labels file: $LABELS_FILE"
    print_info "  📦 Batch size: $BATCH_SIZE"
    print_info "  🔄 Resume from: $RESUME_FROM"
    print_info "  🔍 Create indexes: $CREATE_INDEXES"
    print_info "  📊 Show progress: $SHOW_PROGRESS"
    echo
    
    # Run the seeder
    print_info "🎯 Starting database seeding..."
    print_info "Command: $cmd"
    echo
    
    if eval "$cmd"; then
        print_success "🎉 Database seeding completed successfully!"
        print_info "Your PostgreSQL database now contains FDA drug label data"
        print_info "You can now start the API: 'pnpm dev' from project root"
    else
        print_error "❌ Database seeding failed!"
        print_info "Check the error messages above for troubleshooting"
        exit 1
    fi
}

# Run main function
main "$@"