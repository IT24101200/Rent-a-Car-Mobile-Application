import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function UserManagementScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch {
      Alert.alert('Error', 'Could not load users.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    Alert.alert(
      newStatus === 'suspended' ? '🚫 Suspend User' : '✅ Activate User',
      `Are you sure you want to ${newStatus === 'suspended' ? 'suspend' : 'activate'} this account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: newStatus === 'suspended' ? 'destructive' : 'default', onPress: async () => {
            setActionId(userId);
            try {
              const res = await api.patch(`/api/admin/users/${userId}/status`, { status: newStatus });
              setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: newStatus } : u));
            } catch {
              Alert.alert('Error', 'Failed to update user status.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  const toggleKYC = async (userId, newStatus) => {
    setActionId(`kyc-${userId}`);
    try {
      await api.patch(`/api/admin/users/${userId}/kyc`, { status: newStatus });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, identity: { ...u.identity, status: newStatus } } : u));
    } catch {
      Alert.alert('Error', 'Failed to update KYC status.');
    } finally {
      setActionId(null);
    }
  };

  const promoteToAdmin = (userId, name) => {
    Alert.alert(
      '⚠️ Promote to Admin',
      `Are you sure you want to promote ${name} to an Admin? They will have full root-level access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Promote', style: 'destructive', onPress: async () => {
            setActionId(`promote-${userId}`);
            try {
              await api.patch(`/api/admin/users/${userId}/role`, { role: 'Admin' });
              setUsers(prev => prev.filter(u => u._id !== userId));
              Alert.alert('Success', `${name} is now an Admin.`);
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to promote user.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  const deleteUser = (userId, name) => {
    Alert.alert(
      '❌ Delete User Permanently',
      `Are you absolutely sure you want to completely erase ${name}? This action cannot be reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            setActionId(`delete-${userId}`);
            try {
              await api.delete(`/api/admin/users/${userId}`);
              setUsers(prev => prev.filter(u => u._id !== userId));
              Alert.alert('Success', 'User fully deleted from the database.');
            } catch (err) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to delete user.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.greenHeader}>
            <Text style={styles.title}>Users</Text>
            <Text style={styles.subtitle}>{users.length} registered accounts</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyTitle}>No Users</Text>
            <Text style={styles.emptySub}>No users found in the system.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.status === 'suspended' && styles.cardSuspended]}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.roleBadge, item.role === 'Car Owner' ? styles.ownerBg : styles.custBg]}>
                <Text style={[styles.roleText, item.role === 'Car Owner' ? styles.ownerColor : styles.custColor]}>
                  {item.role}
                </Text>
              </View>
            </View>
            <Text style={styles.detail}>📧 {item.email}</Text>
            
            <View style={styles.actionRow}>
              <Text style={[styles.statusText, item.status === 'suspended' ? { color: colors.error } : { color: colors.success }]}>
                Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
              <TouchableOpacity
                style={[styles.btn, item.status === 'suspended' ? styles.btnActivate : styles.btnSuspend, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => toggleStatus(item._id, item.status)}
                disabled={actionId === item._id}
                activeOpacity={0.8}
              >
                {actionId === item._id 
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>{item.status === 'suspended' ? 'Activate' : 'Suspend'}</Text>
                }
              </TouchableOpacity>
            </View>

            {/* KYC Admin Block */}
            {item.role === 'Customer' && (
              <View style={styles.kycRow}>
                <Text style={styles.kycTitle}>KYC Identity: <Text style={[styles.kycStatus, { color: item.identity?.status === 'verified' ? colors.success : item.identity?.status === 'pending' ? colors.warning : colors.textSecondary}]}>{item.identity?.status?.toUpperCase() || 'UNVERIFIED'}</Text></Text>
                
                {item.identity?.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                    <TouchableOpacity 
                      style={[styles.btn, { backgroundColor: colors.success, flex: 1, alignItems: 'center' }]} 
                      onPress={() => toggleKYC(item._id, 'verified')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnText}>Approve Docs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.btn, { backgroundColor: colors.error, flex: 1, alignItems: 'center' }]} 
                      onPress={() => toggleKYC(item._id, 'rejected')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Advanced Admin Actions Block */}
            <View style={styles.advancedRow}>
               <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border, flex: 1, alignItems: 'center' }, actionId === `promote-${item._id}` && {opacity:0.5}]}
                  onPress={() => promoteToAdmin(item._id, item.name)}
                  disabled={!!actionId}
                  activeOpacity={0.8}
               >
                 {actionId === `promote-${item._id}` ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.btnText, {color: colors.primary}]}>👑 Make Admin</Text>}
               </TouchableOpacity>
               
               <View style={{width: 12}} />
               
               <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: colors.error + '10', borderWidth: 1, borderColor: colors.error + '30', flex: 1, alignItems: 'center' }, actionId === `delete-${item._id}` && {opacity:0.5}]}
                  onPress={() => deleteUser(item._id, item.name)}
                  disabled={!!actionId}
                  activeOpacity={0.8}
               >
                 {actionId === `delete-${item._id}` ? <ActivityIndicator size="small" color={colors.error} /> : <Text style={[styles.btnText, {color: colors.error}]}>🗑️ Delete User</Text>}
               </TouchableOpacity>
            </View>

          </View>
        )}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:          { padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },

  card:          { backgroundColor: C.surface, padding: 20, borderRadius: SIZES.radius, marginBottom: 16, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  cardSuspended: { backgroundColor: C.error + '05', borderColor: C.error + '30' },
  
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name:          { fontSize: 20, fontWeight: '900', color: C.textPrimary, flex: 1, letterSpacing: -0.2 },
  
  roleBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radiusPill },
  ownerBg:       { backgroundColor: C.warning + '15' }, 
  ownerColor:    { color: C.warning, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  custBg:        { backgroundColor: C.surfaceHighlight, borderWidth: 1, borderColor: C.border }, 
  custColor:     { color: C.textSecondary, fontWeight: '800', fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  
  detail:        { fontSize: 13, color: C.textSecondary, marginBottom: 20, fontWeight: '500' },
  
  actionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  statusText:    { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  
  btn:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusPill, ...SHADOWS.light },
  btnSuspend:    { backgroundColor: C.error },
  btnActivate:   { backgroundColor: C.success },
  btnText:       { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  
  kycRow:        { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  kycTitle:      { fontSize: 13, fontWeight: '700', color: C.textSecondary, letterSpacing: 0.5 },
  kycStatus:     { fontWeight: '900' },
  
  advancedRow:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, marginTop: 16, paddingTop: 16 },

  emptyBox:      { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji:    { fontSize: 60, marginBottom: 16 },
  emptyTitle:    { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  emptySub:      { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500', fontSize: 15, lineHeight: 22 },
});
