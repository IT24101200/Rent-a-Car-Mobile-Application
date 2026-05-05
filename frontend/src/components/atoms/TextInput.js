import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { SIZES } from '../../theme/theme';

/**
 * TextInput Component
 * 
 * @param {string} label - Input label
 * @param {string} placeholder - Placeholder text
 * @param {string} value - Input value
 * @param {function} onChangeText - Text change handler
 * @param {string} type - 'text' | 'email' | 'password' | 'phone' | 'number' (default: 'text')
 * @param {string} error - Error message
 * @param {boolean} disabled - Disable input (default: false)
 * @param {string} icon - Icon name from MaterialCommunityIcons
 * @param {object} style - Additional styles
 */
const TextInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  type = 'text',
  error = '',
  disabled = false,
  icon = null,
  onFocus,
  onBlur,
  style = {},
  testID = 'text-input',
  ...props
}) => {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    labelText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isFocused
        ? colors.primary
        : error
        ? colors.error
        : colors.border,
      borderRadius: SIZES.radius,
      backgroundColor: disabled
        ? (isDark ? '#1E293B' : '#F1F5F9') // disabled background
        : colors.background,
      paddingHorizontal: 16,
      height: SIZES.inputHeight,
    },
    inputWrapperFocused: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    icon: {
      marginRight: 12,
      opacity: isFocused ? 1 : 0.6,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      height: '100%',
    },
    clearButton: {
      padding: 8,
      marginLeft: 4,
    },
    eyeButton: {
      padding: 8,
      marginLeft: 4,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 4,
      fontWeight: '600',
    },
  });

  // Determine keyboard type
  const keyboardTypeMap = {
    text: 'default',
    email: 'email-address',
    password: 'default',
    phone: 'phone-pad',
    number: 'decimal-pad',
  };

  // Determine text content type for autofill
  const textContentTypeMap = {
    text: 'none',
    email: 'emailAddress',
    password: 'password',
    phone: 'telephoneNumber',
    number: 'none',
  };

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.labelText}>{label.toUpperCase()}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && { borderColor: colors.error },
        ]}
      >
        {icon && (
          <View style={styles.icon}>
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={
                isFocused
                  ? colors.primary
                  : error
                  ? colors.error
                  : colors.textSecondary
              }
            />
          </View>
        )}

        <RNTextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={!disabled}
          keyboardType={keyboardTypeMap[type]}
          textContentType={textContentTypeMap[type]}
          secureTextEntry={type === 'password' && !showPassword}
          autoCapitalize={type === 'email' || type === 'password' ? 'none' : 'sentences'}
          testID={testID}
          accessibilityLabel={label}
          {...props}
        />

        {value && type !== 'password' && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {type === 'password' && value && (
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye' : 'eye-off'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

export default TextInput;
