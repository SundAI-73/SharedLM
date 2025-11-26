import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)

def send_password_reset_email(email: str, reset_token: str, frontend_url: Optional[str] = None) -> bool:
    """
    Send password reset email to user
    
    Args:
        email: User's email address
        reset_token: Password reset token
        frontend_url: Frontend base URL for reset link (e.g., http://localhost:3000)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        # Get email configuration from environment
        smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user)
        
        # If SMTP not configured, log warning and return False
        if not smtp_user or not smtp_password:
            logger.warning("SMTP not configured. Password reset email not sent.")
            logger.info(f"Password reset token for {email}: {reset_token}")
            return False
        
        # Get frontend URL for reset link
        if not frontend_url:
            frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Reset Your Password - SharedLM"
        msg["From"] = smtp_from_email
        msg["To"] = email
        
        # Create HTML email body
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                .token {{ background: #e9e9e9; padding: 10px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>SharedLM</h1>
                    <p>Password Reset Request</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>We received a request to reset your password for your SharedLM account.</p>
                    <p>Click the button below to reset your password:</p>
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <div class="token">{reset_link}</div>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 SharedLM. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Create plain text version
        text_body = f"""
        Password Reset Request - SharedLM
        
        Hello,
        
        We received a request to reset your password for your SharedLM account.
        
        Please visit the following link to reset your password:
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you didn't request a password reset, please ignore this email.
        
        © 2024 SharedLM. All rights reserved.
        """
        
        # Attach both versions
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        msg.attach(part1)
        msg.attach(part2)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logger.info(f"Password reset email sent to {email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {email}: {e}")
        return False

