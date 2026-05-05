import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';

import TextInput from '../../components/atoms/TextInput';
import Button from '../../components/atoms/Button';

const ROLES   = ['Customer', 'Car Owner'];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [role,     setRole]     = useState('Customer');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const validate = () => {
    const e = {};
    if (!name.trim())                              e.name     = 'Full name is required.';
    if (!email.trim())                             e.email    = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email))          e.email    = 'Invalid email format.';
    if (!password)                                  e.password = 'Password is required.';
    else if (password.length < 6)                   e.password = 'Password must be at least 6 characters.';
    if (confirm !== password)                       e.confirm  = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await api.post('/api/auth/register', {
        name: name.trim(), email: email.trim(), password, role,
      });
      const { token, user } = res.data;
      await login(user, token);
    } catch (err) {
      console.log('Register error full:', JSON.stringify(err?.response?.data), err?.message);
      let msg = 'Registration failed. Please try again.';
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        msg = 'Connection timed out.\n\nMake sure your backend server is running:\n  cd backend\n  node server.js';
      } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
        msg = 'Cannot reach the server.\n\nCheck:\n  1. Backend is running (port 5000)\n  2. IP in src/api/api.js is correct\n  3. Phone & PC are on the same Wi-Fi';
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      Alert.alert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      
      {/* ── Emerald Green Header ──────────────────────────────── */}
      <View style={styles.greenHeader}>
        <Text style={styles.brandName}>Create Account</Text>
        <Text style={styles.tagline}>Join DriveEase today</Text>
      </View>

      {/* ── White Form Card ───────────────────────────────────── */}
      <KeyboardAvoidingView style={styles.formArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
          
          {/* Full Name */}
          <TextInput
            label="FULL NAME"
            placeholder="John Doe"
            value={name}
            onChangeText={setName}
            error={errors.name}
            icon="account-outline"
          />

          {/* Email */}
          <TextInput
            label="EMAIL ADDRESS"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            icon="email-outline"
          />

          {/* Role Selection */}
          <Text style={styles.label}>ACCOUNT TYPE</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]} onPress={() => setRole(r)} activeOpacity={0.8}>
                <Text style={styles.roleEmoji}>{r === 'Customer' ? '👤' : '🔑'}</Text>
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Password */}
          <View style={{ marginTop: 16 }}>
            <TextInput
              label="PASSWORD"
              placeholder="At least 6 characters"
              type="password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              icon="lock-outline"
            />
          </View>

          {/* Confirm */}
          <TextInput
            label="CONFIRM PASSWORD"
            placeholder="Re-enter password"
            type="password"
            value={confirm}
            onChangeText={setConfirm}
            error={errors.confirm}
            icon="check-circle-outline"
          />

          {/* Submit */}
          <Button
            label="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="large"
            style={{ marginTop: 12 }}
          />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:       { flex: 1, backgroundColor: C.background },
  
  greenHeader:  { backgroundColor: C.headerGradientStart, paddingTop: 60, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandName:    { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  tagline:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500' },

  formArea:     { flex: 1, marginTop: -16, backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, ...SHADOWS.card },
  formScroll:   { padding: 24, paddingBottom: 40 },
  
  label:        { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 8, letterSpacing: 0.5, marginTop: 16 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radius, height: SIZES.inputHeight, paddingHorizontal: 16 },
  inputIcon:    { fontSize: 16, marginRight: 12, opacity: 0.6 },
  input:        { flex: 1, fontSize: 15, color: C.textPrimary, height: '100%' },
  inputError:   { borderColor: C.error },
  errorText:    { color: C.error, fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '600' },
  
  roleRow:      { flexDirection: 'row', gap: 12, marginTop: 4 },
  roleBtn:      { flex: 1, height: 64, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  roleBtnActive:{ backgroundColor: C.primary, borderColor: C.primary },
  roleEmoji:    { fontSize: 20, marginBottom: 4 },
  roleBtnText:  { color: C.textSecondary, fontWeight: '700', fontSize: 13 },
  roleBtnTextActive: { color: '#FFFFFF' },

  btn:          { backgroundColor: C.primary, borderRadius: SIZES.radius, height: SIZES.inputHeight + 4, justifyContent: 'center', alignItems: 'center', marginTop: 28, ...SHADOWS.float },
  btnDisabled:  { opacity: 0.7 },
  btnText:      { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  linkRow:      { marginTop: 24, alignItems: 'center' },
  linkText:     { color: C.textSecondary, fontSize: 14 },
  link:         { color: C.primary, fontWeight: '800' },
});

