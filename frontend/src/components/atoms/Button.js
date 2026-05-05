import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

/**
 * Button Component
 * 
 * @param {string} label - Button text
 * @param {function} onPress - Button press handler
 * @param {string} variant - 'primary' | 'secondary' | 'danger' | 'ghost' (default: 'primary')
 * @param {string} size - 'large' | 'medium' | 'small' | 'compact' (default: 'medium')
 * @param {boolean} disabled - Disable button (default: false)
 * @param {boolean} loading - Show loading spinner (default: false)
 * @param {object} icon - Icon component
 * @param {object} style - Additional styles
 * @param {string} testID - For testing
 */
const Button = ({
  label,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  style = {},
  textStyle = {},
  testID = 'button',
  ...props
}) => {
  const { colors, isDark } = useTheme();

  // Button height map
  const heightMap = {
    large: 56,
    medium: SIZES.inputHeight + 4, // 52
    small: 40,
    compact: 32,
  };

  // Font size map
  const fontSizeMap = {
    large: 18,
    medium: 16,
    small: 14,
    compact: 12,
  };

  // Get button colors based on variant
  const getButtonColors = () => {
    const isDisabled = disabled || loading;

    switch (variant) {
      case 'primary':
        return {
          backgroundColor: isDisabled ? 'rgba(5, 150, 105, 0.5)' : colors.primary,
          textColor: '#FFFFFF',
          pressedBgColor: colors.primaryDark || '#047857',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          textColor: colors.primary,
          pressedBgColor: colors.primaryLight || 'rgba(5, 150, 105, 0.1)',
          borderColor: colors.primary,
        };
      case 'danger':
        return {
          backgroundColor: isDisabled ? 'rgba(220, 38, 38, 0.5)' : colors.error,
          textColor: '#FFFFFF',
          pressedBgColor: '#B91C1C',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: isDisabled ? colors.textMuted : colors.textPrimary,
          pressedBgColor: 'rgba(0,0,0,0.05)',
        };
      default:
        return {
          backgroundColor: colors.primary,
          textColor: '#FFFFFF',
        };
    }
  };

  const buttonColors = getButtonColors();

  const styles = StyleSheet.create({
    button: {
      height: heightMap[size],
      backgroundColor: buttonColors.backgroundColor,
      borderRadius: SIZES.radius,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      opacity: disabled ? 0.7 : 1,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor: buttonColors.borderColor || 'transparent',
      ...(variant === 'primary' && !disabled ? SHADOWS.float : {}),
    },
    label: {
      fontWeight: '700',
      fontSize: fontSizeMap[size],
      color: buttonColors.textColor,
      marginLeft: icon ? 8 : 0,
    },
    iconContainer: {
      marginRight: label ? 4 : 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={buttonColors.textColor}
        />
      ) : (
        <>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {label && <Text style={[styles.label, textStyle]}>{label}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
