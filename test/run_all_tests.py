"""
Run all local LLM tests
This script runs all test suites in order
"""

import subprocess
import sys
import os

def run_test(test_file, user_id=None):
    """Run a test file"""
    print("\n" + "="*80)
    print(f"Running: {test_file}")
    print("="*80)
    
    cmd = [sys.executable, test_file]
    if user_id:
        cmd.append(user_id)
    
    try:
        result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
        return result.returncode == 0
    except Exception as e:
        print(f"Error running {test_file}: {e}")
        return False


def main():
    """Run all tests"""
    print("="*80)
    print("Local LLM Test Suite - Running All Tests")
    print("="*80)
    
    # Get user ID from command line if provided
    user_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    if user_id:
        print(f"Using user ID: {user_id}")
    else:
        print("No user ID provided. Using default from test files.")
        print("You can provide user ID as: python run_all_tests.py user_your_id")
    
    print("\nMake sure:")
    print("1. Backend server is running on http://localhost:8000")
    print("2. Ollama is installed and running (optional)")
    print("3. You have at least one Ollama model installed (optional)")
    
    input("\nPress Enter to continue...")
    
    # Test files to run in order
    test_files = [
        "test_web_vs_app_restriction.py",
        "test_local_llm_setup.py",
        "test_local_llm_fallback.py",
        "test_url_based_routing.py"
    ]
    
    results = {}
    
    for test_file in test_files:
        test_path = os.path.join(os.path.dirname(__file__), test_file)
        if os.path.exists(test_path):
            success = run_test(test_path, user_id)
            results[test_file] = "✓ PASSED" if success else "✗ FAILED"
        else:
            print(f"⚠ Test file not found: {test_file}")
            results[test_file] = "⚠ NOT FOUND"
    
    # Summary
    print("\n" + "="*80)
    print("Test Summary")
    print("="*80)
    for test_file, result in results.items():
        print(f"{test_file:40} {result}")
    print("="*80)
    
    passed = sum(1 for r in results.values() if "PASSED" in r)
    total = len(results)
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed!")
    else:
        print("\n⚠ Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    main()

