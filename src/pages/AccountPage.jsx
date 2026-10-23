import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { API_URL } from '../config/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`
});

export default function AccountPage() {
  const { user, updateUser } = useAuth();
  const { showToast } = useNotification();

  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadAccount = async () => {
      try {
        const response = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          setEmail(data.email);
          setUsername(data.username || '');
          updateUser({ email: data.email, username: data.username });
        } else if (response.status === 401 || response.status === 403) {
          showToast('Your session has expired. Please log in again.', 'error');
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) showToast('Could not load your account details.', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAccount();
    return () => { cancelled = true; };
    // Runs once on mount; updateUser/showToast are context helpers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const cleanUsername = username.trim();

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      showToast('Username must be 3-30 characters long.', 'error');
      return;
    }
    if (!/^[a-zA-Z0-9 _.-]+$/.test(cleanUsername)) {
      showToast('Username may only contain letters, numbers, spaces, dots, dashes and underscores.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ username: cleanUsername })
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Could not update your username.', 'error');
        return;
      }

      setUsername(data.username);
      updateUser({ username: data.username });
      showToast('Username updated.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not connect to the server.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('The new passwords do not match.', 'error');
      return;
    }
    if (newPassword === currentPassword) {
      showToast('New password must be different from the current one.', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const response = await fetch(`${API_URL}/auth/password`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Could not update your password.', 'error');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated.', 'success');
    } catch (error) {
      console.error(error);
      showToast('Could not connect to the server.', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <section className="account-page">
      <h2 className="page-title">Account Settings</h2>

      {isLoading ? (
        <p className="account-hint">Loading your account...</p>
      ) : (
        <div className="account-grid">
          <form className="account-card" onSubmit={handleProfileSubmit}>
            <h3>Profile</h3>
            <p className="account-note">This is the name shown in the header and on your public collection.</p>

            <div className="form-field">
              <label htmlFor="account-username">Username</label>
              <input
                id="account-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={30}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="account-email">Email</label>
              <input id="account-email" type="email" value={email} readOnly disabled />
              <span className="form-hint">Email cannot be changed after registration.</span>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Username'}
              </button>
            </div>
          </form>

          <form className="account-card" onSubmit={handlePasswordSubmit}>
            <h3>Change Password</h3>
            <p className="account-note">Use at least 8 characters. You will need your current password.</p>

            <div className="form-field">
              <label htmlFor="account-current-password">Current password</label>
              <input
                id="account-current-password"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="account-new-password">New password</label>
              <input
                id="account-new-password"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="account-confirm-password">Confirm new password</label>
              <input
                id="account-confirm-password"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </div>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(event) => setShowPasswords(event.target.checked)}
              />
              Show passwords
            </label>

            <div className="form-actions">
              <button type="submit" className="btn" disabled={isSavingPassword}>
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
