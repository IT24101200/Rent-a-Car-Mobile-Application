// spacing.js - Consistent spacing scale

export const spacing = {
  xs: 4, // Extra small - dividers, minor spacing
  sm: 8, // Small - element spacing
  md: 12, // Medium - section spacing
  lg: 16, // Large - standard padding, margins
  xl: 24, // Extra large - large sections
  xxl: 32, // Double XL - major sections
};

// Responsive spacing helper
export const getResponsiveSpacing = (baseSpacing, isSmallDevice = false) => {
  // Reduce spacing slightly on very small devices
  if (isSmallDevice && baseSpacing >= spacing.lg) {
    return baseSpacing - spacing.sm;
  }
  return baseSpacing;
};
