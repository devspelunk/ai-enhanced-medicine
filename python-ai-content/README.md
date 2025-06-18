# Drug AI Content Server

MCP (Model Context Protocol) server for AI-powered drug content generation.

## Features

- SEO-optimized content generation
- Provider-friendly content transformation
- FAQ generation from FDA drug labels
- Related content discovery
- Batch processing capabilities

## Usage

This server provides MCP tools for generating enhanced content from FDA drug label data using OpenAI's GPT models.

## Environment Variables

- `OPENAI_API_KEY` - Required for AI content generation
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - Database connection
- `LOG_LEVEL` - Logging level (default: INFO)

## Docker

Run with Docker:

```bash
docker build -t ai-content-server .
docker run -e OPENAI_API_KEY=your_key ai-content-server
```