// typography.js - Typography scale and text styles

export const typography = {
  // Heading 1 - Page titles, main headlines
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },

  // Heading 2 - Section headings, card titles
  h2: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 1.2,
    letterSpacing: -0.3,
  },

  // Heading 3 - Subsection titles, modal headers
  h3: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 1.3,
    letterSpacing: -0.2,
  },

  // Heading 4 - Card titles, list item headers
  h4: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 1.4,
    letterSpacing: 0,
  },

  // Body Large - Large body text, prominent descriptions
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 1.5,
    letterSpacing: 0.2,
  },

  // Body - Primary body text, form labels
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 1.5,
    letterSpacing: 0.2,
  },

  // Body Small - Secondary text, descriptions
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 1.5,
    letterSpacing: 0.25,
  },

  // Caption - Labels, timestamps, badges
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 1.4,
    letterSpacing: 0.3,
  },

  // Button - Button text, CTAs
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 1.5,
    letterSpacing: 0.5,
  },

  // Overline - Category labels, tabs, section separators
  overline: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 1.4,
    letterSpacing: 1,
  },
};

// Responsive typography helper - scales font size on small devices
export const getResponsiveTypography = (baseStyle, isSmallDevice = false) => {
  if (!isSmallDevice) return baseStyle;

  // Reduce heading sizes on small devices
  const headingReduction = 2;
  const isSizeKey = baseStyle.fontSize && baseStyle.fontSize >= 20;

  return {
    ...baseStyle,
    fontSize: isSizeKey ? baseStyle.fontSize - headingReduction : baseStyle.fontSize,
  };
};
