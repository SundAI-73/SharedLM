"""
Tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from test.fixtures.sample_data import SAMPLE_USER, SAMPLE_USER_2


@pytest.mark.api
class TestAuth:
    """Test authentication endpoints"""
    
    def test_signup_success(self, client: TestClient):
        """Test successful user signup"""
        response = client.post(
            "/auth/signup",
            json=SAMPLE_USER
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "user" in data
        assert data["user"]["email"] == SAMPLE_USER["email"]
        assert data["user"]["display_name"] == SAMPLE_USER["display_name"]
        assert "id" in data["user"]
    
    def test_signup_duplicate_email(self, client: TestClient, test_user):
        """Test signup with duplicate email"""
        response = client.post(
            "/auth/signup",
            json={
                "email": test_user.email,
                "password": "password123",
                "display_name": "Test User"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data["detail"].lower()
    
    def test_login_success(self, client: TestClient, test_user):
        """Test successful user login"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "testpassword123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "user" in data
        assert data["user"]["email"] == test_user.email
        assert data["user"]["id"] == test_user.id
    
    def test_login_invalid_credentials(self, client: TestClient, test_user):
        """Test login with invalid credentials"""
        response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "wrongpassword"
            }
        )
        assert response.status_code == 401
        data = response.json()
        assert "invalid credentials" in data["detail"].lower()
    
    def test_login_nonexistent_user(self, client: TestClient):
        """Test login with nonexistent user"""
        response = client.post(
            "/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123"
            }
        )
        assert response.status_code == 401
        data = response.json()
        assert "invalid credentials" in data["detail"].lower()
    
    def test_change_password_success(self, client: TestClient, test_user, auth_headers):
        """Test successful password change"""
        response = client.post(
            "/auth/change-password",
            json={
                "user_id": test_user.id,
                "current_password": "testpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "changed successfully" in data["message"].lower()
        
        # Verify new password works
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "newpassword123"
            }
        )
        assert login_response.status_code == 200
    
    def test_change_password_incorrect_current(self, client: TestClient, test_user, auth_headers):
        """Test password change with incorrect current password"""
        response = client.post(
            "/auth/change-password",
            json={
                "user_id": test_user.id,
                "current_password": "wrongpassword",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 401
        data = response.json()
        assert "incorrect" in data["detail"].lower()
    
    def test_change_password_short_new_password(self, client: TestClient, test_user, auth_headers):
        """Test password change with short new password"""
        response = client.post(
            "/auth/change-password",
            json={
                "user_id": test_user.id,
                "current_password": "testpassword123",
                "new_password": "short"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "at least 8 characters" in data["detail"].lower()
    
    def test_change_password_missing_fields(self, client: TestClient, test_user, auth_headers):
        """Test password change with missing fields"""
        response = client.post(
            "/auth/change-password",
            json={
                "user_id": test_user.id,
                "current_password": "testpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.json()
        assert "missing" in data["detail"].lower()
    
    def test_change_password_unauthorized(self, client: TestClient, test_user, test_user_2, auth_headers):
        """Test password change for another user (should fail)"""
        response = client.post(
            "/auth/change-password",
            json={
                "user_id": test_user_2.id,
                "current_password": "testpassword123",
                "new_password": "newpassword123"
            },
            headers=auth_headers
        )
        assert response.status_code == 403
    
    def test_forgot_password_success(self, client: TestClient, test_user, monkeypatch):
        """Test successful forgot password request"""
        email_sent = []
        
        def mock_send_email(email, token, frontend_url=None):
            email_sent.append({"email": email, "token": token})
            return True
        
        # Mock the email sending function at the route level
        from api.routes import auth
        monkeypatch.setattr(auth, "send_password_reset_email", mock_send_email)
        
        response = client.post(
            "/auth/forgot-password",
            json={"email": test_user.email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "sent" in data["message"].lower()
        
        # Verify email was attempted to be sent
        assert len(email_sent) == 1
        assert email_sent[0]["email"] == test_user.email
    
    def test_forgot_password_nonexistent_user(self, client: TestClient, monkeypatch):
        """Test forgot password for nonexistent user (should still return success)"""
        email_sent = []
        
        def mock_send_email(email, token, frontend_url=None):
            email_sent.append({"email": email, "token": token})
            return True
        
        # Mock the email sending function at the route level
        from api.routes import auth
        monkeypatch.setattr(auth, "send_password_reset_email", mock_send_email)
        
        response = client.post(
            "/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
        # Should still return success to prevent email enumeration
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        # Email should not be sent for nonexistent users
        assert len(email_sent) == 0
    
    def test_reset_password_success(self, client: TestClient, test_user, test_db, monkeypatch):
        """Test successful password reset"""
        from datetime import datetime, timedelta
        import secrets
        from apps.server.database import crud
        
        # Create a reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        crud.create_password_reset_token(test_db, test_user.id, reset_token, expires_at)
        
        response = client.post(
            "/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "newresetpassword123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "reset successfully" in data["message"].lower()
        
        # Verify new password works
        login_response = client.post(
            "/auth/login",
            json={
                "email": test_user.email,
                "password": "newresetpassword123"
            }
        )
        assert login_response.status_code == 200
    
    def test_reset_password_invalid_token(self, client: TestClient):
        """Test password reset with invalid token"""
        response = client.post(
            "/auth/reset-password",
            json={
                "token": "invalid_token_12345",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
    
    def test_reset_password_expired_token(self, client: TestClient, test_user, test_db):
        """Test password reset with expired token"""
        from datetime import datetime, timedelta
        import secrets
        from apps.server.database import crud
        
        # Create an expired reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() - timedelta(hours=2)  # Expired 2 hours ago
        crud.create_password_reset_token(test_db, test_user.id, reset_token, expires_at)
        
        response = client.post(
            "/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "expired" in data["detail"].lower()
    
    def test_reset_password_short_password(self, client: TestClient, test_user, test_db):
        """Test password reset with short password"""
        from datetime import datetime, timedelta
        import secrets
        from apps.server.database import crud
        
        # Create a reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        crud.create_password_reset_token(test_db, test_user.id, reset_token, expires_at)
        
        response = client.post(
            "/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "short"  # Too short
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "at least 8 characters" in data["detail"].lower()
    
    def test_reset_password_token_reuse(self, client: TestClient, test_user, test_db):
        """Test that a reset token can only be used once"""
        from datetime import datetime, timedelta
        import secrets
        from apps.server.database import crud
        
        # Create a reset token
        reset_token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(hours=1)
        token_record = crud.create_password_reset_token(test_db, test_user.id, reset_token, expires_at)
        
        # Use the token once
        response1 = client.post(
            "/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "newpassword123"
            }
        )
        assert response1.status_code == 200
        
        # Try to use the same token again
        response2 = client.post(
            "/auth/reset-password",
            json={
                "token": reset_token,
                "new_password": "anotherpassword123"
            }
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()

