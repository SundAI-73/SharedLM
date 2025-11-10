import React from 'react';
import { logEvent, EventType, LogLevel } from '../../../utils/auditLogger';

/**
 * Error Boundary component for catching React errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to audit log
    logEvent(
      EventType.ERROR,
      LogLevel.ERROR,
      'React error boundary caught an error',
      {
        error: error.toString(),
        componentStack: errorInfo.componentStack,
        errorStack: error.stack
      }
    );

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'Courier New, monospace',
          backgroundColor: '#000000',
          color: '#888888'
        }}>
          <h1 style={{ color: '#B94539', marginBottom: '20px' }}>
            SOMETHING WENT WRONG
          </h1>
          <p style={{ marginBottom: '30px', textAlign: 'center', maxWidth: '500px' }}>
            An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
          </p>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <details style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#1a1a1a',
              borderRadius: '4px',
              maxWidth: '800px',
              width: '100%',
              overflow: 'auto'
            }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px', color: '#B94539' }}>
                Error Details (Development Only)
              </summary>
              <pre style={{
                color: '#ff6b6b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '12px'
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '30px',
              padding: '10px 20px',
              backgroundColor: '#B94539',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'Courier New, monospace',
              fontSize: '14px'
            }}
          >
            GO TO HOME
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

