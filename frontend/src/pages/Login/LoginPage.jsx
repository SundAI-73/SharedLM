import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import logo from '../../assets/images/logo main.svg';
import './Login.css';

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      if (email && password) {
        // Store user session
        localStorage.setItem('sharedlm_session', 'authenticated');
        navigate('/chat');
      } else {
        setError('Please fill in all fields');
      }
      setLoading(false);
    }, 1000);
  };

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
            <div className="auth-form-header">
              <h2 className="auth-form-title">WELCOME BACK</h2>
              <p className="auth-form-subtitle">Sign in to continue your AI journey</p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
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
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="auth-input-group">
                <label className="auth-label">PASSWORD</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="auth-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-input-action"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="auth-error">
                  <span>{error}</span>
                </div>
              )}

              {/* Options */}
              <div className="auth-options">
                <label className="auth-checkbox">
                  <input type="checkbox" />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
                <Link to="/forgot-password" className="auth-link">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <span className="loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Sign Up Link */}
            <div className="auth-footer">
              <span className="auth-footer-text">Don't have an account?</span>
              <Link to="/signup" className="auth-footer-link">
                Create account
              </Link>
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span className="divider-line"></span>
              <span className="divider-text">OR</span>
              <span className="divider-line"></span>
            </div>

            {/* Social Login */}
            <div className="auth-social-section">
              <button className="auth-social-btn">
                <span>Continue with Google</span>
              </button>
              <button className="auth-social-btn">
                <span>Continue with GitHub</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;