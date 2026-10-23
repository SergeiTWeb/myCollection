import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ theme, toggleTheme }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.username || user?.email?.split('@')[0] || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => (location.pathname === path ? 'active' : '');

  return (
    <header className="app-header">
      <Link to="/" className="logo-link">
        <div className="logo">MyCollection</div>
      </Link>

      <nav className="nav-links" aria-label="Main navigation">
        <Link to="/" className={isActive('/')}>Search</Link>
        {user && (
          <>
            <Link to="/collection" className={isActive('/collection')}>Collection</Link>
            <Link to="/wishlist" className={isActive('/wishlist')}>Wishlist</Link>
            <Link to="/account" className={isActive('/account')}>Account</Link>
          </>
        )}
      </nav>

      <div className="header-actions">
        <button
          className="theme-toggle icon-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>

        {user ? (
          <>
            <Link to="/account" className="user-chip" title="Account settings">
              <span className="user-avatar" aria-hidden="true">{initial}</span>
              <span className="user-name">{displayName}</span>
            </Link>
            <button className="theme-toggle" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="theme-toggle login-link">Login</Link>
        )}
      </div>
    </header>
  );
}
