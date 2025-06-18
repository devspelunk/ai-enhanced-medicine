#!/usr/bin/env python3
"""
Simple test runner that imports modules directly.
This avoids path manipulation issues.
"""

import os
import sys

# Change to the directory where this script is located
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Add src directory to path
sys.path.insert(0, 'src')

# Now import normally
from transformer import DrugDataTransformer

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
        
        # Check if the transformer has data_quality_issues attribute
        if hasattr(transformer, 'data_quality_issues'):
            print(f"   Quality Issues: {len(transformer.data_quality_issues)}")
            
            for issue in transformer.data_quality_issues:
                print(f"     - {issue['type']}: {issue['description']}")
        else:
            print("   Quality tracking not implemented yet")
    else:
        print("❌ Record was rejected")

if __name__ == "__main__":
    print("🚀 Running Error Handling Tests")
    print(f"📁 Working directory: {os.getcwd()}")
    print(f"📄 Python path includes: {sys.path[0]}")
    
    try:
        success = test_missing_data_handling()
        test_data_quality_reporting()
        
        if success:
            print("\n✅ All error handling tests completed successfully!")
            print("The seeder is ready to handle missing and incomplete data gracefully.")
        else:
            print("\n❌ Some tests failed. Please review the implementation.")
            sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)