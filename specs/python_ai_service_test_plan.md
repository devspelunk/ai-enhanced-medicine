# Python AI Content Service - Testing Action Plan

## Overview

The python-ai-content service is a FastMCP server providing AI-powered drug content generation capabilities. This comprehensive testing plan ensures robust coverage across all modules, from database operations to AI content generation, with proper error handling and performance validation.

## Service Architecture Analysis

### Core Components
- **FastMCP Server** (`main.py`) - MCP protocol implementation with 7 tools and 2 resources
- **Database Manager** (`database/connection.py`) - PostgreSQL/SQLAlchemy async operations  
- **AI Tools** (`tools/`) - 4 content generation modules using OpenAI GPT-4
- **Drug Resources** (`resources/drug_resources.py`) - Data access and formatting layer

### Dependencies
- FastMCP, OpenAI, SQLAlchemy, asyncpg, Pydantic, textstat, BeautifulSoup4
- Test dependencies: pytest, pytest-asyncio, pytest-mock, pytest-cov

## Testing Infrastructure Setup

### Test Framework Configuration

#### Dependencies to Add
```toml
[project.optional-dependencies]
test = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0", 
    "pytest-mock>=3.12.0",
    "pytest-cov>=4.1.0",
    "httpx>=0.25.0",
    "aioresponses>=0.7.4",
    "testcontainers>=3.7.0"
]
```

#### Test Configuration (`pytest.ini`)
```ini
[tool:pytest]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "--cov=src --cov-report=html --cov-report=term-missing --cov-fail-under=85"
markers = [
    "unit: Unit tests",
    "integration: Integration tests", 
    "ai: Tests requiring AI/OpenAI integration",
    "slow: Slow-running tests"
]
```

### Test Directory Structure
```
tests/
├── conftest.py                 # Global fixtures and configuration
├── fixtures/
│   ├── drug_data.json         # Sample drug data for testing
│   ├── openai_responses.json  # Mock OpenAI API responses
│   └── database_fixtures.py   # Database test data setup
├── unit/
│   ├── test_database/
│   │   ├── test_connection.py
│   │   └── test_queries.py
│   ├── test_tools/
│   │   ├── test_seo_optimizer.py
│   │   ├── test_content_transformer.py
│   │   ├── test_faq_generator.py
│   │   └── test_related_content.py
│   ├── test_resources/
│   │   └── test_drug_resources.py
│   └── test_main.py
├── integration/
│   ├── test_mcp_endpoints.py
│   ├── test_database_integration.py
│   └── test_ai_integration.py
└── performance/
    └── test_load_performance.py
```

## Core Module Testing Strategy

### 1. Database Layer Testing (`test_database/`)

#### Connection Management Tests
- **Connection establishment**: PostgreSQL and asyncpg pool setup
- **Connection health checks**: Validation of database connectivity
- **Connection cleanup**: Proper resource disposal on shutdown
- **Error scenarios**: Database unreachable, authentication failures
- **Connection pooling**: Concurrent connection handling

#### Query Operations Tests
- **Drug retrieval**: `get_drug_by_id()` with valid/invalid IDs
- **Drug search**: `search_drugs()` with various filter combinations
- **Similar drugs**: `get_similar_drugs()` with different similarity types
- **Database statistics**: `get_database_stats()` functionality
- **Parameter validation**: SQL injection prevention, input sanitization

#### Mock Strategies
- Use `aiopg.create_pool` mocks for unit tests
- SQLite in-memory database for integration tests
- TestContainers for full PostgreSQL integration testing

### 2. AI Tools Testing (`test_tools/`)

#### SEOOptimizer Tests (`test_seo_optimizer.py`)
```python
# Key test scenarios:
- Valid content generation with different target audiences
- JSON response structure validation (title, meta_description, keywords, structured_data)
- Fallback content generation when OpenAI API fails
- Prompt building with various drug data completeness levels
- Schema.org structured data validation
- Error handling for API timeouts, rate limits, invalid responses
```

