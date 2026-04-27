import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, ScrollView, TextInput, Platform
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
  const [staffModalUser, setStaffModalUser] = useState(null); // user object for staff assignment modal
  const [detailUser, setDetailUser] = useState(null); // user detail modal
  const [section, setSection] = useState('customers'); // 'customers' | 'staff'
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(null);

  const STAFF_ROLES = [
    { key: 'Booking Manager', emoji: '📋', desc: 'Manage all bookings & force-cancel' },
    { key: 'Feedback Manager', emoji: '⭐', desc: 'Moderate customer reviews' },
    { key: 'Vehicle Manager', emoji: '🚗', desc: 'View & manage entire fleet' },
    { key: 'Vehicle Validation Manager', emoji: '🛡️', desc: 'Approve/reject pending vehicles' },
    { key: 'Payment Manager', emoji: '💰', desc: 'View booking payments (read-only)' },
    { key: 'Report Handling Manager', emoji: '📄', desc: 'Analytics & platform reports' },
  ];

  const assignStaffRole = async (userId, staffRole) => {
    setActionId(`staff-${userId}`);
    try {
      const res = await api.patch(`/api/admin/users/${userId}/staff-role`, { staffRole });
      const updatedUser = res.data.user;
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: updatedUser.role, staffRole: updatedUser.staffRole } : u));
      Alert.alert('Success', res.data.message);
      setStaffModalUser(null);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to assign staff role.');
    } finally {
      setActionId(null);
    }
  };

  const createStaffMember = async () => {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim() || !newStaffRole) {
      return Alert.alert('Missing Fields', 'Please fill in all fields and select a role.');
    }
    if (newStaffPassword.length < 6) {
      return Alert.alert('Weak Password', 'Password must be at least 6 characters.');
    }
    setActionId('creating-staff');
    try {
      const res = await api.post('/api/admin/staff', {
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        password: newStaffPassword,
        staffRole: newStaffRole,
      });
      Alert.alert('Success', res.data.message);
      setCreateModalVisible(false);
      setNewStaffName(''); setNewStaffEmail(''); setNewStaffPassword(''); setNewStaffRole(null);
      fetchUsers(true); // Refresh list
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create staff member.');
    } finally {
      setActionId(null);
    }
  };

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

  const customerUsers = users.filter(u => u.role === 'Customer' || u.role === 'Car Owner');
  const staffUsers = users.filter(u => u.role === 'Staff');
  const displayedUsers = section === 'staff' ? staffUsers : customerUsers;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={displayedUsers}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.greenHeader}>
              <Text style={styles.title}>User Management</Text>
              <Text style={styles.subtitle}>{users.length} total accounts</Text>
            </View>
            <View style={styles.sectionRow}>
              <TouchableOpacity
                style={[styles.sectionTab, section === 'customers' && styles.sectionTabActive]}
                onPress={() => setSection('customers')}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTabTxt, section === 'customers' && styles.sectionTabTxtActive]}>👥 Customers ({customerUsers.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sectionTab, section === 'staff' && styles.sectionTabActive]}
                onPress={() => setSection('staff')}
                activeOpacity={0.8}
              >
                <Text style={[styles.sectionTabTxt, section === 'staff' && styles.sectionTabTxtActive]}>🔧 Staff ({staffUsers.length})</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>{section === 'staff' ? '🔧' : '👥'}</Text>
            <Text style={styles.emptyTitle}>No {section === 'staff' ? 'Staff Members' : 'Customers'}</Text>
            <Text style={styles.emptySub}>{section === 'staff' ? 'Tap "+ Add Staff" to create a staff member.' : 'No customers have registered yet.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.card, item.status === 'suspended' && styles.cardSuspended]} activeOpacity={0.85} onPress={() => setDetailUser(item)}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={[styles.roleBadge, item.role === 'Staff' ? styles.staffBg : item.role === 'Car Owner' ? styles.ownerBg : styles.custBg]}>
                <Text style={[styles.roleText, item.role === 'Staff' ? styles.staffColor : item.role === 'Car Owner' ? styles.ownerColor : styles.custColor]}>
                  {item.role === 'Staff' ? item.staffRole || 'Staff' : item.role}
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

            {/* Staff Role — only show for existing Staff users */}
            {item.role === 'Staff' && (
              <View style={styles.staffAssignRow}>
                 <TouchableOpacity
                    style={[styles.btn, { backgroundColor: colors.primary + '12', borderWidth: 1, borderColor: colors.primary + '30', flex: 1, alignItems: 'center' }]}
                    onPress={() => setStaffModalUser(item)}
                    activeOpacity={0.8}
                 >
                   <Text style={[styles.btnText, {color: colors.primary}]}>🔧 Change Staff Role</Text>
                 </TouchableOpacity>
              </View>
            )}

            {/* Admin Actions Block */}
            <View style={styles.advancedRow}>
               <TouchableOpacity 
                  style={[styles.btn, { backgroundColor: colors.surfaceHighlight, borderWidth: 1, borderColor: colors.border, flex: 1, alignItems: 'center' }]}
                  onPress={() => setDetailUser(item)}
                  activeOpacity={0.8}
               >
                 <Text style={[styles.btnText, {color: colors.primary}]}>👁️ View Details</Text>
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

          </TouchableOpacity>
        )}
      />
      {/* User Detail Modal */}
      <Modal visible={!!detailUser} transparent animationType="slide" onRequestClose={() => setDetailUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>👤 User Details</Text>
              {detailUser && (<>
                <View style={[styles.roleBadge, detailUser.role === 'Staff' ? styles.staffBg : detailUser.role === 'Car Owner' ? styles.ownerBg : styles.custBg, {alignSelf:'flex-start', marginTop:12, marginBottom:16}]}>
                  <Text style={[styles.roleText, detailUser.role === 'Staff' ? styles.staffColor : detailUser.role === 'Car Owner' ? styles.ownerColor : styles.custColor]}>
                    {detailUser.role === 'Staff' ? detailUser.staffRole || 'Staff' : detailUser.role}
                  </Text>
                </View>

                <Text style={styles.dlLabel}>Full Name</Text>
                <Text style={styles.dlValue}>{detailUser.name}</Text>

                <Text style={styles.dlLabel}>Email Address</Text>
                <Text style={styles.dlValue}>{detailUser.email}</Text>

                <Text style={styles.dlLabel}>Account Status</Text>
                <Text style={[styles.dlValue, {color: detailUser.status === 'active' ? colors.success : colors.error, fontWeight:'800'}]}>
                  {detailUser.status === 'active' ? '✅ Active' : '🚫 Suspended'}
                </Text>

                <Text style={styles.dlLabel}>Role</Text>
                <Text style={styles.dlValue}>{detailUser.role}</Text>

                {detailUser.role === 'Staff' && detailUser.staffRole && (<>
                  <Text style={styles.dlLabel}>Staff Role</Text>
                  <Text style={[styles.dlValue, {color: '#7C3AED', fontWeight:'800'}]}>🔧 {detailUser.staffRole}</Text>
                </>)}

                {detailUser.identity && (<>
                  <Text style={styles.dlLabel}>KYC Verification</Text>
                  <Text style={[styles.dlValue, {color: detailUser.identity.status === 'verified' ? colors.success : detailUser.identity.status === 'pending' ? colors.warning : colors.textSecondary, fontWeight:'800'}]}>
                    {detailUser.identity.status === 'verified' ? '✅ Verified' : detailUser.identity.status === 'pending' ? '⏳ Pending Review' : '❌ ' + (detailUser.identity.status || 'Unverified')}
                  </Text>
                </>)}

                <Text style={styles.dlLabel}>User ID</Text>
                <Text style={[styles.dlValue, {fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize:12}]}>{detailUser._id}</Text>

                {detailUser.createdAt && (<>
                  <Text style={styles.dlLabel}>Account Created</Text>
                  <Text style={styles.dlValue}>{new Date(detailUser.createdAt).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}</Text>
                </>)}
              </>)}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setDetailUser(null)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Staff Role Assignment Modal */}
      <Modal visible={!!staffModalUser} transparent animationType="slide" onRequestClose={() => setStaffModalUser(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔧 Assign Staff Role</Text>
            <Text style={styles.modalSubtitle}>for {staffModalUser?.name}</Text>
            
            <ScrollView style={{ maxHeight: 400, marginTop: 16 }}>
              {STAFF_ROLES.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleOption, staffModalUser?.staffRole === r.key && styles.roleOptionActive]}
                  onPress={() => assignStaffRole(staffModalUser._id, r.key)}
                  disabled={!!actionId}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleOptionEmoji}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleOptionTitle, staffModalUser?.staffRole === r.key && { color: colors.primary }]}>{r.key}</Text>
                    <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                  </View>
                  {staffModalUser?.staffRole === r.key && <Text style={{ color: colors.primary, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              ))}

              {/* Revoke option */}
              {staffModalUser?.role === 'Staff' && (
                <TouchableOpacity
                  style={[styles.roleOption, { borderColor: colors.error + '30' }]}
                  onPress={() => assignStaffRole(staffModalUser._id, null)}
                  disabled={!!actionId}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleOptionEmoji}>🚫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleOptionTitle, { color: colors.error }]}>Revoke Staff Role</Text>
                    <Text style={styles.roleOptionDesc}>Demote back to Customer</Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalCancel} onPress={() => setStaffModalUser(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Create Staff Member Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Create Staff Member</Text>
            <Text style={styles.modalSubtitle}>Create a new dedicated staff account</Text>

            <ScrollView style={{ marginTop: 16 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter email"
                placeholderTextColor={colors.textMuted}
                value={newStaffEmail}
                onChangeText={setNewStaffEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.textMuted}
                value={newStaffPassword}
                onChangeText={setNewStaffPassword}
                secureTextEntry
              />

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Select Staff Role</Text>
              {STAFF_ROLES.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleOption, newStaffRole === r.key && styles.roleOptionActive]}
                  onPress={() => setNewStaffRole(r.key)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.roleOptionEmoji}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleOptionTitle, newStaffRole === r.key && { color: colors.primary }]}>{r.key}</Text>
                    <Text style={styles.roleOptionDesc}>{r.desc}</Text>
                  </View>
                  {newStaffRole === r.key && <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.createBtn, (!newStaffName || !newStaffEmail || !newStaffPassword || !newStaffRole || actionId === 'creating-staff') && { opacity: 0.5 }]}
                onPress={createStaffMember}
                disabled={!newStaffName || !newStaffEmail || !newStaffPassword || !newStaffRole || actionId === 'creating-staff'}
                activeOpacity={0.8}
              >
                {actionId === 'creating-staff'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.createBtnText}>✅ Create Staff Member</Text>
                }
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.modalCancel} onPress={() => { setCreateModalVisible(false); setNewStaffRole(null); }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setCreateModalVisible(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>➕ Add Staff</Text>
      </TouchableOpacity>
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

  staffBg:       { backgroundColor: '#7C3AED15' },
  staffColor:    { color: '#7C3AED', fontWeight: '800', fontSize: 10, letterSpacing: 0.3, textTransform: 'uppercase' },
  staffAssignRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, marginTop: 16, paddingTop: 16 },

  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent:  { backgroundColor: C.surface, borderRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle:    { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginTop: 4 },
  modalCancel:   { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: C.surfaceHighlight, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  modalCancelText: { fontWeight: '800', color: C.textSecondary, fontSize: 15 },

  roleOption:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, marginBottom: 10, backgroundColor: C.surfaceHighlight },
  roleOptionActive:{ borderColor: C.primary, backgroundColor: C.primary + '08' },
  roleOptionEmoji: { fontSize: 28 },
  roleOptionTitle: { fontSize: 15, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  roleOptionDesc:  { fontSize: 12, fontWeight: '500', color: C.textSecondary, marginTop: 2 },

  inputLabel:    { fontSize: 13, fontWeight: '800', color: C.textSecondary, marginBottom: 6, marginTop: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  textInput:     { backgroundColor: C.surfaceHighlight, borderRadius: 12, padding: 14, fontSize: 15, color: C.textPrimary, borderWidth: 1.5, borderColor: C.border, fontWeight: '600' },
  
  createBtn:     { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  createBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16, letterSpacing: -0.3 },

  fab:           { position: 'absolute', bottom: 24, right: 20, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 50, elevation: 8, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabText:       { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: -0.3 },

  dlLabel:       { fontSize: 11, fontWeight: '800', color: C.textMuted, marginTop: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  dlValue:       { fontSize: 15, fontWeight: '600', color: C.textPrimary, marginTop: 4 },

  sectionRow:    { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  sectionTab:    { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: C.surfaceHighlight, alignItems: 'center', borderWidth: 1.5, borderColor: C.border },
  sectionTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  sectionTabTxt: { fontSize: 14, fontWeight: '800', color: C.textSecondary },
  sectionTabTxtActive: { color: '#FFFFFF' },
});
