# PrescribePoint - AI-Enhanced Drug Information Platform

An AI-enhanced drug information publishing platform that processes FDA drug labels and creates SEO-optimized content pages for healthcare professionals.

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose
- OpenAI API key

### Environment Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd code-exercise
   pnpm install
   ```

2. **Set up environment variables:**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Add your OpenAI API key
   echo "OPENAI_API_KEY=your_openai_api_key_here" >> .env
   ```

3. **Start the application:**
   ```bash
   # Start all services with Docker
   pnpm docker:up
   ```

The application will be available at:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001
- **API Docs:** http://localhost:3001/api/docs

## Development

### Local Development (without Docker)

```bash
# Start database services only
docker-compose up postgres redis -d

# Run apps in development mode
pnpm dev
```

### Individual App Development

```bash
# API development
cd apps/api
pnpm dev

# Web development
cd apps/web  
pnpm dev
```

### Database Management

```bash
# Seed database with sample data
pnpm seed

# Run migrations (if needed)
cd apps/api
pnpm migration:run
```

## Available Commands

### Build & Test
```bash
pnpm build          # Build all apps
pnpm test           # Run all tests
pnpm test:e2e       # Run end-to-end tests
pnpm lint           # Lint all code
pnpm type-check     # TypeScript type checking
```

### Docker Commands
```bash
pnpm docker:up      # Start all services
pnpm docker:down    # Stop all services
pnpm docker:build   # Rebuild Docker images
```

## Project Structure

```
├── apps/
│   ├── api/           # NestJS backend
│   └── web/           # Next.js frontend
├── packages/
│   └── shared/        # Shared types and utilities
├── components/        # Shared UI components
├── python-ai-content/ # AI content processing
└── python-seeder/     # Database seeding scripts
```

## Key Features

- **Drug Search:** Full-text search with advanced filtering
- **AI Content Enhancement:** GPT-4 powered SEO optimization
- **Dynamic Pages:** Server-side rendered drug detail pages
- **REST API:** Comprehensive API with Swagger documentation
- **Real-time Search:** Instant search with debouncing and caching

## Architecture

- **Frontend:** Next.js 15 with App Router, React 19, Tailwind CSS
- **Backend:** NestJS with TypeORM, PostgreSQL, Redis
- **AI Integration:** OpenAI GPT-4 with Model Context Protocol
- **Database:** PostgreSQL with full-text search capabilities
- **Caching:** Redis for API responses and search results

## Environment Variables

Required environment variables:

```bash
# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=prescribepoint

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Application URLs
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## API Documentation

Once the API is running, visit http://localhost:3001/api/docs for interactive Swagger documentation.

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting: `pnpm test && pnpm lint`
4. Submit a pull request

## Troubleshooting

### Common Issues

**Docker services won't start:**
- Ensure Docker is running
- Check if ports 3000, 3001, 5432, 6379 are available
- Try `pnpm docker:down && pnpm docker:up`

**Database connection errors:**
- Verify PostgreSQL is running: `docker ps`
- Check environment variables in `.env`
- Try reseeding: `pnpm seed`

**AI content generation failing:**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Monitor rate limits in application logs

**Build errors:**
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Clear Next.js cache: `rm -rf apps/web/.next`
- Run type checking: `pnpm type-check`