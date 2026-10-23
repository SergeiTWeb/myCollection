import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';

const SITE_KEY = '6LcmMRstAAAAABpQ-A7DLyD_veZOf8YpvAIRzueP';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const captchaRef = useRef(null);
  const captchaWidgetId = useRef(null);

  // Loading reCAPTCHA
  useEffect(() => {
    if (document.getElementById('recaptcha-script')) return;
    const script = document.createElement('script');
    script.id = 'recaptcha-script';
    script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit';
    script.async = true;
    script.defer = true;
    window.onRecaptchaLoad = () => {};
    document.body.appendChild(script);
  }, []);

  // Captcha rendering when switching to registration
  useEffect(() => {
    if (!isLogin && captchaRef.current && window.grecaptcha) {
      if (captchaWidgetId.current !== null) {
        try { window.grecaptcha.reset(captchaWidgetId.current); } catch (e) {}
      }
      captchaWidgetId.current = window.grecaptcha.render(captchaRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => setCaptchaToken(token),
        'expired-callback': () => setCaptchaToken(null)
      });
    }
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!isLogin && !captchaToken) {
      setMessage('❌ Please, complete reCAPTCHA');
      return;
    }

    const endpoint = isLogin ? 'login' : 'register';
    const payload = isLogin 
      ? { email, password }
      : { email, password, captchaToken };
    
    try {
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          login(data.token, data.email, data.userId); 
          navigate('/collection');
        } else {
          setMessage('✅ Success! Now you can login.');
          setIsLogin(true);
        }
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setMessage('❌ Server Error. Please check if backend is running.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
      <h2 className="page-title" style={{textAlign: 'center'}}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)'}} />
        
        <div style={{ position: 'relative' }}>
          <input 
            type={showPassword ? 'text' : 'password'} 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '12px 40px 12px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }} 
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0, display: 'flex', alignItems: 'center' }}>
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
        
        {!isLogin && (
          <div ref={captchaRef} style={{display: 'flex', justifyContent: 'center', minHeight: '78px'}}></div>
        )}
        
        <button type="submit" className="btn">{isLogin ? 'Log In' : 'Register'}</button>
      </form>
      {message && <p style={{marginTop: '15px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)'}}>{message}</p>}
      <p style={{textAlign: 'center', marginTop: '20px', fontSize: '14px'}}>
        {isLogin ? "Don't have an account?" : "Already have an account?"}
        <button onClick={() => { setIsLogin(!isLogin); setMessage(''); setCaptchaToken(null); }} style={{background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold', marginLeft: '5px'}}>
          {isLogin ? 'Register' : 'Log In'}
        </button>
      </p>
    </div>
  );
}