#### ContentTransformer Tests (`test_content_transformer.py`)
```python
# Key test scenarios:
- Provider content creation for different complexity levels (basic/intermediate/advanced)  
- Readability score calculation using textstat
- Fallback content generation mechanisms
- Content validation (simplified_indications, usage_instructions, key_warnings)
- Clinical pearls and patient counseling point generation
- Error resilience for malformed AI responses
```

#### FAQGenerator Tests (`test_faq_generator.py`)
```python
# Key test scenarios:
- FAQ generation for different audiences (healthcare_providers, patients, pharmacists)
- Question/answer quality validation (minimum length, relevance)
- Category extraction and organization
- Fallback FAQ creation with drug data extraction
- Priority assignment (high/medium/low) validation
- Maximum question limit enforcement
```

#### RelatedContentEngine Tests (`test_related_content.py`)
```python
# Key test scenarios:
- Similar drug finding by indication, manufacturer, generic similarity
- Related condition identification
- Alternative treatment suggestions
- Database integration for similarity queries
- Result formatting and relevance scoring
- Error handling for database query failures
```

### 3. Resources Layer Testing (`test_drug_resources.py`)

#### DrugResources API Tests
- **Data retrieval**: `get_drug_by_id()`, `search_drugs()`, `get_drug_label()`
- **Response formatting**: Consistent API response structure validation
- **Data quality assessment**: Completeness scoring, quality metrics calculation
- **Error propagation**: Proper database error handling and user-friendly messages
- **Search functionality**: Query parameter validation, result filtering

#### Data Quality Metrics
- Essential field completeness validation
- Quality score calculation logic (excellent/good/fair/poor)
- Label completeness percentage accuracy
- Missing section identification

### 4. MCP Server Testing (`test_main.py`)

#### Server Initialization Tests
- **Component setup**: Proper initialization of all service components
- **Dependency injection**: Database manager, AI tools, resources initialization
- **Health check functionality**: Component status validation
- **Configuration loading**: Environment variable handling
- **Error scenarios**: Initialization failures, missing dependencies

#### MCP Tool Endpoint Tests
```python
# Test all 7 MCP tools:
- search_drugs: Parameter validation, result formatting
- generate_seo_content: AI integration, response validation  
- create_provider_friendly_content: Content transformation accuracy
- generate_drug_faqs: FAQ structure validation
- find_related_content: Relationship discovery functionality
- batch_generate_content: Multi-drug processing, error handling
- health_check: System status reporting
```

#### MCP Resource Endpoint Tests
```python
# Test 2 MCP resources:
- drugs/{drug_id}: Complete drug information retrieval
- drugs/{drug_id}/label: FDA label data access
```

## Integration & End-to-End Testing

### 5. MCP Protocol Integration (`test_mcp_endpoints.py`)

#### FastMCP Framework Testing
- **Tool registration**: Proper MCP tool and resource registration
- **HTTP transport**: Request/response handling via streamable-http
- **Pydantic validation**: Request/response model validation
- **Error propagation**: MCP error handling and client communication
- **Concurrent requests**: Multiple simultaneous MCP calls

#### Performance Testing
- **Response times**: Tool execution time benchmarks
- **Memory usage**: Resource consumption monitoring
- **Concurrent load**: Multiple client connection handling
- **Rate limiting**: API call throttling validation

### 6. Database Integration Testing (`test_database_integration.py`)

#### Real Database Operations
- **Test database setup**: PostgreSQL TestContainer or dedicated test DB
- **Transaction handling**: Rollback scenarios, concurrent access patterns
- **Data consistency**: Search result accuracy, relationship integrity
- **Migration testing**: Database schema validation
- **Performance benchmarks**: Query execution time validation

### 7. AI Integration Testing (`test_ai_integration.py`)

#### OpenAI API Integration
- **Mocked responses**: Consistent testing with aioresponses
- **Rate limiting**: API call throttling, exponential backoff
- **Error handling**: API failures, timeout scenarios, invalid responses
- **Cost optimization**: Token usage tracking, prompt efficiency
- **Content quality**: Generated content validation against standards

