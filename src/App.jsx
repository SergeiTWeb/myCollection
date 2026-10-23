import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import SearchPage from './pages/SearchPage';
import CollectionPage from './pages/CollectionPage';
import PublicCollectionPage from './pages/PublicCollectionPage';
import WishlistPage from './pages/WishlistPage';
import AuthPage from './pages/AuthPage';
import AccountPage from './pages/AccountPage';
import Toast from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import './App.css';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AppContent({ theme, toggleTheme }) {
  return (
    <Layout theme={theme} toggleTheme={toggleTheme}>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/collection" element={<ProtectedRoute><CollectionPage /></ProtectedRoute>} />
        <Route path="/public/:userId" element={<PublicCollectionPage />} />
        <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      </Routes>
      <Toast />
      <ConfirmModal />
    </Layout>
  );
}

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent theme={theme} toggleTheme={toggleTheme} />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;