export default function Footer() {
    const currentYear = new Date().getFullYear();
    
    return (
      <footer className="app-footer">
        <p>&copy; {currentYear} Sergei Tumanov. All rights reserved.</p>
        <p>Built with React & Node.js • Music data provided by Discogs API</p>
      </footer>
    );
  }