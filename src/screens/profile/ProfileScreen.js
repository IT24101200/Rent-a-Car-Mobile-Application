import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function ProfileScreen({ navigation }) {
  const { user, login, logout } = useAuth();

  const [name,        setName]        = useState(user?.name     || '');
  const [email,       setEmail]       = useState(user?.email    || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [section,     setSection]     = useState('info'); // 'info' | 'password'

  const validateInfo = () => {
    const e = {};
    if (!name.trim())                           e.name  = 'Name is required.';
    if (!email.trim())                          e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email))       e.email = 'Invalid email format.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePassword = () => {
    const e = {};
    if (!currentPass)                            e.currentPass = 'Current password is required.';
    if (!newPass)                                e.newPass     = 'New password is required.';
    else if (newPass.length < 6)                 e.newPass     = 'Must be at least 6 characters.';
    if (newPass !== confirmPass)                 e.confirmPass = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save profile info (name + email) ────────────────────────────
  const handleSaveInfo = async () => {
    if (!validateInfo()) return;
    setSaving(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      const updated = res.data.user;
      // Refresh in-memory user state with the new data
      await login(updated, res.data.token || (await require('@react-native-async-storage/async-storage').default.getItem('token')));
      Alert.alert('✅ Updated', 'Your profile has been updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ──────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    setSaving(true);
    try {
      await api.put('/api/auth/password', {
        currentPassword: currentPass,
        newPassword:     newPass,
      });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      Alert.alert('✅ Password Changed', 'Your password has been updated successfully.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* ── Avatar header ─────────────────────────────────── */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role === 'Admin' ? '🛡️' : user?.role === 'Car Owner' ? '🔑' : '👤'} {user?.role}
              </Text>
            </View>
          </View>

          {/* ── KYC Identity Module ────────────────────────────── */}
          {user?.role === 'Customer' && (
            <TouchableOpacity 
              style={[styles.kycCard, user?.identity?.status === 'verified' && styles.kycCardVerified]} 
              onPress={() => navigation.navigate('KYCUpload')}
            >
              <View style={styles.kycCardRow}>
                <View>
                  <Text style={styles.kycCardTitle}>Identity Verification</Text>
                  <Text style={styles.kycCardStatus}>
                    Status:{' '} 
                    <Text style={{
                      fontWeight: '800', 
                      color: user?.identity?.status === 'verified' ? '#16A34A' : user?.identity?.status === 'pending' ? '#D97706' : user?.identity?.status === 'rejected' ? '#DC2626' : '#64748B'
                    }}>
                      {!user?.identity?.status || user?.identity?.status === 'unverified' ? 'UNVERIFIED' : user?.identity?.status?.toUpperCase()}
                    </Text>
                  </Text>
                </View>
                <Text style={styles.kycArrow}>→</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Tab switcher ──────────────────────────────────── */}
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tab, section === 'info'     && styles.tabActive]}
              onPress={() => { setSection('info'); setErrors({}); }}
            >
              <Text style={[styles.tabText, section === 'info'     && styles.tabTextActive]}>Profile Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, section === 'password' && styles.tabActive]}
              onPress={() => { setSection('password'); setErrors({}); }}
            >
              <Text style={[styles.tabText, section === 'password' && styles.tabTextActive]}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {/* ── Profile Info Section ─────────────────────────── */}
          {section === 'info' && (
            <View style={styles.card}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#aaa"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#aaa"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Role</Text>
                <Text style={styles.infoValue}>{user?.role}</Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, saving && styles.btnDisabled]}
                onPress={handleSaveInfo}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Change Password Section ───────────────────────── */}
          {section === 'password' && (
            <View style={styles.card}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={[styles.input, errors.currentPass && styles.inputError]}
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Enter current password"
                placeholderTextColor="#aaa"
                secureTextEntry
              />
              {errors.currentPass && <Text style={styles.errorText}>{errors.currentPass}</Text>}

              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={[styles.input, errors.newPass && styles.inputError]}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="At least 6 characters"
                placeholderTextColor="#aaa"
                secureTextEntry
              />
              {errors.newPass && <Text style={styles.errorText}>{errors.newPass}</Text>}

              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPass && styles.inputError]}
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Re-enter new password"
                placeholderTextColor="#aaa"
                secureTextEntry
              />
              {errors.confirmPass && <Text style={styles.errorText}>{errors.confirmPass}</Text>}

              <TouchableOpacity
                style={[styles.btn, saving && styles.btnDisabled]}
                onPress={handleChangePassword}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── Logout ────────────────────────────────────────── */}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>🚪  Logout</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { padding: 20, paddingBottom: 50 },
  avatarSection:   { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  avatar:          { width: 90, height: 90, borderRadius: 45, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  avatarText:      { fontSize: 40, color: '#fff', fontWeight: '800' },
  userName:        { fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginTop: 12 },
  roleBadge:       { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
  roleText:        { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  tabRow:          { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4, marginBottom: 16 },
  tab:             { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  tabActive:       { backgroundColor: '#fff', elevation: 3 },
  tabText:         { color: '#888', fontWeight: '600', fontSize: 14 },
  tabTextActive:   { color: PRIMARY, fontWeight: '700' },
  card:            { backgroundColor: '#fff', borderRadius: 18, padding: 22, elevation: 4, marginBottom: 16 },
  label:           { fontSize: 13, fontWeight: '600', color: '#333', marginTop: 14, marginBottom: 6 },
  input:           { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA' },
  inputError:      { borderColor: '#EF4444' },
  errorText:       { color: '#EF4444', fontSize: 12, marginTop: 4 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  infoLabel:       { color: '#777', fontSize: 14 },
  infoValue:       { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  btn:             { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 22 },
  btnDisabled:     { opacity: 0.7 },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 16 },
  logoutBtn:       { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, alignItems: 'center' },
  logoutText:      { color: '#DC2626', fontWeight: '700', fontSize: 16 },
  kycCard:         { backgroundColor: '#fff', borderRadius: 16, padding: 18, elevation: 3, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  kycCardVerified: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  kycCardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kycCardTitle:    { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  kycCardStatus:   { fontSize: 13, color: '#64748B', fontWeight: '500' },
  kycArrow:        { fontSize: 24, color: '#CBD5E1' },
});
