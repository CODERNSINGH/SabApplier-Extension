import React, { useState } from 'react';
import LoginFunction from '../api';
import Loader from './Loader';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('');

  // Show loader if loading or statusType is loading
  const showLoader = loading || statusType === 'loading';

  const onStatusUpdate = (msg, type) => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');
    setStatusType('loading');
    
    try {
      // Call the parent's handleLogin function which handles storage
      if (onLogin) {
        await onLogin(email, password);
      }
      
      setStatusType('success');
      setStatusMessage('Login and autofill completed successfully!');
    } catch (err) {
      setStatusType('error');
      setStatusMessage('Login error: ' + (err.message || 'Unknown error'));
    }
    setLoading(false);
  };

  return (
    <div className={`login-container${showLoader ? ' blurred' : ''}`}>
      
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            className="login-input"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="input-group">
          <input
            className="login-input password-input"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            disabled={loading}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <span className={`eye-icon ${showPassword ? 'eye-open' : 'eye-closed'}`}>
              {showPassword ? '◉' : '◎'}
            </span>
          </button>
        </div>
        <button className="login-button" type="submit" disabled={loading}>
          <span className="button-text">
            {loading ? 'Logging in...' : 'Login'}
          </span>
        </button>
      </form>
      {statusMessage && !showLoader && (
        <div className={`status-message status-${statusType}`}>
          <span className="status-icon">
            {statusType === 'success' ? '✓' : statusType === 'error' ? '✗' : 'ℹ'}
          </span>
          {statusMessage}
        </div>
      )}
      {showLoader && <Loader message={statusMessage || 'Logging in...'} />}
    </div>
  );
}