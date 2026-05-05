// shadows.js - Shadow definitions for elevation

export const shadows = {
  none: {
    elevation: 0,
    shadowColor: 'transparent',
  },

  // Small shadow - Subtle elevation
  sm: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  // Medium shadow - Standard elevation
  md: {
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },

  // Large shadow - Prominent elevation
  lg: {
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },

  // Extra large shadow - Maximum elevation
  xl: {
    elevation: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
  },
};
