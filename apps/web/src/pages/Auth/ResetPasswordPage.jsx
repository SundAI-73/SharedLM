import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import logo from '../../assets/images/logo main.svg';
import apiService from '../../services/api';
import '../Login/Login.css';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset token');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await apiService.resetPassword(token, password);
      
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page-container">
        <div className="auth-two-column">
          <div className="auth-left-column">
            <div className="auth-branding">
              <img src={logo} alt="SharedLM Logo" className="auth-logo-large" />
              <h1 className="auth-brand-title">SHARED LM</h1>
              <p className="auth-brand-subtitle">UNIFIED AI INTERFACE</p>
            </div>
          </div>
          <div className="auth-right-column">
            <div className="auth-form-container">
              <div className="auth-success-icon">
                <CheckCircle size={60} color="#00ff88" />
              </div>
              <div className="auth-form-header">
                <h2 className="auth-form-title">PASSWORD RESET</h2>
                <p className="auth-form-subtitle">Your password has been reset successfully!</p>
                <p className="auth-form-subtitle">Redirecting to login...</p>
              </div>
              <div className="auth-form" style={{ gap: '15px', marginTop: '20px' }}>
                <Link to="/login" className="auth-submit-btn" style={{ textDecoration: 'none' }}>
                  <ArrowLeft size={18} />
                  <span>GO TO LOGIN</span>
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
        <div className="auth-left-column">
          <div className="auth-branding">
            <img src={logo} alt="SharedLM Logo" className="auth-logo-large" />
            <h1 className="auth-brand-title">SHARED LM</h1>
            <p className="auth-brand-subtitle">UNIFIED AI INTERFACE</p>
          </div>
        </div>
        <div className="auth-right-column">
          <div className="auth-form-container">
            <Link to="/login" className="auth-back-link">
              <ArrowLeft size={18} />
              <span>Back to login</span>
            </Link>

            <div className="auth-form-header">
              <h2 className="auth-form-title">RESET PASSWORD</h2>
              <p className="auth-form-subtitle">Enter your new password</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-label">NEW PASSWORD</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="auth-input"
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-password-toggle"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 10px' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-label">CONFIRM PASSWORD</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <span className="loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                ) : (
                  <>
                    <span>RESET PASSWORD</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

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

export default ResetPasswordPage;

