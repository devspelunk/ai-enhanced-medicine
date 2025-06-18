"""
Streaming JSON parser for large FDA label files.
Uses ijson to parse JSON incrementally without loading entire file into memory.
"""

import ijson
import json
from typing import Iterator, Dict, Any
from pathlib import Path


class DrugLabelParser:
    """Stream parser for FDA drug label JSON files."""
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        if not self.file_path.exists():
            raise FileNotFoundError(f"Labels file not found: {file_path}")
    
    def parse_drugs(self) -> Iterator[Dict[str, Any]]:
        """
        Parse drugs from JSON file one at a time.
        
        Yields:
            Dict containing drug information from JSON
        """
        try:
            with open(self.file_path, 'rb') as file:
                # Parse each item in the JSON array
                parser = ijson.items(file, 'item')
                
                for drug_data in parser:
                    if self._is_valid_drug_record(drug_data):
                        yield drug_data
                    else:
                        print(f"Skipping invalid drug record: {drug_data.get('drugName', 'Unknown')}")
                        
        except Exception as e:
            print(f"Error parsing JSON file: {e}")
            raise
    
    def _is_valid_drug_record(self, drug_data: Dict[str, Any]) -> bool:
        """
        Validate that drug record has minimum required fields.
        
        Args:
            drug_data: Raw drug data from JSON
            
        Returns:
            True if record is valid for processing
        """
        required_fields = ['drugName', 'labeler', 'label']
        
        # Check required top-level fields
        for field in required_fields:
            if field not in drug_data or not drug_data[field]:
                return False
        
        # Check label has some content
        label = drug_data.get('label', {})
        if not isinstance(label, dict):
            return False
            
        # At least one of these label fields should exist
        label_fields = [
            'indicationsAndUsage', 'dosageAndAdministration', 
            'warningsAndPrecautions', 'adverseReactions'
        ]
        
        has_content = any(label.get(field) for field in label_fields)
        
        return has_content
    
    def count_total_records(self) -> int:
        """
        Count total number of records in the file for progress tracking.
        This requires a full pass through the file.
        
        Returns:
            Total number of drug records
        """
        try:
            with open(self.file_path, 'rb') as file:
                parser = ijson.items(file, 'item')
                return sum(1 for _ in parser)
        except Exception as e:
            print(f"Error counting records: {e}")
            return 0


if __name__ == "__main__":
    # Test the parser
    parser = DrugLabelParser("../Labels.json")
    
    print("Testing parser...")
    count = 0
    for drug in parser.parse_drugs():
        print(f"Drug: {drug['drugName']} - {drug['labeler']}")
        count += 1
        if count >= 3:  # Just show first 3 for testing
            break
    
    print(f"Parser working! Processed {count} records.")