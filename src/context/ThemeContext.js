import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getColors = (isDark) => ({
  background: isDark ? '#0A0A1A' : '#F5F5F5',
  backgroundSecondary: isDark ? '#1A1A2E' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#1A1A2E',
  textSecondary: isDark ? '#B0B0C0' : '#666666',
  textMuted: isDark ? '#666680' : '#999999',
  cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
  cardBg: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
  primary: '#1E9E5A',
  primaryDark: '#167A45',
  primaryLight: '#3FBF7F',
  gradientStart: '#1E9E5A',
  gradientEnd: '#167A45',
  secondary: '#3498DB',
  error: '#E74C3C',
  warning: '#F39C12',
  accent: '#9B59B6',
});

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontSize, setFontSizeState] = useState('medium');

  useEffect(() => {
    loadTheme();
    loadFontSize();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('themeMode');
      if (saved !== null) setIsDarkMode(JSON.parse(saved));
    } catch (error) {
      console.log('Ошибка загрузки темы:', error);
    }
  };

  const loadFontSize = async () => {
    try {
      const raw = await AsyncStorage.getItem('@english_app:userSettings');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.fontSize) setFontSizeState(parsed.fontSize);
      }
    } catch (error) {
      console.log('Ошибка загрузки шрифта:', error);
    }
  };

  const toggleTheme = useCallback(async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    try {
      await AsyncStorage.setItem('themeMode', JSON.stringify(newMode));
    } catch (error) {
      console.log('Ошибка сохранения темы:', error);
    }
  }, [isDarkMode]);

  const setFontSize = useCallback((value) => {
    setFontSizeState(value);
  }, []);

  const fontSizeMultiplier =
    fontSize === 'small' ? 0.9 :
    fontSize === 'large' ? 1.15 :
    1.0;

  const colors = getColors(isDarkMode);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        colors,
        fontSize,
        setFontSize,
        fontSizeMultiplier,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};