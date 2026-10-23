export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <p>&copy; {currentYear} Sergei Tumanov. All rights reserved.</p>
      <p>Built with React &amp; Node.js • Music data provided by Discogs API</p>
      <p className="footer-links">
        <a
          className="footer-link"
          href="https://github.com/SergeiTWeb/myCollection"
          target="_blank"
          rel="noopener noreferrer"
        >
          View source on GitHub
        </a>
        <span className="footer-sep">•</span>
        <a
          className="footer-link"
          href="https://web.sergeitumanov.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          web.sergeitumanov.com
        </a>
      </p>
    </footer>
  );
}
