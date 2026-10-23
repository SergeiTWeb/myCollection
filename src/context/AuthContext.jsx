import { createContext, useCallback, useState, useContext } from 'react';

const AuthContext = createContext();

const readStoredUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  return {
    token,
    email: localStorage.getItem('email') || '',
    username: localStorage.getItem('username') || '',
    id: localStorage.getItem('userId')
  };
};

export const AuthProvider = ({ children }) => {
  // Synchronous initialization on page load
  const [user, setUser] = useState(readStoredUser);

  const login = useCallback((token, email, userId, username = '') => {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    localStorage.setItem('userId', userId);
    if (username) localStorage.setItem('username', username);
    setUser({ token, email, username, id: userId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((previous) => {
      if (!previous) return previous;

      const next = { ...previous, ...updates };
      if (updates.email !== undefined) localStorage.setItem('email', updates.email);
      if (updates.username !== undefined) localStorage.setItem('username', updates.username);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
