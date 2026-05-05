// Modal.js - Full-screen modal component with header and footer

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../theme';
import Button from '../atoms/Button';

/**
 * Modal Component
 * 
 * @param {boolean} visible - Show/hide modal
 * @param {string} title - Modal title
 * @param {function} onClose - Close handler
 * @param {object} children - Modal content
 * @param {array} actions - Footer action buttons [{ label, onPress, variant }]
 * @param {boolean} scrollable - Enable scrolling content
 */
const CustomModal = ({
  visible = false,
  title = '',
  onClose = null,
  children = null,
  actions = [],
  scrollable = true,
  testID = 'modal',
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      flex: 1,
      width: '100%',
      backgroundColor: themeColors.background.main,
      marginTop: 'auto',
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      ...shadows.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border.light,
    },
    title: {
      ...typography.h3,
      color: themeColors.text.primary,
      flex: 1,
    },
    closeButton: {
      padding: spacing.sm,
    },
    content: {
      flex: 1,
    },
    contentPadding: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: themeColors.border.light,
      gap: spacing.md,
    },
  });

  const ContentComponent = scrollable ? ScrollView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={themeColors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ContentComponent style={[styles.content, styles.contentPadding]}>
            {children}
          </ContentComponent>

          {/* Footer Actions */}
          {actions.length > 0 && (
            <View style={styles.footer}>
              {actions.map((action, index) => (
                <Button
                  key={`action-${index}`}
                  label={action.label}
                  onPress={action.onPress}
                  variant={action.variant || 'primary'}
                  size="large"
                />
              ))}
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default CustomModal;
