import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, isDark } = useTheme();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // ── Validation ─────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!email.trim())                            e.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email))         e.email    = 'Invalid email format.';
    if (!password)                                 e.password = 'Password is required.';
    else if (password.length < 6)                  e.password = 'Password is too short (min 6 characters).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email: email.trim(), password });
      const { token, user } = res.data;
      await login(user, token);
    } catch (err) {
      console.log('Login error full:', JSON.stringify(err?.response?.data), err?.message);
      let msg = 'Invalid credentials or login failed.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout') || err.message?.includes('503')) {
        msg = 'Connection timed out or Tunnel unavailable.\n\nMake sure the localtunnel is running and the URL in api.js is up to date.';
      } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        msg = 'Cannot reach the server. Make sure your localtunnel is running.';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      Alert.alert('Login Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      
      {/* ── Emerald Green Header ──────────────────────────────── */}
      <View style={styles.greenHeader}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>🚘</Text>
        </View>
        <Text style={styles.brandName}>DriveEase</Text>
        <Text style={styles.tagline}>Rent Smart. Drive Green.</Text>
      </View>

      {/* ── White Form Card ───────────────────────────────────── */}
      <KeyboardAvoidingView style={styles.formArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.welcomeTitle}>Welcome Back</Text>
          <Text style={styles.welcomeSub}>Sign in to continue your journey</Text>

          {/* Email */}
          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <View style={styles.passwordRow}>
            <Text style={styles.label}>PASSWORD</Text>
            <TouchableOpacity>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)}>
              <Text style={styles.inputIcon}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialLabel}>🌐 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn}>
              <Text style={styles.socialLabel}>🍏 Apple ID</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.link}>Sign Up</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.background },
  
  // ── Green Header ──
  greenHeader:  { backgroundColor: C.headerGradientStart, paddingTop: 60, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  logoCircle:   { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoIcon:     { fontSize: 36 },
  brandName:    { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500' },

  // ── Form Area ──
  formArea:     { flex: 1, marginTop: -16, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOWS.card },
  formScroll:   { padding: 24, paddingBottom: 40 },
  welcomeTitle: { fontSize: 26, fontWeight: '800', color: C.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  welcomeSub:   { color: C.textSecondary, fontSize: 14, marginBottom: 24, fontWeight: '500' },
  
  label:        { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 8, letterSpacing: 0.5, marginTop: 16 },
  passwordRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  forgotText:   { fontSize: 11, fontWeight: '700', color: C.primary, marginBottom: 8 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radius, height: SIZES.inputHeight, paddingHorizontal: 16 },
  inputIcon:    { fontSize: 16, marginRight: 12, opacity: 0.6 },
  input:        { flex: 1, fontSize: 15, color: C.textPrimary, height: '100%' },
  inputError:   { borderColor: C.error },
  errorText:    { color: C.error, fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '600' },
  
  btn:          { backgroundColor: C.primary, borderRadius: SIZES.radius, height: SIZES.inputHeight + 4, justifyContent: 'center', alignItems: 'center', marginTop: 28, ...SHADOWS.float },
  btnDisabled:  { opacity: 0.7 },
  btnText:      { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine:  { flex: 1, height: 1, backgroundColor: C.border },
  dividerText:  { marginHorizontal: 16, color: C.textMuted, fontSize: 12, fontWeight: '700' },
  
  socialRow:    { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  socialBtn:    { flex: 1, backgroundColor: C.background, height: 48, borderRadius: SIZES.radius, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  socialLabel:  { fontSize: 14, fontWeight: '600', color: C.textPrimary },
  
  linkRow:      { alignItems: 'center', marginTop: 8 },
  linkText:     { color: C.textSecondary, fontSize: 14 },
  link:         { color: C.primary, fontWeight: '800' },
});

