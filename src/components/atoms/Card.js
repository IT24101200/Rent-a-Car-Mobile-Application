import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

/**
 * Card Component
 * 
 * @param {string} variant - 'elevated' | 'outlined' | 'flat' (default: 'elevated')
 * @param {boolean} pressable - Make card pressable
 * @param {function} onPress - Press handler for pressable cards
 * @param {object} children - Card content
 * @param {object} style - Additional styles
 * @param {object} header - Header component
 * @param {object} footer - Footer component
 */
const Card = ({
  variant = 'elevated',
  pressable = false,
  onPress = null,
  children = null,
  style = {},
  header = null,
  footer = null,
  testID = 'card',
  ...props
}) => {
  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
    },
    elevated: {
      backgroundColor: colors.surface,
      ...SHADOWS.card,
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    flat: {
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    content: {
      padding: 16,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });

  const cardStyle = StyleSheet.flatten([
    styles.container,
    styles[variant],
    style,
  ]);

  const Component = pressable ? TouchableOpacity : View;

  return (
    <Component
      style={cardStyle}
      onPress={onPress}
      disabled={!pressable}
      activeOpacity={0.9}
      testID={testID}
      {...props}
    >
      {header && <View style={styles.header}>{header}</View>}
      <View style={styles.content}>{children}</View>
      {footer && <View style={styles.footer}>{footer}</View>}
    </Component>
  );
};

export default Card;
