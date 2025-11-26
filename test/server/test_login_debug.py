"""
Diagnostic tests for login debugging
Run these locally to understand what's happening with login
"""
import pytest
from fastapi.testclient import TestClient
from database import crud
from database.models import User


@pytest.mark.api
class TestLoginDebug:
    """Diagnostic tests to debug login issues"""
    
    def test_check_database_user_count(self, test_db):
        """Check how many users exist in the database"""
        user_count = test_db.query(User).count()
        print(f"\n{'='*60}")
        print(f"Database has {user_count} user(s)")
        print(f"{'='*60}")
        
        if user_count > 0:
            users = test_db.query(User).all()
            print("\nExisting users:")
            for user in users:
                print(f"  - ID: {user.id}")
                print(f"    Email: {user.email}")
                print(f"    Display Name: {user.display_name}")
        else:
            print("\n⚠️  No users found in database!")
            print("   This is likely why login is failing on Render.")
        
        assert user_count >= 0  # Just a check, won't fail
    
    def test_login_with_nonexistent_user(self, client: TestClient):
        """Test what happens when trying to login with non-existent user"""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "somepassword123"
            }
        )
        
        print(f"\n{'='*60}")
        print("Login with NON-EXISTENT user:")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"{'='*60}")
        
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()
        print("✓ Correctly returns 401 for non-existent user")
    
    def test_login_with_wrong_password(self, client: TestClient, test_user):
        """Test what happens when trying to login with wrong password"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword123"  # Wrong password
            }
        )
        
        print(f"\n{'='*60}")
        print("Login with WRONG password (user exists):")
        print(f"  User Email: {test_user.email}")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"{'='*60}")
        
        assert response.status_code == 401
        assert "invalid credentials" in response.json()["detail"].lower()
        print("✓ Correctly returns 401 for wrong password")
    
    def test_login_with_correct_credentials(self, client: TestClient, test_user):
        """Test successful login"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123"  # Correct password from fixture
            }
        )
        
        print(f"\n{'='*60}")
        print("Login with CORRECT credentials:")
        print(f"  User Email: {test_user.email}")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"{'='*60}")
        
        assert response.status_code == 200
        assert response.json()["success"] is True
        assert response.json()["user"]["email"] == test_user.email
        print("✓ Login successful!")
    
    def test_check_user_by_email_query(self, test_db, test_user):
        """Test the database query that checks if user exists"""
        # Test with existing user
        user_found = crud.get_user_by_email(test_db, test_user.email)
        
        print(f"\n{'='*60}")
        print("Database Query Test:")
        print(f"  Searching for: {test_user.email}")
        
        if user_found:
            print(f"  ✓ User found!")
            print(f"    ID: {user_found.id}")
            print(f"    Email: {user_found.email}")
        else:
            print(f"  ✗ User NOT found!")
        
        # Test with non-existent user
        user_not_found = crud.get_user_by_email(test_db, "nonexistent@example.com")
        
        print(f"\n  Searching for: nonexistent@example.com")
        if user_not_found:
            print(f"  ✗ User found (unexpected!)")
        else:
            print(f"  ✓ User NOT found (expected)")
        
        print(f"{'='*60}")
        
        assert user_found is not None
        assert user_not_found is None
    
    def test_password_verification(self, test_db, test_user):
        """Test password verification logic"""
        correct_password = "testpassword123"
        wrong_password = "wrongpassword123"
        
        # Get user from database
        user = crud.get_user_by_email(test_db, test_user.email)
        
        print(f"\n{'='*60}")
        print("Password Verification Test:")
        print(f"  User Email: {user.email}")
        
        # Test correct password
        correct_result = crud.verify_password(correct_password, user.password_hash)
        print(f"\n  Testing CORRECT password:")
        print(f"    Result: {'✓ Password matches' if correct_result else '✗ Password mismatch'}")
        
        # Test wrong password
        wrong_result = crud.verify_password(wrong_password, user.password_hash)
        print(f"\n  Testing WRONG password:")
        print(f"    Result: {'✗ Password matches (unexpected!)' if wrong_result else '✓ Password mismatch (expected)'}")
        
        print(f"{'='*60}")
        
        assert correct_result is True
        assert wrong_result is False
    
    def test_simulate_render_login_scenario(self, client: TestClient, test_db):
        """Simulate what happens on Render - empty database scenario"""
        # Count users before
        initial_count = test_db.query(User).count()
        
        print(f"\n{'='*60}")
        print("Simulating Render Login Scenario:")
        print(f"  Users in database: {initial_count}")
        
        # Try to login with an email that might exist on Render
        test_email = "user@example.com"
        response = client.post(
            "/auth/login",
            json={
                "email": test_email,
                "password": "anypassword123"
            }
        )
        
        print(f"\n  Attempting login with: {test_email}")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response: {response.json()}")
        
        if initial_count == 0:
            print("\n  ⚠️  Scenario: Database is EMPTY (like on Render)")
            print("     This is why login fails - no users exist!")
            print("     Solution: Use PostgreSQL on Render or create users after each restart")
        else:
            user = crud.get_user_by_email(test_db, test_email)
            if user:
                print(f"\n  ✓ User exists in database")
            else:
                print(f"\n  ✗ User does NOT exist in database")
                print("     This email was never registered")
        
        print(f"{'='*60}")
        
        # This test won't fail, it's just for diagnostic output
        assert True

