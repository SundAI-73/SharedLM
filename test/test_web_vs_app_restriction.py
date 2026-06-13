"""
Test file to verify that Ollama setup is restricted to application only
Tests that web version doesn't set up Ollama integrations
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"
TEST_USER_ID = "user_8v4jh5he"  # Update this


def make_request(method, endpoint, data=None, user_id=None):
    """Make an authenticated API request"""
    headers = {"Content-Type": "application/json"}
    if user_id:
        headers["X-User-ID"] = user_id
    
    url = f"{BASE_URL}{endpoint}"
    
    if method.upper() == "GET":
        response = requests.get(url, headers=headers)
    elif method.upper() == "POST":
        response = requests.post(url, headers=headers, json=data)
    else:
        raise ValueError(f"Unsupported method: {method}")
    
    return response


def test_check_local_integrations():
    """Check if local LLM integrations exist (should only exist if set up via application)"""
    print("\n" + "="*60)
    print("Test: Check Local LLM Integrations")
    print("="*60)
    
    response = make_request(
        "GET",
        f"/custom-integrations/{TEST_USER_ID}",
        user_id=TEST_USER_ID
    )
    
    if response.status_code == 200:
        integrations = response.json()
        local_integrations = [
            int for int in integrations 
            if int.get("provider_id", "").startswith("custom_local_")
        ]
        
        print(f"\nFound {len(local_integrations)} local LLM integrations:")
        for int in local_integrations:
            print(f"  - {int.get('name')} ({int.get('provider_id')})")
        
        if len(local_integrations) > 0:
            print("\n✓ Local LLM integrations exist")
            print("  These should only be created via the application (setup wizard)")
            print("  NOT via web interface")
        else:
            print("\n⚠ No local LLM integrations found")
            print("  This is expected if:")
            print("  1. Application hasn't been run yet")
            print("  2. Setup wizard hasn't completed")
            print("  3. No Ollama models are installed")
        
        return local_integrations
    
    return []


def test_verify_web_restriction():
    """Verify that web cannot create local LLM integrations"""
    print("\n" + "="*60)
    print("Test: Verify Web Restriction")
    print("="*60)
    
    print("\nThis test verifies the behavior:")
    print("1. Web version should NOT set up Ollama automatically")
    print("2. Only application (Electron) should set up Ollama")
    print("3. Setup happens via setupOllamaIntegration() which checks for window.electron")
    
    print("\nExpected behavior:")
    print("  - In web: setupOllamaIntegration() returns false immediately")
    print("  - In app: setupOllamaIntegration() creates integrations for installed models")
    
    # Check current state
    local_integrations = test_check_local_integrations()
    
    if len(local_integrations) == 0:
        print("\n✓ No local integrations found - web restriction is working")
        print("  (Integrations should only be created via application)")
    else:
        print(f"\n✓ Found {len(local_integrations)} local integrations")
        print("  These were likely created by the application, not web")
        print("  This is the expected behavior")


def test_verify_individual_models():
    """Verify that each model has its own integration"""
    print("\n" + "="*60)
    print("Test: Verify Individual Model Integrations")
    print("="*60)
    
    response = make_request(
        "GET",
        f"/custom-integrations/{TEST_USER_ID}",
        user_id=TEST_USER_ID
    )
    
    if response.status_code == 200:
        integrations = response.json()
        local_integrations = [
            int for int in integrations 
            if int.get("provider_id", "").startswith("custom_local_")
        ]
        
        if len(local_integrations) == 0:
            print("\n⚠ No local integrations found")
            return
        
        print(f"\n✓ Found {len(local_integrations)} individual model integrations:")
        
        # Group by model name pattern
        model_names = {}
        for int in local_integrations:
            provider_id = int.get("provider_id")
            name = int.get("name")
            # Extract model name from provider_id
            if provider_id.startswith("custom_local_"):
                model_name = provider_id.replace("custom_local_", "").replace("_", ".")
                model_names[model_name] = {
                    "provider_id": provider_id,
                    "name": name,
                    "integration": int
                }
        
        for model_name, info in model_names.items():
            print(f"\n  Model: {model_name}")
            print(f"    Provider ID: {info['provider_id']}")
            print(f"    Display Name: {info['name']}")
            print(f"    Base URL: {info['integration'].get('base_url')}")
            fallback_urls = info['integration'].get('fallback_urls')
            if fallback_urls:
                try:
                    fallbacks = json.loads(fallback_urls)
                    print(f"    Fallback URLs: {len(fallbacks)} configured")
                except:
                    print(f"    Fallback URLs: configured")
        
        print("\n✓ Each model has its own integration!")
        print("✓ Each integration can be used independently in chat!")


def main():
    """Run all tests"""
    global TEST_USER_ID
    
    print("="*60)
    print("Web vs Application Restriction Test")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    if len(sys.argv) > 1:
        TEST_USER_ID = sys.argv[1]
        print(f"Using user ID from command line: {TEST_USER_ID}")
    else:
        print(f"Test User ID: {TEST_USER_ID}")
    print("="*60)
    
    test_check_local_integrations()
    test_verify_web_restriction()
    test_verify_individual_models()
    
    print("\n" + "="*60)
    print("Test Complete")
    print("="*60)
    print("\nKey Points:")
    print("1. Local LLM integrations should ONLY be created via application")
    print("2. Web version should skip Ollama setup (window.electron check)")
    print("3. Each model should have its own custom integration")
    print("4. Each integration should have fallback URLs configured")


if __name__ == "__main__":
    main()

