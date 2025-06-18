# Multi-stage Dockerfile for Python Drug Seeder
FROM python:3.11-slim as builder

# Install uv for fast dependency management
RUN pip install uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Create virtual environment and install dependencies
RUN uv venv .venv
RUN . .venv/bin/activate && uv pip install -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY src/ ./src/
COPY .env.example .env
COPY run-seeder.sh ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh run-seeder.sh

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"
ENV PYTHONUNBUFFERED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys; import psycopg2; sys.exit(0)" || exit 1

# Expose port (if needed for monitoring)
EXPOSE 8080

# Default command
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["python", "src/main.py", "/app/Labels.json"]