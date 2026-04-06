import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const PRIMARY   = '#1E3A8A';
const PRIMARY_L = '#3B5FC0';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

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
      // Navigation handled automatically by RootNavigator
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🚗</Text>
          <Text style={styles.appName}>DriveEase</Text>
          <Text style={styles.tagline}>Rent a car, drive your world</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Email */}
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="you@example.com"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, errors.password && styles.inputError]}
            placeholder="••••••••"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkRow}>
            <Text style={styles.linkText}>Don't have an account? <Text style={styles.link}>Register</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flexGrow: 1, backgroundColor: '#F0F4FF', justifyContent: 'center', padding: 20 },
  header:      { alignItems: 'center', marginBottom: 30 },
  logo:        { fontSize: 60 },
  appName:     { fontSize: 32, fontWeight: '800', color: PRIMARY, marginTop: 8 },
  tagline:     { color: '#555', marginTop: 4, fontSize: 14 },
  card:        { backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  title:       { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  subtitle:    { color: '#888', marginBottom: 24 },
  label:       { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input:       { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 4, backgroundColor: '#FAFAFA' },
  inputError:  { borderColor: '#EF4444' },
  errorText:   { color: '#EF4444', fontSize: 12, marginBottom: 10 },
  btn:         { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled: { opacity: 0.7 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkRow:     { marginTop: 20, alignItems: 'center' },
  linkText:    { color: '#555', fontSize: 14 },
  link:        { color: PRIMARY, fontWeight: '700' },
});
