import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth';
import { tokenStorage, formatApiError } from '../api/client';

const AuthContext = createContext(null);

const DEMO_USER = {
  id: 1,
  username: 'mihika_p',
  email: 'mihika.pandit@campus.edu',
  first_name: 'Mihika',
  last_name: 'Pandit',
  college: 'School of Engineering & Technology',
  bio: 'Computer Science junior passionate about Fullstack Web Development, UI/UX, and Python.',
  date_joined: '2026-09-01T10:00:00Z',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(true);

  // Initialize and check current authentication state
  const loadUser = useCallback(async () => {
    const token = tokenStorage.getAccess();
    const storedDemo = localStorage.getItem('skillsync_demo_active');

    if (storedDemo === 'true') {
      setUser(DEMO_USER);
      setIsDemoMode(true);
      setLoading(false);
      return;
    }

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userData = await authApi.getMe();
      setUser(userData);
      setBackendAvailable(true);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
      if (err.status === 401) {
        tokenStorage.clearTokens();
        setUser(null);
      } else if (err.status === 0) {
        setBackendAvailable(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username, password) => {
    setError(null);
    try {
      await authApi.login({ username, password });
      setIsDemoMode(false);
      localStorage.removeItem('skillsync_demo_active');
      const profile = await authApi.getMe();
      setUser(profile);
      setBackendAvailable(true);
      return { success: true };
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      // If backend is not running, offer demo option
      if (err.status === 0) {
        setBackendAvailable(false);
      }
      return { success: false, error: formatted };
    }
  };

  const register = async (userData) => {
    setError(null);
    try {
      await authApi.register(userData);
      // Auto login after successful registration
      return await login(userData.username, userData.password);
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      if (err.status === 0) {
        setBackendAvailable(false);
      }
      return { success: false, error: formatted };
    }
  };

  const logout = () => {
    authApi.logout();
    localStorage.removeItem('skillsync_demo_active');
    setIsDemoMode(false);
    setUser(null);
    setError(null);
  };

  const enableDemoMode = () => {
    localStorage.setItem('skillsync_demo_active', 'true');
    setIsDemoMode(true);
    setUser(DEMO_USER);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    setError(null);
    if (isDemoMode) {
      setUser((prev) => ({ ...prev, ...profileData }));
      return { success: true };
    }

    try {
      const updated = await authApi.updateMe(profileData);
      setUser(updated);
      return { success: true };
    } catch (err) {
      const formatted = formatApiError(err);
      setError(formatted);
      return { success: false, error: formatted };
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isDemoMode,
    backendAvailable,
    login,
    register,
    logout,
    enableDemoMode,
    updateProfile,
    refreshUser: loadUser,
    clearError: () => setError(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
