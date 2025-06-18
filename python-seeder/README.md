# FDA Drug Labels Database Seeder

A Python service for seeding PostgreSQL database with FDA drug label information from large JSON files. Designed for memory-efficient processing of large datasets with streaming JSON parsing and batch database operations.

## Features

- **Memory Efficient**: Streams large JSON files without loading entire file into memory
- **Batch Processing**: Processes drugs in configurable batches for optimal database performance
- **Resume Capability**: Can resume interrupted processing from any position
- **Progress Tracking**: Real-time progress bar and statistics
- **Robust Error Handling**: Graceful handling of missing, incomplete, and malformed data
- **Data Quality Management**: Automatic fallbacks, validation, and quality reporting
- **Data Cleaning**: Automatic HTML content cleaning and text extraction
- **Database Optimization**: Automatic index creation for better query performance
- **Production Ready**: Comprehensive validation and constraint error handling

## Architecture

```
Labels.json → Parser → Transformer → Seeder → PostgreSQL
                ↓          ↓          ↓
           Stream JSON  Clean HTML  Batch Insert
```

### Components

1. **Parser** (`parser.py`): Streams JSON data using `ijson` for memory efficiency
2. **Transformer** (`transformer.py`): Cleans HTML content and maps data to database schema
3. **Seeder** (`seeder.py`): Handles batch database operations with PostgreSQL
4. **Main** (`main.py`): Orchestrates the complete pipeline with progress tracking

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Ensure PostgreSQL is running:**
   ```bash
   # Using Docker Compose from project root
   pnpm docker:up
   ```

## Usage

### Basic Usage

```bash
# Seed database with default settings
python src/main.py ../Labels.json
```

### Advanced Usage

```bash
# Custom batch size for performance tuning
python src/main.py ../Labels.json --batch-size 200

# Resume from specific position (useful after interruption)
python src/main.py ../Labels.json --resume-from 1000

# Skip index creation (faster for testing)
python src/main.py ../Labels.json --no-indexes

# Disable progress bar (useful for logging)
python src/main.py ../Labels.json --no-progress
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USERNAME` | Database username | `postgres` |
| `DB_PASSWORD` | Database password | `password` |
| `DB_NAME` | Database name | `druginfo` |

## Database Schema

Populates three main tables:

### `drugs` table
- Basic drug information (name, manufacturer, dosage form, etc.)
- Links to FDA approval data and NDC numbers

### `drug_labels` table  
- Complete FDA label content (indications, warnings, dosage, etc.)
- HTML content cleaned and converted to plain text

### `ai_enhanced_content` table
- Ready for AI-powered content enhancement
- SEO optimization fields prepared

## Performance

### Memory Usage
- Constant memory usage regardless of file size
- Processes 1GB+ JSON files with <100MB RAM usage

### Processing Speed
- **~50-100 drugs/second** on typical hardware
- **Batch processing** optimizes database operations
- **Resume capability** prevents data loss on interruption

### Database Optimization
- Automatic index creation on completion
- Full-text search indexes for drug names and indications
- Optimized queries for manufacturer and NDC lookups

## Data Processing

### HTML Cleaning
- Removes HTML tags and extracts readable text
- Preserves important formatting and structure
- Handles malformed HTML gracefully

### Data Validation & Quality Management
- **Multiple Fallback Strategies**: Uses alternative field names when primary fields are missing
- **Smart Defaults**: Provides sensible default values for required database fields
- **Field Length Validation**: Prevents database constraint errors
- **Data Type Validation**: Ensures correct data types before processing
- **Quality Issue Logging**: Tracks and reports data quality problems

### Error Handling
- **Graceful Degradation**: Continues processing when individual records fail
- **Batch-level Recovery**: Commits successful records even if some fail
- **Database Constraint Handling**: Properly handles unique key violations
- **Resume Capability**: Can restart from any interruption point

### Deduplication
- Detects existing drugs by FDA `setId` 
- Updates existing records with new information
- Prevents duplicate drug entries

## Error Handling

- **Graceful degradation**: Continues processing on individual record errors
- **Detailed logging**: Error messages with drug names and positions
- **Statistics tracking**: Comprehensive processing statistics
- **Resume capability**: Restart from interruption point

## Integration

### With Existing NestJS API
- Matches existing TypeORM entity structure
- Compatible with current database schema
- Ready for immediate use by API endpoints

### With Docker Environment
- Uses same PostgreSQL instance as API
- Respects existing database configuration
- No additional infrastructure required

## Troubleshooting

### Common Issues

1. **Memory errors**: File too large
   - Solution: Uses streaming parser, should handle any size

2. **Database connection failed**
   - Check database is running: `pnpm docker:up`
   - Verify credentials in `.env` file

3. **Permission denied**
   - Ensure user has database write permissions
   - Check PostgreSQL user permissions

4. **Processing interrupted**
   - Use `--resume-from` flag with last position shown
   - Check logs for last successfully processed position

### Performance Tuning

- **Increase batch size** for faster processing on powerful hardware
- **Disable indexes** during initial seeding, create afterward
- **Use SSD storage** for better database performance

## Example Output

```
🚀 Starting FDA Drug Labels Database Seeding
📁 Input file: ../Labels.json
🎯 Database: localhost:5432/druginfo
📦 Batch size: 100
📊 Counting total records...
📝 Total records to process: 15423

Processing drugs: 100%|████████████| 15423/15423 [08:32<00:00, 30.12drugs/s]

🔍 Creating database indexes...

✅ Seeding completed successfully!
📊 Final Statistics:
   • Total processed: 15423
   • Drugs inserted: 14891
   • Drugs updated: 532
   • Records skipped: 0
   • Errors encountered: 12
⏱️  Total time: 512.34 seconds
🚀 Processing rate: 30.12 drugs/second
```

## Development

### Testing Individual Components

```bash
# Test parser
python src/parser.py

# Test transformer  
python src/transformer.py

# Test database connection
python src/seeder.py

# Test error handling and data validation
python test_error_handling.py
```

### Error Handling Test Suite

The seeder includes comprehensive tests for handling incomplete/malformed data:

```bash
# Run all error handling tests
python test_error_handling.py
```

**Test Coverage:**
- Missing drug names and fallback strategies
- Empty or missing manufacturer fields
- Incomplete label data
- Invalid data types
- Alternative field name resolution
- Data quality issue reporting

### Adding New Data Fields

1. Update `DrugRecord` dataclass in `transformer.py`
2. Add extraction logic in `DrugDataTransformer`
3. Update database insertion in `seeder.py`
4. Add fallback/validation logic if required
5. Test with sample data including edge cases