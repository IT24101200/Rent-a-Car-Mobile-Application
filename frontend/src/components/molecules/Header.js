// Header.js - Header component for screens with back button and actions

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

/**
 * Header Component
 * 
 * @param {string} title - Header title
 * @param {string} subtitle - Optional subtitle
 * @param {function} onBackPress - Back button handler
 * @param {array} rightActions - Array of { icon, onPress, testID }
 * @param {boolean} showBack - Show back button (default: true if onBackPress provided)
 * @param {object} style - Additional styles
 */
const Header = ({
  title,
  subtitle = null,
  onBackPress = null,
  rightActions = [],
  showBack = !!onBackPress,
  style = {},
  testID = 'header',
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();
  const { horizontalPadding, verticalPadding } = useResponsive();

  const styles = StyleSheet.create({
    container: {
      backgroundColor: themeColors.background.main,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border.light,
    },
    safeArea: {
      paddingHorizontal: horizontalPadding,
      paddingVertical: verticalPadding,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 56,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.md,
      borderRadius: borderRadius.md,
    },
    titleSection: {
      flex: 1,
    },
    title: {
      ...typography.h4,
      color: themeColors.text.primary,
    },
    subtitle: {
      ...typography.bodySmall,
      color: themeColors.text.secondary,
      marginTop: spacing.xs,
    },
    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.md,
    },
    actionButton: {
      padding: spacing.sm,
      marginLeft: spacing.md,
      borderRadius: borderRadius.md,
    },
  });

  return (
    <View style={[styles.container, style]} testID={testID}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          {/* Left Section - Back Button + Title */}
          <View style={styles.leftSection}>
            {showBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBackPress}
                testID="header-back-button"
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={themeColors.text.primary}
                />
              </TouchableOpacity>
            )}

            <View style={styles.titleSection}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>
          </View>

          {/* Right Section - Action Buttons */}
          {rightActions.length > 0 && (
            <View style={styles.rightSection}>
              {rightActions.map((action, index) => (
                <TouchableOpacity
                  key={`action-${index}`}
                  style={styles.actionButton}
                  onPress={action.onPress}
                  testID={action.testID || `header-action-${index}`}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={action.label || 'Action'}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={24}
                    color={themeColors.text.primary}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default Header;
