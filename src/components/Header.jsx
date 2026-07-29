import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header({ theme, toggleTheme }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="app-header">
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="logo">MyCollection</div>
      </Link>
      
      <nav className="nav-links">
        <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Search</Link>
        {user && (
          <>
            <Link to="/collection" className={location.pathname === '/collection' ? 'active' : ''}>Collection</Link>
            <Link to="/wishlist" className={location.pathname === '/wishlist' ? 'active' : ''}>Wishlist</Link>
          </>
        )}
      </nav>

      <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
        <button className="theme-toggle" onClick={toggleTheme}>
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        
        {user ? (
          <>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Welcome, {user.email}
            </span>
            <button className="theme-toggle" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Link to="/login" className="theme-toggle" style={{textDecoration: 'none', display: 'flex', alignItems: 'center'}}>Login</Link>
        )}
      </div>
    </header>
  );
}