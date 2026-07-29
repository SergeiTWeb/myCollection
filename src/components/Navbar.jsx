import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <h1>Music Catalogue</h1>
      <div className="nav-links">
        <Link to="/">Search</Link>
        <Link to="/collection">Collection</Link>
        <Link to="/wishlist">Wishlist</Link>
      </div>
    </nav>
  );
}