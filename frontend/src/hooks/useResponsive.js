// useResponsive.js - Hook for responsive design utilities

import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Device size breakpoints
  const isSmallDevice = width < 380; // iPhone SE, 8, 7
  const isMediumDevice = width >= 380 && width < 400; // iPhone X, 12, 13
  const isLargeDevice = width >= 400; // iPhone 14 Pro, Plus models
  const isTablet = height > 600 && width > 600;

  // Responsive padding/margin
  const horizontalPadding = isSmallDevice ? 12 : 16;
  const verticalPadding = 16;

  // Grid columns
  const numColumns = isSmallDevice ? 2 : 3;

  // Calculate safe container width
  const containerWidth = width - horizontalPadding * 2 - insets.left - insets.right;

  // Responsive font scaling
  const fontScaleFactor = width / 375; // base width for iPhone SE

  return {
    // Dimensions
    width,
    height,
    insets,

    // Device classification
    isSmallDevice,
    isMediumDevice,
    isLargeDevice,
    isTablet,

    // Responsive values
    horizontalPadding,
    verticalPadding,
    numColumns,
    containerWidth,
    fontScaleFactor,

    // Helper function to scale dimensions
    scale: (size) => size * fontScaleFactor,

    // Helper function to get responsive value based on device size
    getResponsiveValue: (small, medium, large) => {
      if (isSmallDevice) return small;
      if (isMediumDevice) return medium;
      return large;
    },
  };
};
