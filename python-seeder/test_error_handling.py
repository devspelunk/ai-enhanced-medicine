#!/usr/bin/env python3
"""
Test script to verify graceful handling of missing/incomplete data.
"""

import os
import sys

# Change to the script directory to ensure relative imports work
script_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(script_dir)

# Add src directory to Python path
src_dir = os.path.join(script_dir, 'src')
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

# Import the transformer module
try:
    from src.transformer import DrugDataTransformer
    print("✅ Successfully imported DrugDataTransformer")
except ImportError as e:
    print(f"❌ Error: Could not import DrugDataTransformer: {e}")
    print(f"📁 Script directory: {script_dir}")
    print(f"📁 Source directory: {src_dir}")
    print(f"📁 Current working directory: {os.getcwd()}")
    
    # Check if transformer.py exists
    transformer_file = os.path.join(src_dir, 'transformer.py')
    if os.path.exists(transformer_file):
        print(f"✅ Found transformer.py at: {transformer_file}")
    else:
        print(f"❌ transformer.py not found at: {transformer_file}")
    
    print("\n💡 Run this script from the python-seeder directory:")
    print(f"   cd {script_dir}")
    print(f"   python test_error_handling.py")
    sys.exit(1)

def test_missing_data_handling():
    """Test transformer with various incomplete data scenarios."""
    
    transformer = DrugDataTransformer()
    
    test_cases = [
        {
            "name": "Complete record",
            "data": {
                "drugName": "Test Drug",
                "setId": "test-123",
                "slug": "test-drug",
                "labeler": "Test Manufacturer",
                "label": {
                    "genericName": "test-generic",
                    "title": "TEST DRUG",
                    "indicationsAndUsage": "<p>Used for testing purposes</p>",
                    "dosageAndAdministration": "<p>Take as directed</p>",
                    "dosageFormsAndStrengths": "<p>100 mg tablets</p>",
                    "warningsAndPrecautions": "<p>Be careful</p>",
                    "adverseReactions": "<p>May cause side effects</p>"
                }
            },
            "should_succeed": True
        },
        {
            "name": "Missing drug name",
            "data": {
                "labeler": "Test Manufacturer",
                "label": {
                    "indicationsAndUsage": "<p>Used for testing</p>"
                }
            },
            "should_succeed": False
        },
        {
            "name": "Missing labeler",
            "data": {
                "drugName": "Test Drug",
                "label": {
                    "indicationsAndUsage": "<p>Used for testing</p>"
                }
            },
            "should_succeed": True  # Should use fallback
        },
        {
            "name": "Empty label",
            "data": {
                "drugName": "Test Drug",
                "labeler": "Test Manufacturer",
                "label": {}
            },
            "should_succeed": True  # Should use defaults
        },
        {
            "name": "Missing label entirely",
            "data": {
                "drugName": "Test Drug",
                "labeler": "Test Manufacturer"
            },
            "should_succeed": True  # Should use defaults
        },
        {
            "name": "Invalid data type",
            "data": "not a dictionary",
            "should_succeed": False
        },
        {
            "name": "Empty drug name",
            "data": {
                "drugName": "",
                "labeler": "Test Manufacturer",
                "label": {
                    "indicationsAndUsage": "<p>Used for testing</p>"
                }
            },
            "should_succeed": False
        },
        {
            "name": "Alternative name sources",
            "data": {
                "name": "Alternative Name Drug",  # No drugName field
                "labeler": "Test Manufacturer",
                "label": {
                    "indicationsAndUsage": "<p>Used for testing</p>"
                }
            },
            "should_succeed": True  # Should use 'name' field
        }
    ]
    
    print("🧪 Testing Error Handling and Data Validation")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. Testing: {test_case['name']}")
        
        try:
            result = transformer.transform(test_case['data'])
            
            if test_case['should_succeed']:
                if result is not None:
                    print(f"   ✅ PASS - Successfully transformed record")
                    print(f"      Drug: {result.name}")
                    print(f"      Manufacturer: {result.manufacturer}")
                    print(f"      Indications: {result.indications[:50]}...")
                    passed_tests += 1
                else:
                    print(f"   ❌ FAIL - Expected success but got None")
            else:
                if result is None:
                    print(f"   ✅ PASS - Correctly rejected invalid data")
                    passed_tests += 1
                else:
                    print(f"   ❌ FAIL - Expected rejection but got result")
                    
        except Exception as e:
            print(f"   ❌ FAIL - Unexpected exception: {e}")
    
    print(f"\n📊 Test Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 All tests passed! Error handling is working correctly.")
        return True
    else:
        print("⚠️  Some tests failed. Review error handling implementation.")
        return False

def test_data_quality_reporting():
    """Test data quality issue reporting."""
    
    transformer = DrugDataTransformer()
    
    # Test with incomplete data to trigger quality issues
    incomplete_data = {
        "drugName": "Incomplete Drug",
        "label": {
            "title": "INCOMPLETE DRUG"
            # Missing most fields
        }
    }
    
    print("\n🔍 Testing Data Quality Reporting")
    print("=" * 40)
    
    result = transformer.transform(incomplete_data)
    
    if result:
        print(f"✅ Record processed with quality issues logged")
        print(f"   Drug: {result.name}")
        print(f"   Manufacturer: {result.manufacturer}")
        print(f"   Dosage Form: {result.dosage_form}")
        print(f"   Strength: {result.strength}")
        print(f"   Quality Issues: {len(transformer.data_quality_issues)}")
        
        for issue in transformer.data_quality_issues:
            print(f"     - {issue['type']}: {issue['description']}")
    else:
        print("❌ Record was rejected")

if __name__ == "__main__":
    print("🚀 Running Error Handling Tests")
    
    success = test_missing_data_handling()
    test_data_quality_reporting()
    
    if success:
        print("\n✅ All error handling tests completed successfully!")
        print("The seeder is ready to handle missing and incomplete data gracefully.")
    else:
        print("\n❌ Some tests failed. Please review the implementation.")
        sys.exit(1)