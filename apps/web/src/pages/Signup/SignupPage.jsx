import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import logo from '../../assets/images/logo main.svg';
import apiService from '../../services/api';
import { setAuth, validatePassword, isValidEmail } from '../../utils/auth';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';
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
  const [passwordStrength, setPasswordStrength] = useState({ strength: 'weak', score: 0 });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    
    // Update password strength when password changes
    if (e.target.name === 'password' && e.target.value) {
      const validation = validatePassword(e.target.value);
      setPasswordStrength({ strength: validation.strength, score: validation.score });
    } else if (e.target.name === 'password' && !e.target.value) {
      setPasswordStrength({ strength: 'weak', score: 0 });
    }
  };
  
  const getPasswordStrengthColor = (strength) => {
    switch (strength) {
      case 'strong': return '#4caf50';
      case 'medium': return '#ff9800';
      default: return '#f44336';
    }
  };
  
  const getPasswordStrengthText = (strength) => {
    switch (strength) {
      case 'strong': return 'STRONG';
      case 'medium': return 'MEDIUM';
      default: return 'WEAK';
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Validate email format
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Enhanced password validation
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]); // Show first error
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const response = await apiService.signup(
        normalizedEmail,
        formData.password,
        formData.name.trim()
      );
      
      if (response.success) {
        // Store user session using auth utility
        setAuth(response.user);
        
        // Log successful signup
        logEvent(EventType.SIGNUP, LogLevel.INFO, 'New user registered', {
          userId: response.user.id,
          email: response.user.email
        });
        
        // Navigate to chat
        navigate('/chat');
      } else {
        setError('Signup failed. Please try again.');
        logEvent(EventType.SIGNUP, LogLevel.WARNING, 'Signup failed', { email: formData.email });
      }
    } catch (err) {
      // Log signup error
      logEvent(EventType.SIGNUP, LogLevel.ERROR, 'Signup error', {
        email: formData.email,
        error: err.message
      });
      
      // Don't reveal specific error details to prevent information disclosure
      setError(err.message.includes('Rate limit') ? err.message : 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
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
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-input-action"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      color: getPasswordStrengthColor(passwordStrength.strength)
                    }}>
                      <div style={{
                        width: '60px',
                        height: '4px',
                        backgroundColor: '#333',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${Math.min((passwordStrength.score / 5) * 100, 100)}%`,
                          height: '100%',
                          backgroundColor: getPasswordStrengthColor(passwordStrength.strength),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <span style={{ 
                        fontFamily: 'Courier New, monospace',
                        fontSize: '11px',
                        letterSpacing: '1px'
                      }}>
                        {getPasswordStrengthText(passwordStrength.strength)}
                      </span>
                    </div>
                  </div>
                )}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-input-action"
                    disabled={loading}
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
                  disabled={loading}
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
              <button className="auth-social-btn" disabled>
                <span>Continue with Google</span>
              </button>
              <button className="auth-social-btn" disabled>
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