import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '../api/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  // On app start, restore saved session from storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        const savedUser  = await AsyncStorage.getItem('user');
        if (savedToken && savedUser) {
          setToken(savedToken);
          // Optimistic UI mount
          setUser(JSON.parse(savedUser));
          
          // Background Sync: fetch live identity constraints from server
          try {
             const res = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${savedToken}` } });
             setUser(res.data);
             await AsyncStorage.setItem('user', JSON.stringify(res.data));
          } catch(err) {
             console.warn('Network sync failed (offline-mode fallback).', err.message);
          }
        }
      } catch (e) {
        console.warn('Session restore warning (non-fatal):', e.message);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (userData, jwtToken) => {
    setToken(jwtToken);
    setUser(userData);
    try {
      await AsyncStorage.setItem('token', jwtToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
    } catch (e) {
      console.warn('Could not persist session (non-fatal):', e.message);
    }
  };
  
  const refreshUser = async () => {
    if (!token) return;
    try {
       const res = await api.get('/api/auth/me');
       setUser(res.data);
       await AsyncStorage.setItem('user', JSON.stringify(res.data));
    } catch (e) {
       console.warn('Failed to refresh user:', e.message);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (e) {
      console.warn('Could not clear session (non-fatal):', e.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
