import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView,
  Platform, Switch
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import TextInput from '../../components/atoms/TextInput';
import Button from '../../components/atoms/Button';
import Card from '../../components/atoms/Card';

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
          
          {/* ── Emerald Green Avatar Hero ────────────────────────── */}
          <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd || colors.primary]} style={styles.greenHeader}>
            <View style={styles.avatarWrap}>
              <BlurView intensity={80} tint="light" style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
              </BlurView>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <BlurView intensity={40} tint="light" style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleEmoji} {user?.role}</Text>
            </BlurView>
          </LinearGradient>

          {/* ── KYC Module ─────────────────────────────────────────── */}
          {user?.role === 'Customer' && (
            <Card 
              pressable
              onPress={() => navigation.navigate('KYCUpload')}
              style={[isVerified && styles.kycVerified, { padding: 0, marginHorizontal: 20, marginTop: 20, marginBottom: 16 }]}
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
            </Card>
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
            <Card style={{ marginHorizontal: 20, marginBottom: 24 }}>
              <TextInput
                label="FULL NAME"
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                error={errors.name}
                icon="account-outline"
              />

              <TextInput
                label="EMAIL ADDRESS"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                type="email"
                error={errors.email}
                icon="email-outline"
              />

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

              <Button 
                label="Save Changes"
                onPress={handleSaveInfo}
                loading={saving}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}

          {/* ── Security Tab ───────────────────────────────────────── */}
          {section === 'password' && (
            <Card style={{ marginHorizontal: 20, marginBottom: 24 }}>
              <TextInput
                label="CURRENT PASSWORD"
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Enter current password"
                type="password"
                error={errors.currentPass}
                icon="lock-outline"
              />

              <TextInput
                label="NEW PASSWORD"
                value={newPass}
                onChangeText={setNewPass}
                placeholder="At least 6 characters"
                type="password"
                error={errors.newPass}
                icon="shield-key-outline"
              />

              <TextInput
                label="CONFIRM NEW PASSWORD"
                value={confirmPass}
                onChangeText={setConfirmPass}
                placeholder="Re-enter new password"
                type="password"
                error={errors.confirmPass}
                icon="check-circle-outline"
              />

              <Button 
                label="Update Password"
                onPress={handleChangePassword}
                loading={saving}
                style={{ marginTop: 12 }}
              />
            </Card>
          )}

          {/* ── Dangerous Actions ──────────────────────────────────── */}
          <View style={styles.dangerZone}>
            <Button 
              label="Log Out"
              onPress={logout}
              variant="secondary"
              style={{ marginBottom: 12 }}
            />
            
            <Button 
              label="Delete Account"
              variant="ghost"
              style={{ paddingVertical: 0, height: 40 }}
              textStyle={{ color: colors.error }}
            />
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
  greenHeader:    { paddingTop: Platform.OS === 'ios' ? 70 : 60, paddingBottom: 40, alignItems: 'center', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, ...SHADOWS.float, marginBottom: 8 },
  avatarWrap:     { padding: 4, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)', ...SHADOWS.float },
  avatar:         { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarText:     { fontSize: 44, color: '#FFFFFF', fontWeight: '900' },
  userName:       { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginTop: 16, letterSpacing: -0.5 },
  userEmail:      { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 16, fontWeight: '600' },
  
  roleBadge:      { paddingHorizontal: 16, paddingVertical: 8, borderRadius: SIZES.radiusPill, overflow: 'hidden' },
  roleText:       { color: '#FFFFFF', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  
  // ── KYC Card ──
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
  
  hLine:          { height: 1, backgroundColor: C.border, marginVertical: 24 },
  settingRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  settingLabel:   { fontSize: 15, fontWeight: '600', color: C.textPrimary },
  
  dangerZone:     { marginTop: 16, marginHorizontal: 20 },
  
  versionText:    { textAlign: 'center', color: C.textMuted, fontSize: 12, marginTop: 32, fontWeight: '500' }
});

