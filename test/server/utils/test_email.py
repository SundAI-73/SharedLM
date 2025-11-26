"""
Tests for email utility functions
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from utils.email import send_password_reset_email


@pytest.mark.unit
class TestEmailUtility:
    """Test email utility functions"""
    
    @patch('utils.email.smtplib.SMTP')
    def test_send_password_reset_email_success(self, mock_smtp_class):
        """Test successful password reset email sending"""
        # Setup environment variables
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'test@example.com',
            'SMTP_PASSWORD': 'testpassword',
            'SMTP_FROM_EMAIL': 'noreply@example.com',
            'FRONTEND_URL': 'http://localhost:3000'
        }):
            # Mock SMTP server
            mock_server = MagicMock()
            mock_smtp_class.return_value.__enter__.return_value = mock_server
            
            # Call function
            result = send_password_reset_email(
                email="user@example.com",
                reset_token="test_token_12345",
                frontend_url="http://localhost:3000"
            )
            
            # Assertions
            assert result is True
            mock_smtp_class.assert_called_once_with('smtp.gmail.com', 587)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once_with('test@example.com', 'testpassword')
            mock_server.send_message.assert_called_once()
            
            # Check email content
            sent_message = mock_server.send_message.call_args[0][0]
            assert sent_message["To"] == "user@example.com"
            assert sent_message["From"] == "noreply@example.com"
            assert "Reset Your Password" in sent_message["Subject"]
    
    @patch('utils.email.smtplib.SMTP')
    def test_send_password_reset_email_with_default_frontend_url(self, mock_smtp_class):
        """Test email sending with default frontend URL from environment"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'test@example.com',
            'SMTP_PASSWORD': 'testpassword',
            'FRONTEND_URL': 'https://example.com'
        }):
            mock_server = MagicMock()
            mock_smtp_class.return_value.__enter__.return_value = mock_server
            
            result = send_password_reset_email(
                email="user@example.com",
                reset_token="test_token_12345"
            )
            
            assert result is True
            sent_message = mock_server.send_message.call_args[0][0]
            payload = sent_message.get_payload()
            # Get the HTML part content
            html_content = ""
            for part in payload:
                if part.get_content_type() == "text/html":
                    html_content = part.get_payload()
                    break
            assert "test_token_12345" in html_content
    
    def test_send_password_reset_email_no_smtp_config(self):
        """Test email sending when SMTP is not configured"""
        with patch.dict(os.environ, {}, clear=True):
            # Should return False and log warning
            result = send_password_reset_email(
                email="user@example.com",
                reset_token="test_token_12345"
            )
            
            assert result is False
    
    def test_send_password_reset_email_missing_credentials(self):
        """Test email sending when SMTP credentials are missing"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            # Missing SMTP_USER and SMTP_PASSWORD
        }):
            result = send_password_reset_email(
                email="user@example.com",
                reset_token="test_token_12345"
            )
            
            assert result is False
    
    @patch('utils.email.smtplib.SMTP')
    def test_send_password_reset_email_smtp_error(self, mock_smtp_class):
        """Test email sending when SMTP server raises an error"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'test@example.com',
            'SMTP_PASSWORD': 'testpassword'
        }):
            # Mock SMTP to raise an exception
            mock_smtp_class.side_effect = Exception("SMTP connection failed")
            
            result = send_password_reset_email(
                email="user@example.com",
                reset_token="test_token_12345"
            )
            
            assert result is False
    
    @patch('utils.email.smtplib.SMTP')
    def test_send_password_reset_email_reset_link_format(self, mock_smtp_class):
        """Test that reset link is correctly formatted"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'test@example.com',
            'SMTP_PASSWORD': 'testpassword',
            'FRONTEND_URL': 'https://app.example.com'
        }):
            mock_server = MagicMock()
            mock_smtp_class.return_value.__enter__.return_value = mock_server
            
            reset_token = "abc123xyz789"
            send_password_reset_email(
                email="user@example.com",
                reset_token=reset_token,
                frontend_url="https://app.example.com"
            )
            
            sent_message = mock_server.send_message.call_args[0][0]
            # Get email body
            payload = sent_message.get_payload()
            email_content = ""
            if isinstance(payload, list):
                for part in payload:
                    if part.get_content_type() == "text/html":
                        email_content = part.get_payload()
                        break
            
            # Check that reset link contains both URL and token
            assert "https://app.example.com/reset-password?token=abc123xyz789" in email_content
            assert reset_token in email_content
    
    @patch('utils.email.smtplib.SMTP')
    def test_send_password_reset_email_multipart_message(self, mock_smtp_class):
        """Test that email contains both plain text and HTML versions"""
        with patch.dict(os.environ, {
            'SMTP_HOST': 'smtp.gmail.com',
            'SMTP_PORT': '587',
            'SMTP_USER': 'test@example.com',
            'SMTP_PASSWORD': 'testpassword'
        }):
            mock_server = MagicMock()
            mock_smtp_class.return_value.__enter__.return_value = mock_server
            
            send_password_reset_email(
                email="user@example.com",
                reset_token="test_token"
            )
            
            sent_message = mock_server.send_message.call_args[0][0]
            payload = sent_message.get_payload()
            
            # Should have both plain text and HTML parts
            assert len(payload) == 2
            content_types = [part.get_content_type() for part in payload]
            assert "text/plain" in content_types
            assert "text/html" in content_types

