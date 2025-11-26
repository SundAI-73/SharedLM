"""
Test client helper utilities
"""
from typing import Dict, Optional
from fastapi.testclient import TestClient


def make_authenticated_request(
    client: TestClient,
    method: str,
    url: str,
    user_id: str,
    json: Optional[Dict] = None,
    data: Optional[Dict] = None,
    headers: Optional[Dict] = None
):
    """
    Make an authenticated request to the API
    
    Args:
        client: TestClient instance
        method: HTTP method (get, post, put, delete, etc.)
        url: API endpoint URL
        user_id: User ID for authentication
        json: JSON body (optional)
        data: Form data (optional)
        headers: Additional headers (optional)
    
    Returns:
        Response object
    """
    auth_headers = {"X-User-ID": user_id}
    if headers:
        auth_headers.update(headers)
    
    request_method = getattr(client, method.lower())
    
    if json:
        return request_method(url, json=json, headers=auth_headers)
    elif data:
        return request_method(url, data=data, headers=auth_headers)
    else:
        return request_method(url, headers=auth_headers)


def create_test_user(client: TestClient, email: str, password: str, display_name: str):
    """
    Create a test user via API
    
    Args:
        client: TestClient instance
        email: User email
        password: User password
        display_name: User display name
    
    Returns:
        Response object
    """
    return client.post(
        "/auth/signup",
        json={
            "email": email,
            "password": password,
            "display_name": display_name
        }
    )


def login_test_user(client: TestClient, email: str, password: str):
    """
    Login a test user via API
    
    Args:
        client: TestClient instance
        email: User email
        password: User password
    
    Returns:
        Response object
    """
    return client.post(
        "/auth/login",
        json={
            "email": email,
            "password": password
        }
    )

