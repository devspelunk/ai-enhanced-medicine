"""
Main orchestration script for seeding drug database from FDA labels JSON.
Handles the complete pipeline: parsing, transformation, and database seeding.
"""

import os
import sys
import argparse
import time
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from tqdm import tqdm

from parser import DrugLabelParser
from transformer import DrugDataTransformer, DrugRecord
from seeder import DrugDatabaseSeeder, DatabaseConfig


class DrugSeederOrchestrator:
    """Main orchestrator for the drug seeding process."""
    
    def __init__(self, labels_file: str, batch_size: int = 100, resume_from: int = 0):
        self.labels_file = Path(labels_file)
        self.batch_size = batch_size
        self.resume_from = resume_from
        
        # Initialize components
        self.parser = DrugLabelParser(str(self.labels_file))
        self.transformer = DrugDataTransformer()
        self.db_config = DatabaseConfig()
        
        # Statistics
        self.total_records = 0
        self.current_position = 0
        
    def run(self, create_indexes: bool = True, show_progress: bool = True):
        """
        Run the complete seeding process.
        
        Args:
            create_indexes: Whether to create database indexes after seeding
            show_progress: Whether to show progress bar
        """
        print("🚀 Starting FDA Drug Labels Database Seeding")
        print(f"📁 Input file: {self.labels_file}")
        print(f"🎯 Database: {self.db_config.host}:{self.db_config.port}/{self.db_config.database}")
        print(f"📦 Batch size: {self.batch_size}")
        
        # Get total count for progress tracking
        if show_progress:
            print("📊 Counting total records...")
            self.total_records = self.parser.count_total_records()
            print(f"📝 Total records to process: {self.total_records}")
        
        start_time = time.time()
        
        try:
            with DrugDatabaseSeeder(self.db_config, self.batch_size) as seeder:
                # Process drugs in batches
                batch = []
                processed_count = 0
                
                # Set up progress bar
                progress_bar = None
                if show_progress and self.total_records > 0:
                    progress_bar = tqdm(
                        total=self.total_records,
                        desc="Processing drugs",
                        unit="drugs",
                        initial=self.resume_from
                    )
                
                try:
                    for raw_drug_data in self.parser.parse_drugs():
                        # Skip records if resuming
                        if processed_count < self.resume_from:
                            processed_count += 1
                            continue
                        
                        # Transform raw data
                        drug_record = self.transformer.transform(raw_drug_data)
                        
                        if drug_record:
                            batch.append(drug_record)
                        
                        processed_count += 1
                        self.current_position = processed_count
                        
                        # Process batch when full
                        if len(batch) >= self.batch_size:
                            success = seeder.seed_drugs_batch(batch)
                            if not success:
                                print(f"⚠️  Failed to process batch at position {processed_count}")
                            
                            batch.clear()
                            
                            # Update progress
                            if progress_bar:
                                progress_bar.update(self.batch_size)
                            
                            # Print periodic status
                            if processed_count % (self.batch_size * 10) == 0:
                                stats = seeder.get_stats()
                                print(f"📈 Progress: {processed_count} processed, "
                                      f"{stats['inserted']} inserted, "
                                      f"{stats['updated']} updated, "
                                      f"{stats['errors']} errors")
                    
                    # Process remaining batch
                    if batch:
                        seeder.seed_drugs_batch(batch)
                        if progress_bar:
                            progress_bar.update(len(batch))
                    
                    # Close progress bar
                    if progress_bar:
                        progress_bar.close()
                    
                    # Create indexes for better performance
                    if create_indexes:
                        print("🔍 Creating database indexes...")
                        seeder.create_indexes()
                    
                    # Final statistics
                    elapsed_time = time.time() - start_time
                    
                    print("\n✅ Seeding completed successfully!")
                    print(f"⏱️  Total time: {elapsed_time:.2f} seconds")
                    
                    stats = seeder.get_stats()
                    if stats['processed'] > 0:
                        print(f"🚀 Processing rate: {stats['processed'] / elapsed_time:.2f} items/second")
                    
                    # Print detailed quality report
                    seeder.print_quality_report()
                    
                except KeyboardInterrupt:
                    print(f"\n⏸️  Process interrupted by user at position {self.current_position}")
                    print(f"💡 To resume, use: --resume-from {self.current_position}")
                    
                    stats = seeder.get_stats()
                    print(f"📊 Statistics before interruption:")
                    print(f"   • Processed: {stats['processed']}")
                    print(f"   • Inserted: {stats['inserted']}")
                    print(f"   • Updated: {stats['updated']}")
                    print(f"   • Errors: {stats['errors']}")
                    
                    sys.exit(1)
                    
        except Exception as e:
            print(f"❌ Fatal error during seeding: {e}")
            raise


def setup_environment():
    """Set up environment variables and configuration."""
    # Load environment variables from .env file if it exists
    env_file = Path(__file__).parent.parent / '.env'
    if env_file.exists():
        load_dotenv(env_file)
        print(f"📄 Loaded environment from {env_file}")
    else:
        print("📄 No .env file found, using system environment variables")
    
    # Verify required environment variables
    required_vars = ['DB_HOST', 'DB_USERNAME', 'DB_PASSWORD', 'DB_NAME']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("💡 Create a .env file with database configuration or set environment variables")
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Seed database with FDA drug labels from JSON file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python main.py ../Labels.json
  
  # Custom batch size
  python main.py ../Labels.json --batch-size 200
  
  # Resume from specific position
  python main.py ../Labels.json --resume-from 1000
  
  # Skip index creation (faster for testing)
  python main.py ../Labels.json --no-indexes
        """
    )
    
    parser.add_argument(
        'labels_file',
        help='Path to the FDA labels JSON file'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of records to process in each batch (default: 100)'
    )
    
    parser.add_argument(
        '--resume-from',
        type=int,
        default=0,
        help='Resume processing from specific record number (default: 0)'
    )
    
    parser.add_argument(
        '--no-indexes',
        action='store_true',
        help='Skip creating database indexes (faster for testing)'
    )
    
    parser.add_argument(
        '--no-progress',
        action='store_true',
        help='Disable progress bar (useful for logging)'
    )
    
    args = parser.parse_args()
    
    # Validate input file
    labels_file = Path(args.labels_file)
    if not labels_file.exists():
        print(f"❌ Labels file not found: {labels_file}")
        sys.exit(1)
    
    # Set up environment
    setup_environment()
    
    # Create orchestrator and run
    orchestrator = DrugSeederOrchestrator(
        str(labels_file),
        batch_size=args.batch_size,
        resume_from=args.resume_from
    )
    
    try:
        orchestrator.run(
            create_indexes=not args.no_indexes,
            show_progress=not args.no_progress
        )
    except Exception as e:
        print(f"❌ Seeding failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()