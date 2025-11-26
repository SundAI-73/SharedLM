"""
Test file for local LLM setup functionality
Tests that individual model integrations are created correctly
"""

import requests
import json
import sys
from typing import List, Dict, Optional

BASE_URL = "http://localhost:8000"
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_API_URL = f"{OLLAMA_BASE_URL}/v1"

# Test user ID (update with your actual user ID)
TEST_USER_ID = "user_8v4jh5he"  # Update this


def make_request(method: str, endpoint: str, data: Optional[Dict] = None, user_id: Optional[str] = None) -> requests.Response:
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
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
        return response
    except:
        print(f"Response: {response.text}")
        return response


def test_get_ollama_models():
    """Test getting list of installed Ollama models"""
    print("\n" + "="*60)
    print("Test: Get Ollama Models")
    print("="*60)
    
    response = make_request("GET", "/ollama/models")
    
    if response.status_code == 503:
        print("⚠ Ollama is not installed")
        return []
    
    if response.status_code == 200:
        data = response.json()
        installed_models = data.get("installed_models", [])
        print(f"\n✓ Found {len(installed_models)} installed models:")
        for model in installed_models:
            print(f"  - {model}")
        return installed_models
    
    return []


def test_create_individual_model_integrations(models: List[str]):
    """Test creating separate custom integrations for each model"""
    print("\n" + "="*60)
    print("Test: Create Individual Model Integrations")
    print("="*60)
    
    fallback_urls = [
        {"url": "http://localhost:11435/v1", "api_key": "ollama"},
        {"url": "http://127.0.0.1:11434/v1", "api_key": "ollama"},
        {"url": "http://127.0.0.1:11435/v1", "api_key": "ollama"}
    ]
    
    created_integrations = []
    
    for model_name in models:
        # Generate provider_id from model name
        sanitized_name = model_name.lower().replace('.', '_').replace(':', '_').replace('-', '_')
        provider_id = f"custom_local_{sanitized_name}"
        
        print(f"\nCreating integration for model: {model_name}")
        print(f"  Provider ID: {provider_id}")
        
        integration_data = {
            "name": f"Local {model_name}",
            "base_url": OLLAMA_API_URL,
            "api_type": "openai",
            "logo_url": None,
            "fallback_urls": json.dumps(fallback_urls)
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
            created_integrations.append({
                "model": model_name,
                "provider_id": provider_id,
                "integration": integration
            })
            print(f"  ✓ Created: {integration.get('name')} (ID: {integration.get('id')})")
        else:
            print(f"  ✗ Failed: {response.status_code}")
    
    return created_integrations


def test_create_api_keys_for_models(models: List[str]):
    """Test creating API keys for each model integration"""
    print("\n" + "="*60)
    print("Test: Create API Keys for Models")
    print("="*60)
    
    created_keys = []
    
    for model_name in models:
        sanitized_name = model_name.lower().replace('.', '_').replace(':', '_').replace('-', '_')
        provider_id = f"custom_local_{sanitized_name}"
        
        print(f"\nCreating API key for: {model_name}")
        
        api_key_data = {
            "provider": provider_id,
            "api_key": "ollama",
            "key_name": f"Local {model_name} API Key"
        }
        
        response = make_request(
            "POST",
            f"/api-keys/{TEST_USER_ID}",
            api_key_data,
            TEST_USER_ID
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            created_keys.append({
                "model": model_name,
                "provider_id": provider_id,
                "key": data
            })
            print(f"  ✓ Created API key for {provider_id}")
        else:
            print(f"  ⚠ Status: {response.status_code}")
            # May already exist, which is okay
    
    return created_keys


def test_get_all_local_integrations():
    """Test retrieving all local LLM integrations"""
    print("\n" + "="*60)
    print("Test: Get All Local LLM Integrations")
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
        
        print(f"\n✓ Found {len(local_integrations)} local LLM integrations:")
        for int in local_integrations:
            provider_id = int.get("provider_id")
            name = int.get("name")
            fallback_urls = int.get("fallback_urls")
            print(f"  - {name} ({provider_id})")
            if fallback_urls:
                try:
                    fallbacks = json.loads(fallback_urls)
                    print(f"    Fallbacks: {len(fallbacks)} URLs configured")
                except:
                    print(f"    Fallbacks: {fallback_urls}")
        
        return local_integrations
    
    return []


def test_get_available_models():
    """Test getting available models (should include local LLM integrations)"""
    print("\n" + "="*60)
    print("Test: Get Available Models")
    print("="*60)
    
    response = make_request(
        "GET",
        f"/models?user_id={TEST_USER_ID}",
        user_id=TEST_USER_ID
    )
    
    if response.status_code == 200:
        data = response.json()
        available_models = data.get("available_models", [])
        
        local_models = [m for m in available_models if m.startswith("custom_local_")]
        
        print(f"\n✓ Available models: {len(available_models)} total")
        print(f"  Local LLM models: {len(local_models)}")
        for model in local_models:
            print(f"    - {model}")
        
        return available_models
    
    return []


def test_chat_with_individual_model(provider_id: str, model_name: str):
    """Test sending a chat message with a specific model"""
    print("\n" + "="*60)
    print(f"Test: Chat with {model_name}")
    print("="*60)
    
    chat_data = {
        "user_id": TEST_USER_ID,
        "message": "Hello, this is a test message. Please respond briefly.",
        "model_provider": provider_id,
        "model_choice": model_name,  # Use the actual model name
        "session_id": None,
        "project_id": None
    }
    
    print(f"\nSending chat message...")
    print(f"  Provider: {provider_id}")
    print(f"  Model: {model_name}")
    
    response = make_request(
        "POST",
        "/chat",
        chat_data,
        TEST_USER_ID
    )
    
    if response.status_code == 200:
        data = response.json()
        reply = data.get("reply", "")
        used_model = data.get("used_model", "")
        print(f"\n✓ Chat successful!")
        print(f"  Used model: {used_model}")
        print(f"  Reply preview: {reply[:100]}...")
        return True
    else:
        print(f"\n⚠ Chat failed: {response.status_code}")
        print(f"  This might be expected if Ollama is not running or model is not installed")
        return False


def test_fallback_urls():
    """Test that fallback URLs are configured correctly"""
    print("\n" + "="*60)
    print("Test: Fallback URLs Configuration")
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
        
        print(f"\nChecking fallback URLs for {len(local_integrations)} integrations...")
        
        for int in local_integrations:
            provider_id = int.get("provider_id")
            fallback_urls = int.get("fallback_urls")
            
            if fallback_urls:
                try:
                    fallbacks = json.loads(fallback_urls)
                    print(f"\n✓ {provider_id}:")
                    print(f"  Primary URL: {int.get('base_url')}")
                    print(f"  Fallback URLs: {len(fallbacks)}")
                    for i, fb in enumerate(fallbacks, 1):
                        print(f"    {i}. {fb.get('url')} (key: {fb.get('api_key', 'N/A')})")
                except Exception as e:
                    print(f"\n⚠ {provider_id}: Failed to parse fallback URLs: {e}")
            else:
                print(f"\n⚠ {provider_id}: No fallback URLs configured")


def main():
    """Run all tests"""
    global TEST_USER_ID
    
    print("="*60)
    print("Local LLM Setup Test Suite")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    if len(sys.argv) > 1:
        TEST_USER_ID = sys.argv[1]
        print(f"Using user ID from command line: {TEST_USER_ID}")
    else:
        print(f"Test User ID: {TEST_USER_ID}")
    print("="*60)
    
    # Step 1: Get installed Ollama models
    installed_models = test_get_ollama_models()
    
    if not installed_models:
        print("\n⚠ No Ollama models found. Please install some models first:")
        print("  ollama pull gemma3")
        print("  ollama pull llama3.2")
        return
    
    # Step 2: Create individual integrations for each model
    created_integrations = test_create_individual_model_integrations(installed_models)
    
    # Step 3: Create API keys for each model
    created_keys = test_create_api_keys_for_models(installed_models)
    
    # Step 4: Verify all integrations
    all_integrations = test_get_all_local_integrations()
    
    # Step 5: Check available models
    available_models = test_get_available_models()
    
    # Step 6: Test fallback URLs
    test_fallback_urls()
    
    # Step 7: Test chat with first model (if available)
    if created_integrations:
        first_integration = created_integrations[0]
        test_chat_with_individual_model(
            first_integration["provider_id"],
            first_integration["model"]
        )
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    print(f"Installed models: {len(installed_models)}")
    print(f"Created integrations: {len(created_integrations)}")
    print(f"Created API keys: {len(created_keys)}")
    print(f"Total local integrations: {len(all_integrations)}")
    print(f"Available in models endpoint: {len([m for m in available_models if m.startswith('custom_local_')])}")
    print("="*60)
    
    print("\n✓ Each model should now have its own custom integration!")
    print("✓ Each integration should have fallback URLs configured!")
    print("✓ Models should appear separately in the chat interface!")


if __name__ == "__main__":
    main()

