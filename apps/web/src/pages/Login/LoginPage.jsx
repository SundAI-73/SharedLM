import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import logo from '../../assets/images/logo main.svg';
import apiService from '../../services/api';
import { setAuth, isAuthenticated } from '../../utils/auth';
import { logEvent, EventType, LogLevel } from '../../utils/auditLogger';
import './Login.css';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await apiService.login(normalizedEmail, password);
      
      if (response.success) {
        // Store user info using auth utility
        setAuth(response.user);
        
        // Log successful login
        logEvent(EventType.LOGIN, LogLevel.INFO, 'User logged in successfully', {
          userId: response.user.id,
          email: response.user.email
        });
        
        // Navigate to intended page or chat
        const from = location.state?.from?.pathname || '/chat';
        navigate(from, { replace: true });
      } else {
        setError('Login failed. Please try again.');
        logEvent(EventType.LOGIN_FAILED, LogLevel.WARNING, 'Login failed', { email });
      }
    } catch (err) {
      // Log failed login attempt
      logEvent(EventType.LOGIN_FAILED, LogLevel.WARNING, 'Login attempt failed', {
        email,
        error: err.message
      });
      
      // Don't reveal specific error details to prevent information disclosure
      setError(err.message.includes('Rate limit') ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/chat', { replace: true });
    }
  }, [navigate]);

  // Check for expired session query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again.');
    }
  }, [location.search]);

  return (
    <motion.div 
      className="auth-page-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="auth-two-column">
        {/* Left Column - Branding */}
        <motion.div 
          className="auth-left-column"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="auth-branding">
            <motion.img 
              src={logo} 
              alt="SharedLM Logo" 
              className="auth-logo-large"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.95, scale: 1 }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut",
                delay: 0.2
              }}
              whileHover={{ scale: 1.05, opacity: 1 }}
            />
            <motion.h1 
              className="auth-brand-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              SHARED LM
            </motion.h1>
            <motion.p 
              className="auth-brand-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              UNIFIED AI INTERFACE
            </motion.p>
          </div>
        </motion.div>

        {/* Right Column - Form */}
        <motion.div 
          className="auth-right-column"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div 
            className="auth-form-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="auth-form-header">
              <h2 className="auth-form-title">WELCOME BACK</h2>
              <p className="auth-form-subtitle">Sign in to continue your AI journey</p>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              {/* Email Input */}
              <motion.div 
                className="auth-input-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <label className="auth-label">EMAIL ADDRESS</label>
                <motion.div 
                  className="auth-input-wrapper"
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Mail size={18} className="auth-input-icon" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="auth-input"
                    required
                    disabled={loading}
                  />
                </motion.div>
              </motion.div>

              {/* Password Input */}
              <motion.div 
                className="auth-input-group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <label className="auth-label">PASSWORD</label>
                <motion.div 
                  className="auth-input-wrapper"
                  whileFocus={{ scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Lock size={18} className="auth-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="auth-input"
                    required
                    disabled={loading}
                  />
                  <motion.button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-input-action"
                    disabled={loading}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div 
                    className="auth-error"
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

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
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                className={`auth-submit-btn ${loading ? 'loading' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                whileHover={!loading && email && password ? { 
                  scale: 1.02, 
                  boxShadow: "0 8px 25px rgba(185, 69, 57, 0.4)" 
                } : {}}
                whileTap={!loading && email && password ? { scale: 0.98 } : {}}
              >
                {loading ? (
                  <span className="loading-dots">
                    <span></span><span></span><span></span>
                  </span>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <motion.span
                      initial={{ x: 0 }}
                      animate={{ x: [0, 4, 0] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.5,
                        ease: "easeInOut"
                      }}
                    >
                      <ArrowRight size={18} />
                    </motion.span>
                  </>
                )}
              </motion.button>
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
              <button className="auth-social-btn" disabled>
                <span>Continue with Google</span>
              </button>
              <button className="auth-social-btn" disabled>
                <span>Continue with GitHub</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default LoginPage;