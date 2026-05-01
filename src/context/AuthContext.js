import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import api from '../api/api';

export const AuthContext = createContext();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  const registerPushToken = async (activeToken) => {
    if (!Device.isDevice) return;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') return;
      
      const tokenRes = await Notifications.getExpoPushTokenAsync();
      if (tokenRes?.data && activeToken) {
        await api.post('/api/users/push-token', { token: tokenRes.data }, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
      }
    } catch (e) {
      console.warn('Push registration error:', e);
    }
  };

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
             registerPushToken(savedToken);
          } catch(err) {
             // If token is expired/invalid, force logout
             if (err.response?.status === 401) {
               console.warn('Token expired — clearing session.');
               await AsyncStorage.removeItem('token');
               await AsyncStorage.removeItem('user');
               setToken(null);
               setUser(null);
             } else {
               console.warn('Network sync failed (offline-mode fallback).', err.message);
             }
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
      registerPushToken(jwtToken);
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
