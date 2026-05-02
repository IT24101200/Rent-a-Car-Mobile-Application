// Avatar.js - Avatar component for user/profile pictures

import React from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

/**
 * Avatar Component
 * 
 * @param {string} source - Image URI
 * @param {string} initials - Fallback initials (e.g., "JD" for John Doe)
 * @param {string} size - 'large' | 'medium' | 'small' (default: 'medium')
 * @param {string} status - 'online' | 'offline' | 'away' (optional)
 * @param {function} onPress - Press handler (makes avatar pressable)
 * @param {object} style - Additional styles
 */
const Avatar = ({
  source = null,
  initials = '?',
  size = 'medium',
  status = null,
  onPress = null,
  style = {},
  testID = 'avatar',
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();

  // Size configurations
  const sizeConfig = {
    large: {
      size: 64,
      fontSize: 24,
      statusSize: 16,
      statusBottom: 0,
      statusRight: 0,
    },
    medium: {
      size: 48,
      fontSize: 18,
      statusSize: 14,
      statusBottom: -2,
      statusRight: -2,
    },
    small: {
      size: 32,
      fontSize: 14,
      statusSize: 10,
      statusBottom: -4,
      statusRight: -4,
    },
  };

  const config = sizeConfig[size];

  // Status colors
  const statusColors = {
    online: themeColors.semantic.success,
    offline: themeColors.text.tertiary,
    away: themeColors.semantic.warning,
  };

  const styles = StyleSheet.create({
    container: {
      width: config.size,
      height: config.size,
      borderRadius: borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.primary.light,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    initialsText: {
      ...typography.button,
      fontSize: config.fontSize,
      color: themeColors.primary.main,
      fontWeight: '700',
    },
    statusIndicator: {
      position: 'absolute',
      bottom: config.statusBottom,
      right: config.statusRight,
      width: config.statusSize,
      height: config.statusSize,
      borderRadius: borderRadius.full,
      backgroundColor: statusColors[status] || 'transparent',
      borderWidth: 2,
      borderColor: themeColors.background.main,
    },
  });

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[styles.container, style]}
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessible={true}
      accessibilityLabel={`Avatar ${initials}`}
      accessibilityRole="image"
    >
      {source ? (
        <Image source={{ uri: source }} style={styles.image} />
      ) : (
        <Text style={styles.initialsText}>{initials}</Text>
      )}

      {status && <View style={styles.statusIndicator} />}
    </Component>
  );
};

export default Avatar;
