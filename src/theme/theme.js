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
};

export const DARK_COLORS = {
  primary: '#10B981',             // Brighter Emerald for dark mode contrast
  primaryDark: '#059669',         // Standard emerald
  primaryLight: 'rgba(16, 185, 129, 0.15)', // Glassy dark emerald
  secondary: '#34D399',           // Light Emerald Accent
  background: '#022C22',          // Deep Forest / Emerald 950 Background
  surface: '#0A3D2E',             // Slightly lighter forest cards
  surfaceHighlight: '#0F4D3A',    // Lighter forest highlight
  headerGradientStart: '#011E17', // Super deep forest
  headerGradientEnd: '#064E3B',   // Mid forest
  
  textPrimary: '#ECFDF5',         // Minty white text
  textSecondary: '#A7F3D0',       // Light mint text
  textMuted: '#6EE7B7',           // Muted emerald text
  textOnPrimary: '#FFFFFF',       // White text on green backgrounds
  
  success: '#34D399',             // Softer Green
  successBg: 'rgba(5, 150, 105, 0.2)',
  warning: '#FBBF24',             // Softer Amber
  warningBg: 'rgba(217, 119, 6, 0.2)',
  error: '#F87171',               // Softer Red
  errorBg: 'rgba(220, 38, 38, 0.2)',
  
  border: 'rgba(255, 255, 255, 0.08)', // Frosted white borders
  iconCircleBg: 'rgba(16, 185, 129, 0.15)',
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

