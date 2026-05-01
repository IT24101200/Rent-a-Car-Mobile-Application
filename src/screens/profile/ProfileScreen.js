import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, Switch
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function ProfileScreen({ navigation }) {
  const { user, login, logout, refreshUser } = useAuth();
  const { colors, isDark, themeMode, changeThemeMode } = useTheme();
  
  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [])
  );
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [name,        setName]        = useState(user?.name     || '');
  const [email,       setEmail]       = useState(user?.email    || '');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass,     setNewPass]     = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [section,     setSection]     = useState('info'); // 'info' | 'password'

  const [notifications, setNotifications] = useState(true);

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

  const handleSaveInfo = async () => {
    if (!validateInfo()) return;
    setSaving(true);
    try {
      const res = await api.put('/api/auth/profile', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
      });
      const updated = res.data.user;
      await login(updated, res.data.token || (await require('@react-native-async-storage/async-storage').default.getItem('token')));
      Alert.alert('✅ Profile Updated', 'Your information has been successfully saved.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

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
      Alert.alert('✅ Password Changed', 'Your security credentials have been updated.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const kycStatus = user?.identity?.status || 'unverified';
  const isVerified = kycStatus === 'verified';
  const isPending = kycStatus === 'pending';
  const roleEmoji = user?.role === 'Admin' ? '🛡️' : user?.role === 'Car Owner' ? '🔑' : '👤';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          {/* ── Emerald Green Avatar Header ────────────────────────── */}
          <View style={styles.greenHeader}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </View>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleEmoji} {user?.role}</Text>
            </View>
          </View>

          {/* ── KYC Module ─────────────────────────────────────────── */}
          {user?.role === 'Customer' && (
            <TouchableOpacity 
              style={[styles.kycCard, isVerified && styles.kycVerified]} 
              onPress={() => navigation.navigate('KYCUpload')}
              activeOpacity={0.8}
            >
              <View style={styles.kycCardInner}>
                <View style={styles.kycIconBox}>
                  <Text style={styles.kycIcon}>{isVerified ? '✅' : isPending ? '⏳' : '🛡️'}</Text>
                </View>
                <View style={styles.kycTextCol}>
                  <Text style={styles.kycTitle}>Identity Verification</Text>
                  <Text style={[styles.kycStatus, isVerified && {color: colors.success}, isPending && {color: colors.warning}]}>
                    {isVerified ? 'Verified' : isPending ? 'Pending Review' : 'Not Verified'}
                  </Text>
                </View>
                <Text style={styles.kycArrow}>→</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* ── Tabs ───────────────────────────────────────────────── */}
          <View style={styles.tabContainer}>
            <TouchableOpacity style={[styles.tab, section === 'info' && styles.tabActive]} onPress={() => { setSection('info'); setErrors({}); }}>
              <Text style={[styles.tabText, section === 'info' && styles.tabTextActive]}>Personal Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, section === 'password' && styles.tabActive]} onPress={() => { setSection('password'); setErrors({}); }}>
              <Text style={[styles.tabText, section === 'password' && styles.tabTextActive]}>Security</Text>
            </TouchableOpacity>
          </View>

          {/* ── Info Tab ───────────────────────────────────────────── */}
          {section === 'info' && (
            <View style={styles.card}>
              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <View style={styles.hLine} />
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Switch 
                  value={notifications} 
                  onValueChange={setNotifications} 
                  trackColor={{ true: colors.primary, false: isDark ? '#334155' : '#CBD5E1' }}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Dark Mode (Global)</Text>
                <Switch 
                  value={themeMode === 'dark' || (themeMode === 'system' && isDark)}
                  onValueChange={(val) => changeThemeMode(val ? 'dark' : 'light')} 
                  trackColor={{ true: colors.primary, false: isDark ? '#334155' : '#CBD5E1' }}
                />
              </View>

              <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleSaveInfo} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.btnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Security Tab ───────────────────────────────────────── */}
          {section === 'password' && (
            <View style={styles.card}>
              <Text style={styles.label}>CURRENT PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.currentPass && styles.inputError]}
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
              {errors.currentPass && <Text style={styles.errorText}>{errors.currentPass}</Text>}

              <Text style={styles.label}>NEW PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.newPass && styles.inputError]}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
              {errors.newPass && <Text style={styles.errorText}>{errors.newPass}</Text>}

              <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
              <TextInput
                style={[styles.input, errors.confirmPass && styles.inputError]}
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
              />
              {errors.confirmPass && <Text style={styles.errorText}>{errors.confirmPass}</Text>}

              <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={handleChangePassword} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.btnText}>Update Password</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* ── Dangerous Actions ──────────────────────────────────── */}
          <View style={styles.dangerZone}>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.8}>
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.versionText}>DriveEase version 1.0.0 by Stitch</Text>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  container:      { paddingBottom: 60 },
  
  // ── Green Avatar Header ──
  greenHeader:    { backgroundColor: C.headerGradientStart, paddingTop: 60, paddingBottom: 30, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatarWrap:     { padding: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.15)' },
  avatar:         { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontSize: 38, color: '#FFFFFF', fontWeight: '800' },
  userName:       { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: 14, letterSpacing: -0.5 },
  userEmail:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 12 },
  
  roleBadge:      { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: SIZES.radiusPill },
  roleText:       { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // ── KYC Card ──
  kycCard:        { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 16, marginHorizontal: 20, marginTop: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  kycVerified:    { borderColor: C.success },
  kycCardInner:   { flexDirection: 'row', alignItems: 'center' },
  kycIconBox:     { width: 44, height: 44, borderRadius: 22, backgroundColor: C.iconCircleBg, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  kycIcon:        { fontSize: 20 },
  kycTextCol:     { flex: 1 },
  kycTitle:       { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  kycStatus:      { fontSize: 13, fontWeight: '600', color: C.textMuted },
  kycArrow:       { fontSize: 24, color: C.textMuted },
  
  // ── Tabs & Form ──
  tabContainer:   { flexDirection: 'row', backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, padding: 4, marginHorizontal: 20, marginBottom: 20, borderColor: C.border, borderWidth: 1 },
  tab:            { flex: 1, paddingVertical: 10, borderRadius: SIZES.radius, alignItems: 'center' },
  tabActive:      { backgroundColor: C.surface, ...SHADOWS.card },
  tabText:        { color: C.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive:  { color: C.textPrimary, fontWeight: '800' },
  
  card:           { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 24, marginHorizontal: 20, marginBottom: 24, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  label:          { fontSize: 11, fontWeight: '700', color: C.textSecondary, marginBottom: 8, letterSpacing: 0.5, marginTop: 12 },
  input:          { backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radius, height: SIZES.inputHeight, paddingHorizontal: 16, fontSize: 15, color: C.textPrimary },
  inputError:     { borderColor: C.error },
  errorText:      { color: C.error, fontSize: 12, marginTop: 6, marginLeft: 4, fontWeight: '600' },
  
  hLine:          { height: 1, backgroundColor: C.border, marginVertical: 24 },
  settingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settingLabel:   { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  
  btn:            { backgroundColor: C.primary, borderRadius: SIZES.radius, height: SIZES.inputHeight, justifyContent: 'center', alignItems: 'center', marginTop: 28, ...SHADOWS.float },
  btnDisabled:    { opacity: 0.7 },
  btnText:        { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  
  dangerZone:     { marginTop: 16, marginHorizontal: 20 },
  logoutBtn:      { backgroundColor: C.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border, height: SIZES.inputHeight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoutText:     { color: C.textPrimary, fontWeight: '700', fontSize: 16 },
  
  deleteBtn:      { height: SIZES.inputHeight, justifyContent: 'center', alignItems: 'center' },
  deleteText:     { color: C.error, fontWeight: '600', fontSize: 15 },
  
  versionText:    { textAlign: 'center', color: C.textMuted, fontSize: 12, marginTop: 32, fontWeight: '500' }
});

