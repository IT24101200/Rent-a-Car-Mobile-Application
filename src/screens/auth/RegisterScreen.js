import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';
const ROLES   = ['Customer', 'Car Owner']; // Admin accounts are pre-created by system

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [role,     setRole]     = useState('Customer');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);

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
        msg = 'Connection timed out.\n\nMake sure your backend server is running:\n  cd rent-a-car-backend\n  node server.js';
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>🔑</Text>
          <Text style={styles.appName}>Join DriveEase</Text>
          <Text style={styles.tagline}>Create your account in seconds</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            placeholder="John Doe"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

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
            placeholder="At least 6 characters"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[styles.input, errors.confirm && styles.inputError]}
            placeholder="Re-enter your password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={confirm}
            onChangeText={setConfirm}
          />
          {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}

          {/* Role Selection */}
          <Text style={styles.label}>I am a...</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.link}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:         { flexGrow: 1, backgroundColor: '#F0F4FF', padding: 20 },
  header:            { alignItems: 'center', marginBottom: 24, marginTop: 40 },
  logo:              { fontSize: 50 },
  appName:           { fontSize: 28, fontWeight: '800', color: PRIMARY, marginTop: 8 },
  tagline:           { color: '#555', fontSize: 14, marginTop: 4 },
  card:              { backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  title:             { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  label:             { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 10 },
  input:             { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA' },
  inputError:        { borderColor: '#EF4444' },
  errorText:         { color: '#EF4444', fontSize: 12, marginTop: 4 },
  roleRow:           { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBtn:           { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' },
  roleBtnActive:     { backgroundColor: PRIMARY, borderColor: PRIMARY },
  roleBtnText:       { color: '#555', fontWeight: '600', fontSize: 13 },
  roleBtnTextActive: { color: '#fff' },
  btn:               { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  btnDisabled:       { opacity: 0.7 },
  btnText:           { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkRow:           { marginTop: 20, alignItems: 'center' },
  linkText:          { color: '#555', fontSize: 14 },
  link:              { color: PRIMARY, fontWeight: '700' },
});
