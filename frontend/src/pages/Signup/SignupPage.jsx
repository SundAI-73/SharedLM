import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import logo from '../../assets/images/logo main.svg';
import '../Login/Login.css';

function SignupPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      // Create user session
      localStorage.setItem('sharedlm_session', 'authenticated');
      localStorage.setItem('sharedlm_user_email', formData.email);
      localStorage.setItem('sharedlm_user_name', formData.name);
      navigate('/chat');
      setLoading(false);
    }, 1500);
  };

  const isFormValid = formData.name && formData.email && formData.password && 
                       formData.confirmPassword && agreedToTerms;

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
              <h2 className="auth-form-title">CREATE ACCOUNT</h2>
              <p className="auth-form-subtitle">Join thousands of users exploring AI</p>
            </div>

            <form onSubmit={handleSignup} className="auth-form">
              {/* Name Input */}
              <div className="auth-input-group">
                <label className="auth-label">FULL NAME</label>
                <div className="auth-input-wrapper">
                  <User size={18} className="auth-input-icon" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="auth-input"
                    required
                  />
                </div>
              </div>

              {/* Email Input */}
              <div className="auth-input-group">
                <label className="auth-label">EMAIL ADDRESS</label>
                <div className="auth-input-wrapper">
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
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

              {/* Confirm Password Input */}
              <div className="auth-input-group">
                <label className="auth-label">CONFIRM PASSWORD</label>
                <div className="auth-input-wrapper">
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="auth-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-input-action"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="auth-error">
                  <span>{error}</span>
                </div>
              )}

              {/* Terms Checkbox */}
              <label className="auth-checkbox">
                <input 
                  type="checkbox" 
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">
                  I agree to the <Link to="/terms" className="auth-link">Terms</Link> and <Link to="/privacy" className="auth-link">Privacy Policy</Link>
                </span>
              </label>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
              >
                {loading ? (
                  <span className="loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                ) : (
                  <>
                    <span>CREATE ACCOUNT</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="auth-footer">
              <span className="auth-footer-text">Already have an account?</span>
              <Link to="/login" className="auth-footer-link">
                Sign in
              </Link>
            </div>

            {/* Divider */}
            <div className="auth-divider">
              <span className="divider-line"></span>
              <span className="divider-text">OR</span>
              <span className="divider-line"></span>
            </div>

            {/* Social Signup */}
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

export default SignupPage;