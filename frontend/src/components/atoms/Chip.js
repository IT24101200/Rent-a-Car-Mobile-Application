import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { SIZES } from '../../theme/theme';

/**
 * Chip Component
 * 
 * @param {string} label - Chip label
 * @param {boolean} selected - Selected state
 * @param {function} onPress - Press handler
 * @param {function} onRemove - Remove handler (shows X button if provided)
 * @param {string} variant - 'default' | 'filled' (default: 'default')
 * @param {string} icon - Icon name from MaterialCommunityIcons
 * @param {object} style - Additional styles
 */
const Chip = ({
  label,
  selected = false,
  onPress = null,
  onRemove = null,
  variant = 'default',
  icon = null,
  style = {},
  testID = 'chip',
}) => {
  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100, // fully rounded
      borderWidth: variant === 'default' ? 1 : 0,
      backgroundColor: selected
        ? variant === 'default'
          ? colors.primaryLight || 'rgba(5, 150, 105, 0.1)'
          : colors.primary
        : variant === 'default'
        ? 'transparent'
        : colors.surface,
      borderColor: selected
        ? colors.primary
        : colors.border,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: selected && variant !== 'default'
        ? colors.textOnPrimary
        : selected
        ? colors.primary
        : colors.textSecondary,
      marginLeft: icon ? 6 : 0,
      marginRight: onRemove ? 6 : 0,
    },
    icon: {
      marginRight: 6,
    },
    removeButton: {
      marginLeft: 6,
      padding: 4,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      testID={testID}
      accessible={true}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon && (
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={
            selected && variant !== 'default'
              ? '#FFFFFF'
              : selected
              ? colors.primary
              : colors.textSecondary
          }
          style={styles.icon}
        />
      )}

      <Text style={styles.label}>{label}</Text>

      {onRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={14}
            color={
              selected && variant !== 'default'
                ? '#FFFFFF'
                : selected
                ? colors.primary
                : colors.textSecondary
            }
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default Chip;
