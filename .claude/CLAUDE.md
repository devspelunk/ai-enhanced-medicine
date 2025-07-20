# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **AI-enhanced drug information publishing platform** built as a monorepo using Next.js 15 and NestJS. The platform processes FDA drug labels and creates SEO-optimized content pages for healthcare professionals using AI content enhancement.

**Core workflow:** FDA Label JSON → Data Processing → AI Content Enhancement → SEO-Optimized Pages

## Architecture

**Monorepo Structure:**
- `apps/api/` - NestJS backend with TypeScript, PostgreSQL, Redis
- `apps/web/` - Next.js 15 frontend with App Router, TypeScript
- `packages/shared/` - Shared types and utilities
- Root-level shared UI components (`components/ui/`) using Shadcn/UI

**Key Technologies:**
- **Backend:** NestJS, TypeORM, PostgreSQL, Redis, OpenAI API
- **Frontend:** Next.js 15, React 19, Zustand, Tailwind CSS
- **AI Integration:** OpenAI GPT-4 for content enhancement with MCP (Model Context Protocol)
- **Database:** PostgreSQL with entities for Drug, DrugLabel, AIEnhancedContent
- **Containerization:** Docker Compose with postgres, redis, api, web services

## Development Commands

**Environment Setup:**
```bash
# Start all services (requires OPENAI_API_KEY environment variable)
pnpm docker:up

# Development mode (all apps in parallel)
pnpm dev

# Database seeding
pnpm seed
```

**Build and Testing:**
```bash
# Build all apps
pnpm build

# Run all tests
pnpm test

# Run end-to-end tests
pnpm test:e2e

# Lint all code
pnpm lint

# Type checking
pnpm type-check
```

**Individual App Commands:**
```bash
# API development
cd apps/api && pnpm dev
cd apps/api && pnpm test
cd apps/api && pnpm seed

# Web development  
cd apps/web && pnpm dev
cd apps/web && pnpm build
cd apps/web && pnpm test
```

## Backend Architecture (NestJS)

**Core Modules:**
- `drugs/` - Drug entity management, search, and CRUD operations
- `ai-content/` - AI-powered content enhancement using OpenAI GPT-4
- `search/` - Full-text search with PostgreSQL tsvector
- `mcp/` - Model Context Protocol server exposing drug data as AI tools

**Database Entities:**
- **Drug:** Core drug information (name, manufacturer, NDC, dosage)
- **DrugLabel:** FDA label data (indications, contraindications, warnings)
- **AIEnhancedContent:** SEO-optimized content (titles, descriptions, FAQs, structured data)

**Key Services:**
- `DrugsService` - Advanced search, filtering, slug-based routing
- `AIContentService` - Content enhancement with 30-day refresh cycle
- `SearchService` - PostgreSQL full-text search with similarity matching
- `MCPService` - Exposes 4 tools: search_drugs, get_drug_details, get_drug_interactions, get_drugs_by_condition

**API Endpoints:**
- REST API at `/api/*` with Swagger docs at `/api/docs`

## Frontend Architecture (Next.js)

**App Router Structure:**
- `/` - Landing page with hero, features, statistics
- `/drugs` - Drug listing with search and filtering
- `/drugs/[slug]` - Dynamic drug detail pages
- `/search` - Advanced search interface

**Component Organization:**
- `components/drugs/` - DrugCard, DrugSearch domain components
- `components/layout/` - Header navigation component
- `components/ui/` - 40+ Shadcn/UI components (Button, Card, Dialog, etc.)

**State Management:**
- **Zustand store** (`stores/drug-store.ts`) for search state, UI state, user preferences
- **React Query** for server state with caching and background updates
- **Nuqs** for URL state management in search interfaces

**Key Features:**
- Server-side rendering for SEO optimization
- Dynamic metadata generation with OpenGraph/Twitter cards
- Structured data (JSON-LD) for drug information
- Responsive design with mobile-first approach
- Dark mode support with CSS custom properties

## AI Integration

**Content Enhancement:**
- OpenAI GPT-4 integration for generating SEO-optimized titles and meta descriptions
- AI-generated provider-friendly explanations of medical conditions
- Structured FAQ generation from FDA label data
- Content freshness validation with 30-day refresh cycle

**Error Handling:**
- Fallback content generation when AI services are unavailable
- Retry logic with exponential backoff
- Content validation to prevent medical inaccuracies

## Code Style Guidelines

- Always follow the guidelines in .cursor/rules/guidelines.mdc

## Environment Variables

**Required:**
- `OPENAI_API_KEY` - OpenAI API key for content enhancement
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - PostgreSQL configuration
- `REDIS_URL` - Redis connection for caching

**Optional:**
- `NODE_ENV` - Environment mode (development/production)
- `NEXT_PUBLIC_API_URL` - API base URL for frontend
- `NEXT_PUBLIC_SITE_URL` - Site URL for SEO metadata

## Database Management

**Migrations:**
- Supabase migrations in `supabase/migrations/`
- TypeORM entities auto-sync in development

**Seeding:**
- Run `pnpm seed` to populate database with sample drug data
- Seed script located at `apps/api/src/database/seed.ts`

## Performance Considerations

**Backend:**
- Redis caching with 5-minute TTL
- Database query optimization with proper indexing
- AI API rate limiting and request batching

**Frontend:**
- Static export capability for CDN deployment
- Image optimization and lazy loading
- Component-level code splitting
- React Query caching with background updates

## Testing Strategy

**Backend Tests:**
- Unit tests with Jest for services and controllers
- Integration tests for API endpoints
- E2E tests for complete workflows

**Frontend Tests:**
- Component testing with React Testing Library
- Integration tests for user flows
- Visual regression testing capability