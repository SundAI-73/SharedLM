import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import logo from '../../assets/images/logo main.svg';
import '../Login/Login.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1500);
  };

  if (sent) {
    return (
      <div className="auth-page-container">
        <div className="auth-two-column">
          {/* Left Column - Branding */}
          <div className="auth-left-column">
            <div className="auth-branding">
              <img src={logo} alt="SharedLM Logo" className="auth-logo-large" />
              <h1 className="auth-brand-title">SHARED LM</h1>
              <p className="auth-brand-subtitle">UNIFIED AI INTERFACE</p>
            </div>
          </div>

          {/* Right Column - Success Message */}
          <div className="auth-right-column">
            <div className="auth-form-container">
              <div className="auth-success-icon">
                <CheckCircle size={60} color="#00ff88" />
              </div>
              
              <div className="auth-form-header">
                <h2 className="auth-form-title">CHECK YOUR EMAIL</h2>
                <p className="auth-form-subtitle">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
              </div>

              <div className="auth-success-instructions">
                <p>Click the link in the email to reset your password.</p>
                <p>Didn't receive the email? Check your spam folder or request a new link.</p>
              </div>

              <div className="auth-form" style={{ gap: '15px' }}>
                <button
                  onClick={() => setSent(false)}
                  className="auth-social-btn"
                >
                  <span>Resend Email</span>
                </button>

                <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
                  <ArrowLeft size={18} />
                  <span>BACK TO LOGIN</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-container">
      <div className="auth-two-column">
        {/* Left Column - Branding */}
        <div className="auth-left-column">
          <div className="auth-branding">
            <img src={logo} alt="SharedLM Logo" className="auth-logo-large" />
            <h1 className="auth-brand-title">SHARED LM</h1>
            <p className="auth-brand-subtitle">UNIFIED AI INTERFACE</p>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="auth-right-column">
          <div className="auth-form-container">
            <Link to="/login" className="auth-back-link">
              <ArrowLeft size={18} />
              <span>Back to login</span>
            </Link>

            <div className="auth-form-header">
              <h2 className="auth-form-title">RESET PASSWORD</h2>
              <p className="auth-form-subtitle">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Email Input */}
              <div className="auth-input-group">
                <label className="auth-label">EMAIL ADDRESS</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="auth-input"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="auth-error">
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <span className="loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                ) : (
                  <>
                    <span>SEND RESET LINK</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="auth-footer">
              <span className="auth-footer-text">Remember your password?</span>
              <Link to="/login" className="auth-footer-link">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;