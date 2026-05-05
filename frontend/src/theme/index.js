// index.js - Central export for all theme tokens

export { colors, getColors } from './colors';
export { spacing, getResponsiveSpacing } from './spacing';
export { typography, getResponsiveTypography } from './typography';
export { shadows } from './shadows';
export { borderRadius } from './borderRadius';

// Combined theme object for convenience
export const theme = {
  colors: require('./colors').colors,
  spacing: require('./spacing').spacing,
  typography: require('./typography').typography,
  shadows: require('./shadows').shadows,
  borderRadius: require('./borderRadius').borderRadius,
};
