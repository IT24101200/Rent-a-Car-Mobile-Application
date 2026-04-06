import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function UserManagementScreen() {
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

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} />}
        contentContainerStyle={styles.list}
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
              <Text style={[styles.statusText, item.status === 'suspended' ? { color: '#DC2626' } : { color: '#16A34A' }]}>
                Status: {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
              <TouchableOpacity
                style={[styles.btn, item.status === 'suspended' ? styles.btnActivate : styles.btnSuspend, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => toggleStatus(item._id, item.status)}
                disabled={actionId === item._id}
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
                <Text style={styles.kycTitle}>KYC Identity: <Text style={[styles.kycStatus, { color: item.identity?.status === 'verified' ? '#16A34A' : item.identity?.status === 'pending' ? '#D97706' : '#64748B'}]}>{item.identity?.status?.toUpperCase() || 'UNVERIFIED'}</Text></Text>
                
                {item.identity?.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TouchableOpacity 
                      style={[styles.btn, { backgroundColor: '#10B981', flex: 1, alignItems: 'center' }]} 
                      onPress={() => toggleKYC(item._id, 'verified')}
                    >
                      <Text style={styles.btnText}>Approve Docs</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.btn, { backgroundColor: '#EF4444', flex: 1, alignItems: 'center' }]} 
                      onPress={() => toggleKYC(item._id, 'rejected')}
                    >
                      <Text style={styles.btnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F8FAFC' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  cardSuspended: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  kycRow:        { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  kycTitle:      { fontSize: 13, fontWeight: '600', color: '#475569' },
  kycStatus:     { fontWeight: '800' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name:          { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
  detail:        { fontSize: 14, color: '#64748B', marginBottom: 16 },
  roleBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ownerBg:       { backgroundColor: '#FEF3C7' }, ownerColor: { color: '#B45309', fontWeight: '700', fontSize: 12 },
  custBg:        { backgroundColor: '#F1F5F9' }, custColor: { color: '#475569', fontWeight: '700', fontSize: 12 },
  actionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  statusText:    { fontWeight: '700', fontSize: 14 },
  btn:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnSuspend:    { backgroundColor: '#DC2626' },
  btnActivate:   { backgroundColor: '#16A34A' },
  btnText:       { color: '#fff', fontWeight: '700' }
});
