/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import api from '../services/api';
import { appleProvider, firebaseAuth, googleProvider, isFirebaseConfigured } from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('reforgedx-user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('reforgedx-token') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firebaseAuth) return undefined;
    return onAuthStateChanged(firebaseAuth, () => {});
  }, []);

  const clearAuthState = () => {
    localStorage.removeItem('reforgedx-token');
    localStorage.removeItem('reforgedx-user');
    sessionStorage.removeItem('reforgedx-token');
    sessionStorage.removeItem('reforgedx-user');
    setToken('');
    setUser(null);
  };

  const persistUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('reforgedx-user', JSON.stringify(nextUser));
    sessionStorage.setItem('reforgedx-user', JSON.stringify(nextUser));
  };

  useEffect(() => {
    if (!token) return;
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => persistUser(response.data.user))
      .catch(() => {
        clearAuthState();
      });
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    const response = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('reforgedx-token', newToken);
    localStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    sessionStorage.setItem('reforgedx-token', newToken);
    sessionStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    setToken(newToken);
    persistUser(newUser);
    setLoading(false);
    return response.data;
  };

  const loginAdmin = async (email, password) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/admin-login', { email, password });
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('reforgedx-token', newToken);
      localStorage.setItem('reforgedx-user', JSON.stringify(newUser));
      sessionStorage.setItem('reforgedx-token', newToken);
      sessionStorage.setItem('reforgedx-user', JSON.stringify(newUser));
      setToken(newToken);
      persistUser(newUser);
      return response.data;
    } finally {
      setLoading(false);
    }
  };

  const loginWithFirebaseUser = async (firebaseUser) => {
    const firebaseToken = await firebaseUser.getIdToken();
    const response = await api.post('/auth/firebase', { idToken: firebaseToken });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('reforgedx-token', newToken);
    localStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    sessionStorage.setItem('reforgedx-token', newToken);
    sessionStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    setToken(newToken);
    persistUser(newUser);
    return response.data;
  };

  const loginWithProvider = async (provider) => {
    if (!firebaseAuth || !isFirebaseConfigured) throw new Error('Firebase is not configured');
    setLoading(true);
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      return await loginWithFirebaseUser(result.user);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = () => loginWithProvider(googleProvider);
  const loginWithApple = () => loginWithProvider(appleProvider);

  const register = async (name, email, password, phone, address) => {
    setLoading(true);
    const response = await api.post('/auth/register', { name, email, password, phone, address });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem('reforgedx-token', newToken);
    localStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    sessionStorage.setItem('reforgedx-token', newToken);
    sessionStorage.setItem('reforgedx-user', JSON.stringify(newUser));
    setToken(newToken);
    persistUser(newUser);
    setLoading(false);
    return response.data;
  };

  const updateProfileImage = async (file) => {
    if (!token) throw new Error('Authentication required');
    const formData = new FormData();
    formData.append('profileImage', file);
    const response = await api.patch('/auth/profile-image', formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
    });
    persistUser(response.data.user);
    return response.data.user;
  };

  const removeProfileImage = async () => {
    if (!token) throw new Error('Authentication required');
    const response = await api.delete('/auth/profile-image', {
      headers: { Authorization: `Bearer ${token}` }
    });
    persistUser(response.data.user);
    return response.data.user;
  };

  const updateProfile = async (profile) => {
    if (!token) throw new Error('Authentication required');
    const response = await api.patch('/auth/profile', profile, {
      headers: { Authorization: `Bearer ${token}` }
    });
    persistUser(response.data.user);
    return response.data.user;
  };

  const logout = async () => {
    if (firebaseAuth) await signOut(firebaseAuth);
    clearAuthState();
    navigate('/');
  };

  const value = useMemo(() => ({ user, token, loading, login, loginAdmin, loginWithGoogle, loginWithApple, register, logout, updateProfile, updateProfileImage, removeProfileImage, setUser: persistUser }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
