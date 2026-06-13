"""
Test file for local LLM fallback functionality
Tests that fallback URLs and API keys work correctly
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/v1"

# Test user ID (update with your actual user ID)
TEST_USER_ID = "user_8v4jh5he"  # Update this


def make_request(method, endpoint, data=None, user_id=None):
    """Make an authenticated API request"""
    headers = {"Content-Type": "application/json"}
    if user_id:
        headers["X-User-ID"] = user_id
    
    url = f"{BASE_URL}{endpoint}"
    
    print(f"\n{'='*60}")
    print(f"{method} {url}")
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    
    if method.upper() == "GET":
        response = requests.get(url, headers=headers)
    elif method.upper() == "POST":
        response = requests.post(url, headers=headers, json=data)
    elif method.upper() == "PATCH":
        response = requests.patch(url, headers=headers, json=data)
    else:
        raise ValueError(f"Unsupported method: {method}")
    
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    
    return response


def test_create_ollama_with_fallbacks():
    """Test creating Ollama integration with fallback URLs"""
    print("\n" + "="*60)
    print("Test: Create Ollama Integration with Fallbacks")
    print("="*60)
    
    # Define fallback URLs
    fallback_urls = [
        {"url": "http://localhost:11435/v1", "api_key": "ollama"},
        {"url": "http://127.0.0.1:11434/v1", "api_key": "ollama"},
        {"url": "http://127.0.0.1:11435/v1", "api_key": "ollama"}
    ]
    
    integration_data = {
        "name": "Local Ollama",
        "base_url": "http://localhost:11434/v1",
        "api_type": "openai",
        "logo_url": None,
        "fallback_urls": json.dumps(fallback_urls)  # Store as JSON string
    }
    
    response = make_request(
        "POST",
        f"/custom-integrations/{TEST_USER_ID}",
        integration_data,
        TEST_USER_ID
    )
    
    if response.status_code in [200, 201]:
        data = response.json()
        integration = data.get("integration", {})
        print(f"\n✓ Integration created with ID: {integration.get('id')}")
        print(f"  Primary URL: {integration.get('base_url')}")
        print(f"  Fallback URLs: {integration.get('fallback_urls')}")
        return integration
    else:
        print(f"\n✗ Failed to create integration: {response.status_code}")
        return None


def test_get_integration_with_fallbacks():
    """Test retrieving integration with fallback URLs"""
    print("\n" + "="*60)
    print("Test: Get Integration with Fallbacks")
    print("="*60)
    
    response = make_request(
        "GET",
        f"/custom-integrations/{TEST_USER_ID}",
        user_id=TEST_USER_ID
    )
    
    if response.status_code == 200:
        integrations = response.json()
        ollama_integration = next(
            (int for int in integrations if int.get("provider_id") == "custom_local_ollama"),
            None
        )
        
        if ollama_integration:
            print(f"\n✓ Found Ollama integration")
            print(f"  Primary URL: {ollama_integration.get('base_url')}")
            fallback_urls = ollama_integration.get('fallback_urls')
            if fallback_urls:
                try:
                    fallbacks = json.loads(fallback_urls)
                    print(f"  Fallback URLs: {len(fallbacks)} configured")
                    for i, fb in enumerate(fallbacks, 1):
                        print(f"    {i}. {fb.get('url')} (key: {fb.get('api_key', 'N/A')})")
                except:
                    print(f"  Fallback URLs: {fallback_urls}")
            else:
                print("  ⚠ No fallback URLs configured")
            return ollama_integration
        else:
            print("\n⚠ Ollama integration not found")
            return None
    else:
        print(f"\n✗ Failed to get integrations: {response.status_code}")
        return None


def test_chat_with_fallback():
    """Test chat with fallback URLs (if primary fails)"""
    print("\n" + "="*60)
    print("Test: Chat with Fallback Support")
    print("="*60)
    
    chat_data = {
        "user_id": TEST_USER_ID,
        "message": "Hello, this is a test message",
        "model_provider": "custom_local_ollama",
        "model_choice": "gemma3",  # Use an installed model
        "session_id": None,
        "project_id": None
    }
    
    response = make_request(
        "POST",
        "/chat",
        chat_data,
        TEST_USER_ID
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"\n✓ Chat successful")
        print(f"  Reply: {data.get('reply', '')[:100]}...")
        print(f"  Model used: {data.get('used_model', 'N/A')}")
        return True
    else:
        print(f"\n⚠ Chat failed: {response.status_code}")
        print(f"  This might be expected if Ollama is not running")
        return False


def test_fallback_behavior():
    """Test that fallbacks are used when primary URL fails"""
    print("\n" + "="*60)
    print("Test: Fallback Behavior")
    print("="*60)
    print("\nThis test checks if the system tries fallback URLs when primary fails.")
    print("To fully test this, you would need to:")
    print("1. Start Ollama on a non-default port (e.g., 11435)")
    print("2. Set primary URL to a non-existent port")
    print("3. Verify that fallback URLs are tried")
    print("\nFor now, this is a placeholder test.")


def main():
    """Run all tests"""
    global TEST_USER_ID
    
    print("="*60)
    print("Local LLM Fallback Test Suite")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    if len(sys.argv) > 1:
        TEST_USER_ID = sys.argv[1]
        print(f"Using user ID from command line: {TEST_USER_ID}")
    else:
        print(f"Test User ID: {TEST_USER_ID}")
    print("="*60)
    
    # Run tests
    integration = test_create_ollama_with_fallbacks()
    
    if integration:
        test_get_integration_with_fallbacks()
        test_chat_with_fallback()
    
    test_fallback_behavior()
    
    print("\n" + "="*60)
    print("Test Suite Complete")
    print("="*60)
    print("\nNotes:")
    print("- Fallback URLs are stored as JSON in the fallback_urls field")
    print("- The LLM router will try each URL in order until one succeeds")
    print("- This is only available in the application (setup wizard), not in web")
    print("- Fallbacks help ensure local LLM works even if default port changes")


if __name__ == "__main__":
    main()

