# Docker Setup Guide - Medication Drug Information Platform

This guide will help you spin up the entire Medication platform using Docker Compose, including the Python seeder and AI content generation services.

## 🚀 Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/medication/code-exercise
   ```

2. **Download FDA Labels data (Optional but recommended):**
   - Download `Labels.json` from [FDA OpenData](https://open.fda.gov/drug/label/download/)
   - Place it in the project root directory

3. **Set up environment variables:**
   ```bash
   export OPENAI_API_KEY="your_openai_api_key_here"
   ```

4. **Run the automated setup:**
   ```bash
   ./setup-docker.sh
   ```

That's it! The script will handle everything automatically.

## 📋 Services Overview

The platform consists of 6 Docker services:

### Core Infrastructure
- **postgres** - PostgreSQL database (port 5432)
- **redis** - Redis cache (port 6379)

### Application Services  
- **api** - NestJS API server (port 3001)
- **web** - Next.js frontend (port 3000)

### AI-Enhanced Services
- **drug-seeder** - Python service for FDA data seeding (port 8080 for health checks)
- **ai-content-server** - MCP AI content generation server (ports 8000, 8081)

## 🔧 Manual Setup

If you prefer manual setup:

### Prerequisites
- Docker and Docker Compose installed
- OpenAI API key (for AI features)
- FDA Labels.json file (optional)

### Steps

1. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build -d
   ```

3. **Check service status:**
   ```bash
   docker-compose ps
   ```

## 📊 Service Endpoints

After startup, these endpoints will be available:

| Service | URL | Description |
|---------|-----|-------------|
| Web App | http://localhost:3000 | Main drug information platform |
| API Server | http://localhost:3001 | REST API backend |
| API Docs | http://localhost:3001/api/docs | Swagger documentation |
| Seeder Health | http://localhost:8080/health | Database seeding status |
| AI Content Server | http://localhost:8000 | MCP AI content generation |
| AI Health Monitor | http://localhost:8081/health | AI server health status |

## 🗄️ Database Seeding

The `drug-seeder` service automatically:
1. Waits for PostgreSQL to be ready
2. Parses the FDA Labels.json file (if provided)
3. Seeds the database with drug information
4. Provides health check endpoints for monitoring

### Seeder Configuration

Environment variables for the seeder:

```bash
SEEDER_MODE=auto           # auto or interactive
SEEDER_KEEP_ALIVE=true     # Keep container running after seeding
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=druginfo
```

### Monitoring Seeding Progress

```bash
# Check seeding status
curl http://localhost:8080/health

# View seeding logs
docker-compose logs -f drug-seeder

# Check logs in real-time
docker-compose exec drug-seeder tail -f /app/logs/seeder.log
```

## 🤖 AI Content Generation

The `ai-content-server` provides Model Context Protocol (MCP) tools for:

### Available MCP Tools
1. **generate_seo_content** - SEO-optimized titles and meta descriptions
2. **create_provider_friendly_content** - Healthcare provider-focused content
3. **generate_drug_faqs** - Structured FAQ sections
4. **find_related_content** - Related drugs and conditions
5. **batch_generate_content** - Process multiple drugs at once

### MCP Resources
- **drugs/{drug_id}** - Get complete drug information
- **drugs/search** - Search drugs by criteria
- **drugs/{drug_id}/label** - Get FDA label data
- **health** - Health check endpoint

### AI Server Configuration

```bash
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
MCP_DEV_MODE=false
MCP_HEALTH_SERVER=true
LOG_LEVEL=INFO
```

## 🔍 Monitoring and Logs

### View all service logs:
```bash
docker-compose logs -f
```

### View specific service logs:
```bash
docker-compose logs -f api
docker-compose logs -f drug-seeder
docker-compose logs -f ai-content-server
```

### Check service health:
```bash
# API health
curl http://localhost:3001/health

# Seeder health  
curl http://localhost:8080/health

# AI server health
curl http://localhost:8081/health
```

## 🛠️ Useful Commands

### Start/Stop Services
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart api

# Rebuild and start
docker-compose up --build -d
```

### Shell Access
```bash
# Access API container
docker-compose exec api bash

# Access seeder container
docker-compose exec drug-seeder bash

# Access AI content server
docker-compose exec ai-content-server bash
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d druginfo

# Run SQL commands
docker-compose exec postgres psql -U postgres -d druginfo -c "SELECT COUNT(*) FROM drugs;"
```

## 🐛 Troubleshooting

### Common Issues

1. **Services won't start:**
   ```bash
   # Check for port conflicts
   docker-compose ps
   netstat -tulpn | grep :3000
   
   # Check logs for errors
   docker-compose logs api
   ```

2. **Database connection issues:**
   ```bash
   # Ensure postgres is healthy
   docker-compose ps postgres
   
   # Check postgres logs
   docker-compose logs postgres
   ```

3. **AI features not working:**
   ```bash
   # Verify OpenAI API key
   echo $OPENAI_API_KEY
   
   # Check AI server logs
   docker-compose logs ai-content-server
   ```

4. **Seeding issues:**
   ```bash
   # Check if Labels.json exists
   ls -la Labels.json
   
   # Restart seeder
   docker-compose restart drug-seeder
   
   # View seeder logs
   docker-compose logs drug-seeder
   ```

### Clean Reset

To completely reset the environment:

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up --build -d
```

## 📁 Volume Management

The setup creates persistent volumes for:

- **postgres_data** - Database data
- **redis_data** - Redis cache data  
- **seeder_logs** - Seeder execution logs
- **ai_content_logs** - AI server logs

### Backup Database
```bash
# Create database backup
docker-compose exec postgres pg_dump -U postgres druginfo > backup.sql

# Restore database backup
cat backup.sql | docker-compose exec -T postgres psql -U postgres druginfo
```

## 🔒 Security Notes

- All services run with non-root users inside containers
- Database credentials are configurable via environment variables
- OpenAI API key should be kept secure and not committed to version control
- Health check endpoints are exposed for monitoring but contain no sensitive data

## 📈 Performance Optimization

### For Development
- Services are configured with development settings
- Hot reload enabled for API and web services
- Detailed logging enabled

### For Production
- Update environment variables to production values
- Consider using Docker secrets for sensitive data
- Implement proper logging aggregation
- Set up monitoring and alerting

## 🆘 Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify health endpoints
3. Check this documentation
4. Review the setup script output
5. Ensure all prerequisites are met

The setup script provides helpful status information and troubleshooting guidance.