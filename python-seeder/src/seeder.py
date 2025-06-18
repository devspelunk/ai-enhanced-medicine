"""
Database seeder for FDA drug label data.
Handles batch processing and database operations with PostgreSQL.
"""

import os
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

import psycopg2
from psycopg2.extras import RealDictCursor

from transformer import DrugRecord


class DatabaseConfig:
    """Database configuration from environment variables."""
    
    def __init__(self):
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', '5432'))
        self.username = os.getenv('DB_USERNAME', 'postgres')
        self.password = os.getenv('DB_PASSWORD', 'password')
        self.database = os.getenv('DB_NAME', 'druginfo')
    
    def get_connection_string(self) -> str:
        """Get SQLAlchemy connection string."""
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    def get_psycopg2_params(self) -> Dict[str, Any]:
        """Get psycopg2 connection parameters."""
        return {
            'host': self.host,
            'port': self.port,
            'user': self.username,
            'password': self.password,
            'database': self.database
        }


class DrugDatabaseSeeder:
    """Seed database with drug information from transformed data."""
    
    def __init__(self, db_config: DatabaseConfig, batch_size: int = 100):
        self.db_config = db_config
        self.batch_size = batch_size
        self.connection: Optional[psycopg2.extensions.connection] = None
        self.stats = {
            'processed': 0,
            'inserted': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
    
    def connect(self):
        """Establish database connection."""
        try:
            self.connection = psycopg2.connect(**self.db_config.get_psycopg2_params())
            self.connection.autocommit = False
            print(f"Connected to database: {self.db_config.host}:{self.db_config.port}")
        except Exception as e:
            print(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            print("Database connection closed")
    
    def seed_drugs_batch(self, drug_records: List[DrugRecord]) -> bool:
        """
        Seed a batch of drug records to the database.
        
        Args:
            drug_records: List of DrugRecord objects to insert
            
        Returns:
            True if batch processed successfully
        """
        if not drug_records:
            return True
        
        if not self.connection:
            raise RuntimeError("Database connection not established")
        
        try:
            with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
                successful_records = 0
                
                # Process each drug in the batch
                for record in drug_records:
                    try:
                        self._process_single_drug(cursor, record)
                        successful_records += 1
                        self.stats['processed'] += 1
                    except Exception as e:
                        print(f"❌ Error processing drug {record.name}: {e}")
                        self.stats['errors'] += 1
                        
                        # For critical database errors, we may want to rollback
                        if 'constraint' in str(e).lower() or 'unique' in str(e).lower():
                            print(f"   Database constraint error - continuing with next record")
                        continue
                
                # Commit the batch if we processed any records successfully
                if successful_records > 0:
                    self.connection.commit()
                    print(f"✅ Batch committed: {successful_records}/{len(drug_records)} records processed successfully")
                    return True
                else:
                    print(f"❌ No records processed successfully in batch")
                    self.connection.rollback()
                    return False
                
        except Exception as e:
            print(f"❌ Critical batch error: {e}")
            self.connection.rollback()
            return False
    
    def _process_single_drug(self, cursor, record: DrugRecord):
        """Process a single drug record - insert or update with error handling."""
        
        try:
            # Validate required fields before processing
            if not self._validate_record(record):
                self.stats['skipped'] += 1
                return
            
            # Check if drug already exists (by setId or name + manufacturer)
            existing_drug_id = self._find_existing_drug(cursor, record)
            
            if existing_drug_id:
                # Update existing drug
                self._update_drug(cursor, existing_drug_id, record)
                self.stats['updated'] += 1
            else:
                # Insert new drug
                drug_id = self._insert_drug(cursor, record)
                self._insert_drug_label(cursor, drug_id, record)
                self.stats['inserted'] += 1
                
        except Exception as e:
            print(f"❌ Database error processing drug '{record.name}': {e}")
            # Log the specific error but continue processing
            self.stats['errors'] += 1
            raise  # Re-raise to let the batch handler decide whether to continue
    
    def _validate_record(self, record: DrugRecord) -> bool:
        """Validate that record has minimum required data for database insertion."""
        validation_errors = []
        
        # Check required fields
        if not record.name or len(record.name.strip()) == 0:
            validation_errors.append("Drug name is empty")
        
        if not record.manufacturer or len(record.manufacturer.strip()) == 0:
            validation_errors.append("Manufacturer is empty")
        
        if not record.indications or len(record.indications.strip()) == 0:
            validation_errors.append("Indications is empty")
        
        # Check field lengths to prevent database errors
        if len(record.name) > 255:
            validation_errors.append(f"Drug name too long ({len(record.name)} chars)")
        
        if len(record.manufacturer) > 255:
            validation_errors.append(f"Manufacturer name too long ({len(record.manufacturer)} chars)")
        
        if validation_errors:
            print(f"⚠️  Validation failed for drug '{record.name}': {'; '.join(validation_errors)}")
            return False
        
        return True
    
    def _find_existing_drug(self, cursor, record: DrugRecord) -> Optional[str]:
        """Find existing drug by setId or name+manufacturer."""
        
        # First try by setId if available
        if record.set_id:
            cursor.execute("""
                SELECT d.id FROM drugs d 
                JOIN drug_labels dl ON d.id = dl.drug_id
                WHERE dl.id = %s
                LIMIT 1
            """, (record.set_id,))
            
            result = cursor.fetchone()
            if result:
                return result['id']
        
        # Then try by name and manufacturer
        cursor.execute("""
            SELECT id FROM drugs 
            WHERE LOWER(drug_name) = LOWER(%s) AND LOWER(manufacturer) = LOWER(%s)
            LIMIT 1
        """, (record.name, record.manufacturer))
        
        result = cursor.fetchone()
        return result['id'] if result else None
    
    def _insert_drug(self, cursor, record: DrugRecord) -> str:
        """Insert new drug record."""
        drug_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO drugs (
                id, drug_name, set_id, slug, labeler, name, generic_name, 
                brand_name, manufacturer, dosage_form, strength, route, ndc, 
                fda_application_number, approval_date, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            drug_id,
            record.name,  # drug_name
            record.set_id,  # set_id
            record.slug,  # slug
            record.manufacturer,  # labeler (using manufacturer)
            record.name,  # name
            record.generic_name,
            record.brand_name,
            record.manufacturer,
            record.dosage_form,
            record.strength,
            record.route,
            record.ndc,
            record.fda_application_number,
            record.approval_date,
            datetime.now(timezone.utc),
            datetime.now(timezone.utc)
        ))
        
        return drug_id
    
    def _insert_drug_label(self, cursor, drug_id: str, record: DrugRecord):
        """Insert drug label record."""
        label_id = str(uuid.uuid4())
        
        cursor.execute("""
            INSERT INTO drug_labels (
                id, drug_id, generic_name, labeler_name, product_type, effective_time,
                title, indications_and_usage, dosage_and_administration, 
                dosage_forms_and_strengths, contraindications, warnings_and_precautions,
                adverse_reactions, clinical_pharmacology, how_supplied, mechanism_of_action,
                indications, warnings, precautions, pharmacokinetics, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
        """, (
            label_id,
            drug_id,
            record.generic_name,  # generic_name
            record.manufacturer,  # labeler_name
            'HUMAN PRESCRIPTION DRUG LABEL',  # product_type
            None,  # effective_time
            record.brand_name or record.name,  # title
            record.indications,  # indications_and_usage
            record.dosage_and_administration,
            None,  # dosage_forms_and_strengths
            record.contraindications,
            record.warnings,  # warnings_and_precautions
            record.adverse_reactions,
            record.clinical_pharmacology,
            record.how_supplied,
            record.mechanism_of_action,
            record.indications,  # indications (duplicate for compatibility)
            record.warnings,
            record.precautions,
            record.pharmacokinetics,
            datetime.now(timezone.utc),
            datetime.now(timezone.utc)
        ))
    
    def _update_drug(self, cursor, drug_id: str, record: DrugRecord):
        """Update existing drug and label records."""
        
        # Update drug record
        cursor.execute("""
            UPDATE drugs SET
                drug_name = %s,
                set_id = %s,
                slug = %s,
                labeler = %s,
                name = %s,
                generic_name = %s,
                brand_name = %s,
                manufacturer = %s,
                dosage_form = %s,
                strength = %s,
                route = %s,
                ndc = %s,
                fda_application_number = %s,
                approval_date = %s,
                updated_at = %s
            WHERE id = %s
        """, (
            record.name,  # drug_name
            record.set_id,
            record.slug,
            record.manufacturer,  # labeler
            record.name,
            record.generic_name,
            record.brand_name,
            record.manufacturer,
            record.dosage_form,
            record.strength,
            record.route,
            record.ndc,
            record.fda_application_number,
            record.approval_date,
            datetime.now(timezone.utc),
            drug_id
        ))
        
        # Update or insert drug label
        cursor.execute("""
            SELECT id FROM drug_labels WHERE drug_id = %s
        """, (drug_id,))
        
        label_result = cursor.fetchone()
        
        if label_result:
            # Update existing label
            cursor.execute("""
                UPDATE drug_labels SET
                    generic_name = %s,
                    labeler_name = %s,
                    title = %s,
                    indications_and_usage = %s,
                    dosage_and_administration = %s,
                    contraindications = %s,
                    warnings_and_precautions = %s,
                    adverse_reactions = %s,
                    clinical_pharmacology = %s,
                    how_supplied = %s,
                    mechanism_of_action = %s,
                    indications = %s,
                    warnings = %s,
                    precautions = %s,
                    pharmacokinetics = %s,
                    updated_at = %s
                WHERE drug_id = %s
            """, (
                record.generic_name,
                record.manufacturer,  # labeler_name
                record.brand_name or record.name,  # title
                record.indications,  # indications_and_usage
                record.dosage_and_administration,
                record.contraindications,
                record.warnings,  # warnings_and_precautions
                record.adverse_reactions,
                record.clinical_pharmacology,
                record.how_supplied,
                record.mechanism_of_action,
                record.indications,  # indications
                record.warnings,
                record.precautions,
                record.pharmacokinetics,
                datetime.now(timezone.utc),
                drug_id
            ))
        else:
            # Insert new label
            self._insert_drug_label(cursor, drug_id, record)
    
    def create_indexes(self):
        """Create database indexes for better performance."""
        # Use non-concurrent indexes for simplicity and transaction compatibility
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs USING gin(to_tsvector('english', drug_name))",
            "CREATE INDEX IF NOT EXISTS idx_drugs_manufacturer ON drugs (manufacturer)",
            "CREATE INDEX IF NOT EXISTS idx_drugs_generic_name ON drugs (generic_name)",
            "CREATE INDEX IF NOT EXISTS idx_drug_labels_indications ON drug_labels USING gin(to_tsvector('english', indications))",
            "CREATE INDEX IF NOT EXISTS idx_drugs_ndc ON drugs (ndc)",
        ]
        
        try:
            # Create a new connection with autocommit for index creation
            conn_params = self.db_config.get_psycopg2_params()
            with psycopg2.connect(**conn_params) as index_conn:
                index_conn.autocommit = True
                with index_conn.cursor() as cursor:
                    for index_sql in indexes:
                        try:
                            print(f"Creating index: {index_sql.split()[5]}")  # Extract index name
                            cursor.execute(index_sql)
                            print(f"✅ Index created successfully")
                        except Exception as e:
                            print(f"⚠️  Index creation skipped: {e}")
                            # Continue with other indexes
                            continue
                        
            print("🔍 Database indexes creation completed")
            
        except Exception as e:
            print(f"Error creating indexes: {e}")
    
    def get_stats(self) -> Dict[str, int]:
        """Get seeding statistics."""
        return self.stats.copy()
    
    def get_detailed_stats(self) -> Dict[str, Any]:
        """Get detailed seeding statistics with quality metrics."""
        stats = self.stats.copy()
        
        # Calculate success rate (as float for more detailed return type)
        total_attempted = stats['processed'] + stats['errors']
        if total_attempted > 0:
            success_rate = (stats['processed'] / total_attempted) * 100
        else:
            success_rate = 0.0
        
        # Calculate data quality score (as float for more detailed return type)
        total_records = stats['inserted'] + stats['updated']
        if total_records > 0:
            data_quality_score = max(0, 100 - (stats['errors'] / total_records) * 100)
        else:
            data_quality_score = 100.0
        
        # Create result with separate typing for calculated metrics
        result: Dict[str, Any] = stats.copy()
        result['success_rate'] = success_rate
        result['data_quality_score'] = data_quality_score
        
        return result
    
    def print_quality_report(self):
        """Print a detailed data quality report."""
        stats = self.get_detailed_stats()
        
        print("\n📋 Data Quality Report")
        print("=" * 50)
        print(f"📊 Records Processed: {stats['processed']}")
        print(f"➕ Records Inserted: {stats['inserted']}")
        print(f"🔄 Records Updated: {stats['updated']}")
        print(f"⏭️  Records Skipped: {stats['skipped']}")
        print(f"❌ Errors Encountered: {stats['errors']}")
        print(f"✅ Success Rate: {stats['success_rate']:.1f}%")
        print(f"🎯 Data Quality Score: {stats['data_quality_score']:.1f}%")
        
        if stats['errors'] > 0:
            print(f"\n⚠️  Recommendations:")
            print(f"   • Review error logs for data quality issues")
            print(f"   • Consider improving source data validation")
            if stats['success_rate'] < 95:
                print(f"   • Success rate below 95% - investigate data sources")
    
    def reset_stats(self):
        """Reset seeding statistics."""
        for key in self.stats:
            self.stats[key] = 0


if __name__ == "__main__":
    # Test the seeder
    from transformer import DrugDataTransformer
    
    # Test data
    test_data = {
        "drugName": "Test Drug",
        "labeler": "Test Manufacturer",
        "label": {
            "genericName": "test-generic",
            "indicationsAndUsage": "Test indications"
        }
    }
    
    # Transform data
    transformer = DrugDataTransformer()
    record = transformer.transform(test_data)
    
    if record:
        # Test database connection
        config = DatabaseConfig()
        
        try:
            with DrugDatabaseSeeder(config) as seeder:
                print("Database connection successful!")
                success = seeder.seed_drugs_batch([record])
                print(f"Seeding test: {'Success' if success else 'Failed'}")
                print(f"Stats: {seeder.get_stats()}")
        except Exception as e:
            print(f"Database test failed: {e}")
    else:
        print("Failed to transform test data")