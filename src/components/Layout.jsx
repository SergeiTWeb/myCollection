import Header from './Header';
import Footer from './Footer';
import BackToTop from './BackToTop';

export default function Layout({ children, theme, toggleTheme }) {
  return (
    <>
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="container">
        {children}
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}