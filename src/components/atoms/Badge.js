import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { SIZES } from '../../theme/theme';

/**
 * Badge Component
 * 
 * @param {string} label - Badge text
 * @param {string} variant - 'primary' | 'success' | 'warning' | 'error' (default: 'primary')
 * @param {string} size - 'large' | 'medium' | 'small' (default: 'medium')
 * @param {string} icon - Icon name from MaterialCommunityIcons
 * @param {object} style - Additional styles
 */
const Badge = ({
  label,
  variant = 'primary',
  size = 'medium',
  icon = null,
  style = {},
  testID = 'badge',
}) => {
  const { colors, isDark } = useTheme();

  // Size configurations
  const sizeConfig = {
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
      iconSize: 16,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
      iconSize: 14,
    },
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
      iconSize: 12,
    },
  };

  // Variant colors
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          backgroundColor: colors.successBg || (isDark ? '#064E3B' : '#D1FAE5'),
          textColor: colors.success || '#10B981',
        };
      case 'warning':
        return {
          backgroundColor: colors.warningBg || (isDark ? '#78350F' : '#FEF3C7'),
          textColor: colors.warning || '#D97706',
        };
      case 'error':
      case 'danger':
        return {
          backgroundColor: colors.errorBg || (isDark ? '#7F1D1D' : '#FEE2E2'),
          textColor: colors.error || '#DC2626',
        };
      case 'primary':
      default:
        return {
          backgroundColor: colors.primaryLight || 'rgba(5, 150, 105, 0.1)',
          textColor: colors.primary,
        };
    }
  };

  const badgeColors = getVariantColors();
  const config = sizeConfig[size];

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: config.paddingHorizontal,
      paddingVertical: config.paddingVertical,
      backgroundColor: badgeColors.backgroundColor,
      borderRadius: 100, // fully rounded
      alignSelf: 'flex-start',
    },
    text: {
      fontSize: config.fontSize,
      color: badgeColors.textColor,
      fontWeight: '700',
    },
    icon: {
      marginRight: 4,
    },
  });

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="text"
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={config.iconSize}
          color={badgeColors.textColor}
          style={styles.icon}
        />
      )}
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

export default Badge;
