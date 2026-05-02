// ── DriveEase Premium Design System (Eco-Verdant Glass — Botanical Observatory) ──

export const LIGHT_COLORS = {
  primary: '#059669',             // Emerald Green
  primaryDark: '#047857',         // Darker emerald for headers
  primaryLight: 'rgba(5, 150, 105, 0.1)', // Glassy Emerald
  secondary: '#10B981',           // Bright Emerald Accent
  background: '#F0FDF4',          // Minty White Background
  surface: '#FFFFFF',             // Clean White Cards
  surfaceHighlight: '#F0FDF9',    // Subtle mint highlight
  headerGradientStart: '#065F46', // Deep forest for header top
  headerGradientEnd: '#059669',   // Emerald for header bottom
  
  textPrimary: '#064E3B',         // Deep Forest Green for high priority text
  textSecondary: '#475569',       // Slate body text
  textMuted: '#94A3B8',           // Subtle text
  textOnPrimary: '#FFFFFF',       // White text on green backgrounds
  
  success: '#059669',             // Emerald (Available/Verified)
  successBg: '#D1FAE5',
  warning: '#D97706',             // Amber (Pending/Ratings)
  warningBg: '#FEF3C7',
  error: '#DC2626',               // Red (Rejected/Not Verified)
  errorBg: '#FEE2E2',
  
  border: 'rgba(16, 185, 129, 0.15)', // Glassy green borders
  iconCircleBg: 'rgba(5, 150, 105, 0.1)', // Green circle icon backgrounds
  info: '#3B82F6',                  // Blue info
};

export const DARK_COLORS = {
  primary: '#34D399',             // Soft Emerald (easy on eyes, premium)
  primaryDark: '#10B981',         // Deeper emerald
  primaryLight: 'rgba(52, 211, 153, 0.12)', // Soft emerald glow
  secondary: '#6EE7B7',           // Light mint accent
  background: '#0A0A0A',          // Near-black background
  surface: '#1A1A1A',             // Dark card surface
  surfaceHighlight: '#222222',    // Subtle highlight surface
  headerGradientStart: '#050505', // Pure dark
  headerGradientEnd: '#0A1A0A',   // Hint of green in dark
  
  textPrimary: '#FFFFFF',         // Pure white text
  textSecondary: '#B0B0B0',       // Muted gray
  textMuted: '#666666',           // Dark muted
  textOnPrimary: '#FFFFFF',       // White text on emerald buttons
  
  success: '#4ADE80',             // Bright green
  successBg: 'rgba(74, 222, 128, 0.15)',
  warning: '#FBBF24',             // Amber
  warningBg: 'rgba(251, 191, 36, 0.15)',
  error: '#F87171',               // Soft red
  errorBg: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',                // Blue info
  
  border: 'rgba(255, 255, 255, 0.08)', // Subtle white borders
  iconCircleBg: 'rgba(52, 211, 153, 0.1)', // Soft emerald glow circles
};

// Fallback for files not yet using the ThemeContext hook
export const COLORS = LIGHT_COLORS;

export const SIZES = {
  radius: 4,                      // Slightly softened edges
  radiusPill: 999,                // Pill shaped elements
  inputHeight: 52,
  padding: 20,                    // Standard screen padding
  headerHeight: 200,              // Standard green header height
};

// Common Layout Helpers
export const SHADOWS = {
  card: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  light: {
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  float: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  }
};

// Reusable header style (emerald green gradient area)
export const HEADER_STYLE = {
  paddingHorizontal: 20,
  paddingTop: 50,
  paddingBottom: 30,
};

