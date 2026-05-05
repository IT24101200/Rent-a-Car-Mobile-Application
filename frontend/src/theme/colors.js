// colors.js - Centralized color definitions for light and dark modes

export const colors = {
  light: {
    // Primary Colors (Emerald Green)
    primary: {
      main: '#10B981', // Emerald 500
      dark: '#059669', // Emerald 600
      light: '#D1FAE5', // Emerald 100
      pale: '#ECF2F0', // Emerald 50
    },

    // Semantic Colors
    semantic: {
      success: '#10B981', // Green
      warning: '#F59E0B', // Amber
      danger: '#EF4444', // Red
      info: '#3B82F6', // Blue
    },

    // Neutral Colors (Gray Scale)
    neutral: {
      black: '#000000',
      darkGray: '#1F2937', // Gray 800
      mediumGray: '#6B7280', // Gray 500
      lightGray: '#E5E7EB', // Gray 200
      lighterGray: '#F3F4F6', // Gray 100
      white: '#FFFFFF',
    },

    // Text Colors
    text: {
      primary: '#1F2937', // Gray 800
      secondary: '#6B7280', // Gray 500
      tertiary: '#9CA3AF', // Gray 400
    },

    // Background Colors
    background: {
      main: '#FFFFFF',
      surface: '#F9FAFB', // Gray 50
      overlay: 'rgba(0, 0, 0, 0.4)',
      disabled: '#F3F4F6', // Gray 100
    },

    // Border Colors
    border: {
      light: '#E5E7EB', // Gray 200
      default: '#D1D5DB', // Gray 300
      dark: '#9CA3AF', // Gray 400
    },
  },

  dark: {
    // Primary Colors (Emerald Green - Adjusted for dark)
    primary: {
      main: '#10B981', // Emerald 500 (same)
      dark: '#059669', // Emerald 600 (same)
      light: '#6EE7B7', // Emerald 300 (lighter for dark mode)
      pale: '#1F5D4A', // Emerald 900 (subtle backgrounds)
    },

    // Semantic Colors (Adjusted for contrast)
    semantic: {
      success: '#34D399', // Green 400
      warning: '#FBBF24', // Amber 400
      danger: '#F87171', // Red 400
      info: '#60A5FA', // Blue 400
    },

    // Neutral Colors (Gray Scale - Dark)
    neutral: {
      black: '#0F172A', // Slate 950
      darkGray: '#E2E8F0', // Slate 200
      mediumGray: '#CBD5E1', // Slate 300
      lightGray: '#475569', // Slate 700
      lighterGray: '#1E293B', // Slate 800
      white: '#0F172A', // Slate 950
    },

    // Text Colors
    text: {
      primary: '#E2E8F0', // Slate 200
      secondary: '#CBD5E1', // Slate 300
      tertiary: '#94A3B8', // Slate 400
    },

    // Background Colors
    background: {
      main: '#0F172A', // Slate 950
      surface: '#1E293B', // Slate 800
      overlay: 'rgba(0, 0, 0, 0.6)',
      disabled: '#334155', // Slate 700
    },

    // Border Colors
    border: {
      light: '#334155', // Slate 700
      default: '#475569', // Slate 700
      dark: '#64748B', // Slate 600
    },
  },
};

// Export helper function to get colors based on theme
export const getColors = (isDarkMode) => {
  return isDarkMode ? colors.dark : colors.light;
};
