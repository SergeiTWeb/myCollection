import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const SITE_KEY = '6LcmMRstAAAAABpQ-A7DLyD_veZOf8YpvAIRzueP';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef(null);

  // Load reCAPTCHA once and keep track of when it becomes available.
  useEffect(() => {
    if (window.grecaptcha?.render) {
      setCaptchaReady(true);
      return;
    }

    window.onRecaptchaLoad = () => setCaptchaReady(true);

    if (document.getElementById('recaptcha-script')) return;

    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  // Render the widget only once a fresh container is mounted.
  useEffect(() => {
    if (isLogin || !captchaReady || !captchaRef.current || !window.grecaptcha) return;

    const container = captchaRef.current;
    if (container.dataset.rendered === 'true') return;

    try {
      window.grecaptcha.render(container, {
        sitekey: SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null)
      });
      container.dataset.rendered = 'true';
    } catch (error) {
      // The widget may already have been rendered by a StrictMode re-run.
      console.warn('reCAPTCHA render skipped:', error.message);
    }
  }, [isLogin, captchaReady]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!isLogin && !captchaToken) {
      setMessage('❌ Please complete the reCAPTCHA.');
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin
      ? { email, password }
      : { email, password, username: username.trim(), captchaToken };

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          login(data.token, data.email, data.userId, data.username);
          navigate('/collection');
        } else {
          setMessage('✅ Account created! Check your email to verify it, then log in.');
          setIsLogin(true);
          setPassword('');
          setCaptchaToken(null);
        }
      } else {
        setMessage(`❌ ${data.error || 'Something went wrong.'}`);
      }
    } catch (error) {
      console.error(error);
      setMessage('❌ Cannot reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setIsLogin((previous) => !previous);
    setMessage('');
    setPassword('');
    setCaptchaToken(null);
  };

  return (
    <div className="auth-card">
      <h2 className="page-title auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        {!isLogin && (
          <div className="form-field">
            <label htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              placeholder="How should we call you?"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              minLength={3}
              maxLength={30}
              autoComplete="username"
              required
            />
          </div>
        )}

        <div className="form-field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          {!isLogin && <span className="form-hint">Email cannot be changed after registration.</span>}
        </div>

        <div className="form-field">
          <label htmlFor="auth-password">Password</label>
          <div className="password-input">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={isLogin ? undefined : 8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div ref={captchaRef} className="captcha-container"></div>
        )}

        <button type="submit" className="btn auth-submit" disabled={isSubmitting}>
          {isSubmitting ? 'Please wait...' : (isLogin ? 'Log In' : 'Register')}
        </button>
      </form>

      {message && <p className="auth-message">{message}</p>}

      <p className="auth-switch">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}
        <button type="button" onClick={switchMode}>
          {isLogin ? 'Register' : 'Log In'}
        </button>
      </p>
    </div>
  );
}
