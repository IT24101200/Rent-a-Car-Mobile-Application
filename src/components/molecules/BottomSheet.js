// BottomSheet.js - Bottom sheet modal component with swipe-down dismiss

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../theme';

/**
 * BottomSheet Component
 * 
 * @param {boolean} visible - Show/hide bottom sheet
 * @param {string} title - Sheet title
 * @param {function} onClose - Close handler
 * @param {object} children - Sheet content
 * @param {object} footer - Footer actions
 * @param {number} height - Sheet height (percentage of screen, default: 60)
 */
const BottomSheet = ({
  visible = false,
  title = '',
  onClose = null,
  children = null,
  footer = null,
  height = 60,
  testID = 'bottom-sheet',
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();
  const translateY = useRef(new Animated.Value(1000)).current;
  const panResponder = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  // Gesture handling for swipe down to dismiss
  useEffect(() => {
    panResponder.current = PanResponder.create({
      onMoveShouldSetPanResponder: (evt, { dy }) => dy > 10,
      onPanResponderMove: (evt, { dy }) => {
        if (dy > 0) {
          translateY.setValue(dy);
        }
      },
      onPanResponderRelease: (evt, { dy }) => {
        if (dy > 100) {
          onClose?.();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  }, [translateY, onClose]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    sheet: {
      height: `${height}%`,
      backgroundColor: themeColors.background.main,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      ...shadows.xl,
    },
    handle: {
      alignItems: 'center',
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    handleBar: {
      width: 40,
      height: 4,
      borderRadius: borderRadius.full,
      backgroundColor: themeColors.border.light,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border.light,
    },
    title: {
      ...typography.h4,
      color: themeColors.text.primary,
    },
    closeButton: {
      padding: spacing.sm,
    },
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: themeColors.border.light,
    },
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      testID={testID}
    >
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.current.panHandlers}
          >
            {/* Handle */}
            <View style={styles.handle}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
            {title && (
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={themeColors.text.primary}
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            {children && (
              <ScrollView style={styles.content}>
                {children}
              </ScrollView>
            )}

            {/* Footer */}
            {footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default BottomSheet;
