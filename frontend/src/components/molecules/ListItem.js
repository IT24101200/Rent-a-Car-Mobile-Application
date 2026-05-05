// ListItem.js - List item component for displaying items with avatar, title, subtitle

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import Avatar from '../atoms/Avatar';

/**
 * ListItem Component
 * 
 * @param {string} title - Item title
 * @param {string} subtitle - Optional subtitle
 * @param {string} avatar - Avatar image URI or initials
 * @param {object} rightContent - Right side content (badge, price, etc.)
 * @param {function} onPress - Press handler
 * @param {boolean} showDivider - Show bottom divider
 * @param {boolean} disabled - Disable item
 * @param {object} style - Additional styles
 */
const ListItem = ({
  title,
  subtitle = null,
  avatar = null,
  rightContent = null,
  onPress = null,
  showDivider = true,
  disabled = false,
  testID = 'list-item',
  style = {},
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: themeColors.background.main,
    },
    pressedState: {
      opacity: 0.7,
      backgroundColor: themeColors.background.surface,
    },
    divider: {
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border.light,
    },
    avatarContainer: {
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      ...typography.body,
      color: themeColors.text.primary,
      fontWeight: '600',
    },
    subtitle: {
      ...typography.bodySmall,
      color: themeColors.text.secondary,
      marginTop: spacing.xs,
    },
    rightContentContainer: {
      marginLeft: spacing.md,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    chevron: {
      marginLeft: spacing.sm,
    },
  });

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.container,
        showDivider && styles.divider,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
      testID={testID}
      accessible={true}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={title}
    >
      {/* Avatar */}
      {avatar && (
        <View style={styles.avatarContainer}>
          {typeof avatar === 'string' ? (
            avatar.startsWith('http') || avatar.startsWith('file://') ? (
              <Image
                source={{ uri: avatar }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: borderRadius.full,
                }}
              />
            ) : (
              <Avatar initials={avatar} size="medium" />
            )
          ) : (
            avatar
          )}
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Right Content */}
      {rightContent && (
        <View style={styles.rightContentContainer}>
          {rightContent}
        </View>
      )}

      {/* Chevron for pressable items */}
      {onPress && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={themeColors.text.tertiary}
          style={styles.chevron}
        />
      )}
    </Component>
  );
};

export default ListItem;