#### Content Validation
- **Medical accuracy**: Content factual correctness validation
- **Format compliance**: JSON structure adherence
- **Completeness**: Required field presence validation
- **Readability**: Content quality metrics validation

## Test Utilities & Infrastructure

### 8. Fixtures & Mocks (`conftest.py`)

#### Database Fixtures
```python
@pytest.fixture
async def db_manager():
    """Provide test database manager with in-memory SQLite."""
    
@pytest.fixture  
def sample_drug_data():
    """Provide comprehensive drug data for testing."""
    
@pytest.fixture
def openai_mock_responses():
    """Mock OpenAI API responses for consistent testing."""
```

#### Configuration Management
- **Test environment variables**: Isolated test configuration
- **Database connection strings**: Test database connections
- **OpenAI API mocking**: Consistent AI response simulation
- **Cleanup utilities**: Test data cleanup, resource disposal

### 9. Coverage & Quality Gates

#### Coverage Requirements
- **Minimum 85% code coverage** across all modules
- **100% coverage** for critical paths (database operations, error handling)
- **Branch coverage**: Conditional logic validation
- **Integration coverage**: End-to-end flow validation

#### Performance Benchmarks
- **Response time thresholds**: <2s for content generation, <500ms for data retrieval
- **Memory usage limits**: Maximum heap size constraints
- **Database query performance**: Query execution time monitoring
- **AI API efficiency**: Token usage optimization validation

#### Quality Metrics
- **Code complexity**: Cyclomatic complexity limits
- **Test maintainability**: Test code quality standards
- **Error handling coverage**: Exception scenario validation
- **Documentation coverage**: Docstring completeness

## Implementation Strategy

### Phase 1: Foundation (Week 1)
1. **Test infrastructure setup**: Directory structure, configuration files
2. **Fixture creation**: Sample data, mock responses, database fixtures
3. **Basic unit tests**: Database connection, simple tool functions

### Phase 2: Core Testing (Week 2)
1. **Database layer tests**: Complete connection and query testing
2. **AI tool unit tests**: Individual tool functionality validation
3. **Resource layer tests**: DrugResources API testing

### Phase 3: Integration (Week 3)
1. **MCP endpoint testing**: Full server integration validation
2. **Database integration**: Real database operation testing
3. **AI integration**: OpenAI API integration with mocking

### Phase 4: Quality & Performance (Week 4)
1. **Performance testing**: Load testing, benchmarking
2. **Coverage analysis**: Gap identification and filling
3. **CI/CD integration**: Automated testing pipeline setup
4. **Documentation**: Test documentation and runbooks

## Continuous Integration

### CI/CD Pipeline Integration
- **Automated test execution**: On pull request and merge
- **Coverage reporting**: Codecov or similar integration
- **Performance regression detection**: Benchmark comparison
- **Test result reporting**: Clear pass/fail communication
- **Environment management**: Test database provisioning

### Quality Gates
- **All tests must pass** before merge approval
- **Coverage threshold**: 85% minimum coverage requirement
- **Performance thresholds**: Response time regression prevention
- **Security scanning**: Dependency vulnerability checking
- **Code quality**: Linting, formatting, complexity validation

## Monitoring & Maintenance

### Test Maintenance
- **Regular fixture updates**: Keep test data current with schema changes
- **Mock response updates**: Maintain AI response accuracy
- **Performance baseline updates**: Adjust benchmarks as system evolves
- **Dependency updates**: Keep testing dependencies current

### Documentation
- **Test documentation**: Clear test purpose and maintenance instructions
- **Runbook creation**: Test execution and debugging guides
- **Troubleshooting guides**: Common test failure resolution
- **Performance baselines**: Document expected performance characteristics

This comprehensive testing plan ensures the python-ai-content service maintains high quality, reliability, and performance standards while providing clear guidance for implementation and maintenance.