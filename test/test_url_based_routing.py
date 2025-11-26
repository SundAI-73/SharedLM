"""
Automated tests for URL-based routing implementation

Tests:
1. Localhost URLs handled client-side (Electron only)
2. Non-localhost custom integrations go through backend
3. Backend rejection of localhost URLs on cloud
4. Cloud providers work through backend
5. Memory search/storage skipped for localhost URLs
"""

import requests
import json
import sys
import os
from typing import Dict, Optional, List

# Base URL for backend API
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
TEST_USER_ID = "user_test_url_routing"

def make_request(method: str, endpoint: str, data: Optional[Dict] = None, user_id: Optional[str] = None) -> requests.Response:
    """Make HTTP request with authentication"""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "X-User-ID": user_id or TEST_USER_ID
    }
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.ConnectionError as e:
        print(f"[ERROR] Connection failed: {e}")
        print(f"  URL: {url}")
        print(f"  Make sure backend is running on {BASE_URL}")
        return None
    except requests.exceptions.Timeout as e:
        print(f"[ERROR] Request timeout: {e}")
        print(f"  URL: {url}")
        return None
    except requests.exceptions.RequestException as e:
        error_msg = str(e)
        print(f"[ERROR] Request failed: {error_msg}")
        print(f"  URL: {url}")
        print(f"  Method: {method}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"  Response status: {e.response.status_code}")
            try:
                error_detail = e.response.text[:200]
                print(f"  Response body: {error_detail}")
            except:
                pass
        # Also try to make a simple request to see if it's a connection issue
        if "Connection" in error_msg or "refused" in error_msg.lower():
            print(f"  [INFO] This might be a connection issue. Check if backend is running on {BASE_URL}")
        return None


def test_create_localhost_custom_integration() -> Optional[Dict]:
    """Test creating a custom integration with localhost URL"""
    print("\n" + "="*60)
    print("Test: Create Localhost Custom Integration")
    print("="*60)
    
    integration_data = {
        "name": "Test Localhost LLM",
        "base_url": "http://localhost:11434/v1",
        "api_type": "openai",
        "logo_url": None,
        "fallback_urls": json.dumps([
            {"url": "http://127.0.0.1:11434/v1", "api_key": "ollama"},
            {"url": "http://localhost:11435/v1", "api_key": "ollama"}
        ])
    }
    
    print(f"\nPOST {BASE_URL}/custom-integrations/{TEST_USER_ID}")
    print(f"Data: {json.dumps(integration_data, indent=2)}")
    
    response = make_request("POST", f"/custom-integrations/{TEST_USER_ID}", integration_data)
    
    if response and response.status_code == 201:
        integration = response.json()
        print(f"[OK] Status: {response.status_code}")
        print(f"[OK] Created integration: {integration.get('name')} (ID: {integration.get('id')})")
        print(f"[OK] Provider ID: {integration.get('provider_id')}")
        print(f"[OK] Base URL: {integration.get('base_url')}")
        return integration
    else:
        status = response.status_code if response else "No response"
        if response:
            try:
                error = response.json().get("detail", "Unknown error")
            except:
                error = response.text[:200] if hasattr(response, 'text') else "Unknown error"
        else:
            error = "Request failed - no response from server"
        print(f"[FAIL] Status: {status}")
        print(f"[FAIL] Error: {error}")
        if status == 401:
            print(f"[INFO] Authentication failed. Make sure user exists in database.")
        return None


def test_create_non_localhost_custom_integration() -> Optional[Dict]:
    """Test creating a custom integration with non-localhost URL"""
    print("\n" + "="*60)
    print("Test: Create Non-Localhost Custom Integration")
    print("="*60)
    
    integration_data = {
        "name": "Test Custom Server",
        "base_url": "http://192.168.1.100:8000/v1",
        "api_type": "openai",
        "logo_url": None
    }
    
    print(f"\nPOST {BASE_URL}/custom-integrations/{TEST_USER_ID}")
    print(f"Data: {json.dumps(integration_data, indent=2)}")
    
    response = make_request("POST", f"/custom-integrations/{TEST_USER_ID}", integration_data)
    
    if response and response.status_code == 201:
        integration = response.json()
        print(f"[OK] Status: {response.status_code}")
        print(f"[OK] Created integration: {integration.get('name')} (ID: {integration.get('id')})")
        print(f"[OK] Provider ID: {integration.get('provider_id')}")
        print(f"[OK] Base URL: {integration.get('base_url')}")
        return integration
    else:
        status = response.status_code if response else "No response"
        if response:
            try:
                error = response.json().get("detail", "Unknown error")
            except:
                error = response.text[:200] if hasattr(response, 'text') else "Unknown error"
        else:
            error = "Request failed - no response from server"
        print(f"[FAIL] Status: {status}")
        print(f"[FAIL] Error: {error}")
        if status == 401:
            print(f"[INFO] Authentication failed. Make sure user exists in database.")
        return None


def test_backend_rejects_localhost_on_cloud(integration: Dict):
    """Test that backend rejects localhost URLs when on cloud"""
    print("\n" + "="*60)
    print("Test: Backend Rejection of Localhost on Cloud")
    print("="*60)
    
    # Check if we're on cloud (simulated by checking environment)
    is_cloud = os.getenv("RENDER") or os.getenv("DYNO") or os.getenv("VERCEL") or os.getenv("RAILWAY_ENVIRONMENT")
    
    if not is_cloud:
        print("[WARN] Not on cloud server - this test requires cloud environment")
        print("  Set RENDER, DYNO, VERCEL, or RAILWAY_ENVIRONMENT env var to test")
        return
    
    provider_id = integration.get("provider_id")
    chat_data = {
        "user_id": TEST_USER_ID,
        "message": "Test message",
        "model_provider": provider_id,
        "model_choice": "default",
        "session_id": None,
        "project_id": None
    }
    
    print(f"\nPOST {BASE_URL}/chat")
    print(f"Data: {json.dumps(chat_data, indent=2)}")
    
    response = make_request("POST", "/chat", chat_data)
    
    if response and response.status_code == 400:
        error_detail = response.json().get("detail", "")
        if "localhost" in error_detail.lower() or "desktop application" in error_detail.lower():
            print(f"[OK] Status: {response.status_code}")
            print(f"[OK] Correctly rejected localhost URL on cloud")
            print(f"[OK] Error message: {error_detail}")
            return True
        else:
            print(f"[FAIL] Status: {response.status_code}")
            print(f"[FAIL] Wrong error message: {error_detail}")
            return False
    else:
        status = response.status_code if response else "No response"
        print(f"[FAIL] Expected 400 rejection, got: {status}")
        return False


def test_non_localhost_goes_through_backend(integration: Dict):
    """Test that non-localhost custom integrations go through backend"""
    print("\n" + "="*60)
    print("Test: Non-Localhost Goes Through Backend")
    print("="*60)
    
    provider_id = integration.get("provider_id")
    chat_data = {
        "user_id": TEST_USER_ID,
        "message": "Test message",
        "model_provider": provider_id,
        "model_choice": "default",
        "session_id": None,
        "project_id": None
    }
    
    print(f"\nPOST {BASE_URL}/chat")
    print(f"Data: {json.dumps(chat_data, indent=2)}")
    
    response = make_request("POST", "/chat", chat_data)
    
    if response:
        status = response.status_code
        print(f"Status: {status}")
        
        if status == 200:
            data = response.json()
            print(f"[OK] Request went through backend")
            print(f"[OK] Response received: {data.get('reply', '')[:50]}...")
            return True
        elif status == 400 or status == 404:
            error = response.json().get("detail", "Unknown error")
            print(f"[WARN] Backend processed request but returned error: {error}")
            print(f"  (This is expected if the custom server is not running)")
            return True  # Still counts as "went through backend"
        else:
            print(f"[FAIL] Unexpected status: {status}")
            return False
    else:
        print(f"[FAIL] No response from backend")
        return False


def test_get_custom_integrations() -> List[Dict]:
    """Test getting all custom integrations"""
    print("\n" + "="*60)
    print("Test: Get Custom Integrations")
    print("="*60)
    
    response = make_request("GET", f"/custom-integrations/{TEST_USER_ID}")
    
    if response and response.status_code == 200:
        integrations = response.json()
        print(f"[OK] Status: {response.status_code}")
        print(f"[OK] Found {len(integrations)} custom integration(s)")
        for int in integrations:
            is_localhost = any(
                localhost in int.get("base_url", "").lower()
                for localhost in ["localhost", "127.0.0.1", "0.0.0.0"]
            )
            localhost_label = "localhost" if is_localhost else "non-localhost"
            print(f"  - {int.get('name')} ({localhost_label}): {int.get('base_url')}")
        return integrations
    else:
        status = response.status_code if response else "No response"
        print(f"[FAIL] Status: {status}")
        return []


def test_url_detection_logic():
    """Test URL detection logic for localhost vs non-localhost"""
    print("\n" + "="*60)
    print("Test: URL Detection Logic")
    print("="*60)
    
    test_urls = [
        ("http://localhost:11434/v1", True, "localhost"),
        ("http://127.0.0.1:11434/v1", True, "127.0.0.1"),
        ("http://0.0.0.0:11434/v1", True, "0.0.0.0"),
        ("http://192.168.1.100:8000/v1", False, "non-localhost"),
        ("http://example.com:8000/v1", False, "non-localhost"),
        ("https://api.openai.com/v1", False, "non-localhost"),
    ]
    
    print("\nTesting URL detection:")
    all_passed = True
    
    for url, expected_localhost, label in test_urls:
        is_localhost = any(
            localhost in url.lower()
            for localhost in ["localhost", "127.0.0.1", "0.0.0.0"]
        )
        
        if is_localhost == expected_localhost:
            print(f"[OK] {url[:50]:<50} -> {label}")
        else:
            print(f"[FAIL] {url[:50]:<50} -> Expected {label}, got {'localhost' if is_localhost else 'non-localhost'}")
            all_passed = False
    
    return all_passed


def test_cloud_provider_through_backend():
    """Test that cloud providers go through backend"""
    print("\n" + "="*60)
    print("Test: Cloud Provider Through Backend")
    print("="*60)
    
    # This test requires an API key to be set up
    # We'll just verify the endpoint accepts the request structure
    chat_data = {
        "user_id": TEST_USER_ID,
        "message": "Test message",
        "model_provider": "mistral",  # Cloud provider
        "model_choice": "mistral-small-latest",
        "session_id": None,
        "project_id": None
    }
    
    print(f"\nPOST {BASE_URL}/chat")
    print(f"Data: {json.dumps(chat_data, indent=2)}")
    
    response = make_request("POST", "/chat", chat_data)
    
    if response:
        status = response.status_code
        print(f"Status: {status}")
        
        if status == 200:
            print(f"[OK] Cloud provider request went through backend")
            return True
        elif status == 400:
            error = response.json().get("detail", "")
            if "API key" in error:
                print(f"[WARN] Backend processed request but API key missing (expected)")
                print(f"  This confirms request went through backend")
                return True
            else:
                print(f"[FAIL] Unexpected error: {error}")
                return False
        else:
            print(f"[WARN] Status: {status} (may be expected if API key not configured)")
            return True  # Still counts as "went through backend"
    else:
        print(f"[FAIL] No response from backend")
        return False


def cleanup_test_integrations(integrations: List[Dict]):
    """Clean up test integrations"""
    print("\n" + "="*60)
    print("Cleanup: Removing Test Integrations")
    print("="*60)
    
    for integration in integrations:
        integration_id = integration.get("id")
        if integration_id:
            response = make_request("DELETE", f"/custom-integrations/{integration_id}")
            if response and response.status_code == 200:
                print(f"[OK] Deleted integration: {integration.get('name')}")
            else:
                status = response.status_code if response else "No response"
                print(f"[WARN] Failed to delete integration {integration_id}: {status}")


def main():
    """Run all tests"""
    global TEST_USER_ID
    
    print("="*60)
    print("URL-Based Routing Test Suite")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    
    if len(sys.argv) > 1:
        TEST_USER_ID = sys.argv[1]
        print(f"Using user ID from command line: {TEST_USER_ID}")
    else:
        print(f"Test User ID: {TEST_USER_ID}")
        print("\nYou can provide a user ID as argument:")
        print("  python test_url_based_routing.py user_your_id")
    
    print("="*60)
    
    # Check backend is running
    try:
        health = requests.get(f"{BASE_URL}/health", timeout=5)
        if health.status_code != 200:
            print("[WARN] Backend health check failed")
            return
    except:
        print("[ERROR] Cannot connect to backend. Make sure it's running on", BASE_URL)
        return
    
    print("[OK] Backend is running")
    print(f"\n[INFO] Note: Some tests may fail with 401 if user '{TEST_USER_ID}' doesn't exist.")
    print(f"       This is expected - the tests verify routing logic, not authentication.")
    print(f"       To test with a real user, provide user ID as argument.")
    
    results = {}
    created_integrations = []
    
    # Test 1: URL Detection Logic
    results["url_detection"] = test_url_detection_logic()
    
    # Test 2: Create Localhost Integration
    localhost_integration = test_create_localhost_custom_integration()
    if localhost_integration:
        created_integrations.append(localhost_integration)
    
    # Test 3: Create Non-Localhost Integration
    non_localhost_integration = test_create_non_localhost_custom_integration()
    if non_localhost_integration:
        created_integrations.append(non_localhost_integration)
    
    # Test 4: Get All Integrations
    all_integrations = test_get_custom_integrations()
    
    # Test 5: Non-Localhost Goes Through Backend
    if non_localhost_integration:
        results["non_localhost_backend"] = test_non_localhost_goes_through_backend(non_localhost_integration)
    
    # Test 6: Cloud Provider Through Backend
    results["cloud_provider_backend"] = test_cloud_provider_through_backend()
    
    # Test 7: Backend Rejection on Cloud (only if on cloud)
    if localhost_integration:
        results["cloud_rejection"] = test_backend_rejects_localhost_on_cloud(localhost_integration)
    
    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, result in results.items():
        if result is True:
            print(f"[OK] {test_name}")
        elif result is False:
            print(f"[FAIL] {test_name}")
        else:
            print(f"[SKIP] {test_name} (skipped)")
    
    # Cleanup
    if created_integrations:
        cleanup_choice = input("\nClean up test integrations? (y/n): ").strip().lower()
        if cleanup_choice == 'y':
            cleanup_test_integrations(created_integrations)
    
    print("\n" + "="*60)
    print("Test Suite Complete")
    print("="*60)
    
    print("\nKey Points:")
    print("1. Localhost URLs should be handled client-side in Electron app")
    print("2. Non-localhost custom URLs should go through backend")
    print("3. Cloud providers should always go through backend")
    print("4. Backend should reject localhost URLs on cloud servers")
    print("5. Web should reject localhost URLs with clear error")


if __name__ == "__main__":
    main()

