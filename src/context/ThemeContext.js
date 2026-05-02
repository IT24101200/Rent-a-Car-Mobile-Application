import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT_COLORS, DARK_COLORS } from '../theme/theme';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // 'light', 'dark', or 'system'
  const [themeMode, setThemeMode] = useState('dark');
  const [isDark, setIsDark] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Load saved preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_mode');
        if (savedTheme) {
          setThemeMode(savedTheme);
        }
      } catch (err) {
        console.warn('Failed to load theme preference', err);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  // Compute boolean isDark based on themeMode and system appearance
  useEffect(() => {
    const applyTheme = () => {
      if (themeMode === 'system') {
        const colorScheme = Appearance.getColorScheme();
        setIsDark(colorScheme === 'dark');
      } else {
        setIsDark(themeMode === 'dark');
      }
    };

    applyTheme();

    // Listen for system appearance changes
    let subscription;
    if (themeMode === 'system') {
      subscription = Appearance.addChangeListener(({ colorScheme }) => {
        setIsDark(colorScheme === 'dark');
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [themeMode]);

  // Handle explicit toggle/save
  const changeThemeMode = async (mode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('@theme_mode', mode);
    } catch (err) {
      console.warn('Failed to save theme preference', err);
    }
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  if (!isReady) {
    return null; // Wait until init complete
  }

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, changeThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
