import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl, ScrollView
} from 'react-native';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

// Sleek, minimal Stat Card
const StatCard = ({ title, value, icon, bgColor, textColor }) => (
  <View style={[styles.statCard, { backgroundColor: bgColor }]}>
    <View style={styles.statHeader}>
      <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.statIcon, { color: textColor }]}>{icon}</Text>
    </View>
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
  </View>
);

export default function OwnerDashboardScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  
  // Segmented Control State
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'upcoming', 'completed'

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/owner/bookings');
      setBookings(res.data);
    } catch {
      Alert.alert('Error', 'Could not load your bookings dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const [verificationModal, setVerificationModal] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const completeBooking = async () => {
    setVerifying(true);
    try {
      const res = await api.patch(`/api/owner/bookings/${verificationModal._id}/verify`);
      setBookings(prev => prev.map(b => b._id === verificationModal._id ? { ...b, status: res.data.status } : b));
      setActiveTab('completed');
      setVerificationModal(null);
      Alert.alert('Success', 'Vehicle return verified successfully.');
    } catch {
      Alert.alert('Error', 'Failed to verify booking return.');
    } finally {
      setVerifying(false);
    }
  };

  // ─── DATA PROCESSING & PARTITIONING ─────────────────────────────────────────
  const now = new Date();

  // Metrics
  const totalEarnings = bookings.filter(b => b.status === 'completed' || b.status === 'confirmed').reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const totalTrips = bookings.filter(b => b.status === 'completed').length;
  const activeRentalsCount = bookings.filter(b => ['confirmed', 'active', 'returning'].includes(b.status) && new Date(b.startDate) <= now && new Date(b.endDate) >= now).length;

  // Tab Arrays
  const activeBookingsArr = bookings.filter(b => b.status === 'active' || b.status === 'returning' || (b.status === 'confirmed' && new Date(b.startDate) <= now));
  const upcomingBookingsArr = bookings.filter(b => b.status === 'confirmed' && new Date(b.startDate) > now);
  const completedBookingsArr = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  // Decide what to show
  let displayData = [];
  if (activeTab === 'active') displayData = activeBookingsArr;
  if (activeTab === 'upcoming') displayData = upcomingBookingsArr;
  if (activeTab === 'completed') displayData = completedBookingsArr;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>Business Dashboard</Text>
      
      {/* Scrollable KPI Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <StatCard title="Total Revenue" value={`Rs. ${totalEarnings.toLocaleString()}`} icon="💰" bgColor="#1E293B" textColor="#FFFFFF" />
        <StatCard title="Active Rentals" value={activeRentalsCount.toString()} icon="🚗" bgColor="#3B82F6" textColor="#FFFFFF" />
        <StatCard title="Completed Trips" value={totalTrips.toString()} icon="✅" bgColor="#10B981" textColor="#FFFFFF" />
      </ScrollView>

      {/* Segmented Control */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active ({activeBookingsArr.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]} onPress={() => setActiveTab('upcoming')}>
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming ({upcomingBookingsArr.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'completed' && styles.tabBtnActive]} onPress={() => setActiveTab('completed')}>
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getEmptyStateMessage = () => {
    switch(activeTab) {
      case 'active': return 'No cars currently out on rent.';
      case 'upcoming': return 'No upcoming bookings scheduled.';
      case 'completed': return 'No finished trips yet.';
      default: return 'No bookings found.';
    }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={displayData}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏜️</Text>
            <Text style={styles.emptyText}>{getEmptyStateMessage()}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || 'Unknown Vehicle'}</Text>
                <Text style={styles.licenseText}>{item.vehicle?.licensePlate}</Text>
              </View>
              <View style={[styles.statusBadge, 
                item.status === 'completed' ? { backgroundColor: '#F1F5F9' } : 
                item.status === 'cancelled' ? { backgroundColor: '#FEE2E2' } : 
                item.status === 'returning' ? { backgroundColor: '#FEF3C7' } : 
                { backgroundColor: '#DCFCE7' }
              ]}>
                <Text style={[styles.badgeText, 
                  item.status === 'completed' ? { color: '#475569' } : 
                  item.status === 'cancelled' ? { color: '#DC2626' } : 
                  item.status === 'returning' ? { color: '#D97706' } : 
                  { color: '#16A34A' }
                ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <View style={styles.metaBox}>
              <View style={styles.metaRow}>
                <Text style={styles.detailTitle}>Renter:</Text>
                <Text style={styles.detailText}>{item.user?.name} ({item.user?.email})</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.detailTitle}>Dates:</Text>
                <Text style={styles.detailText}>{new Date(item.startDate).toLocaleDateString()} {'->'} {new Date(item.endDate).toLocaleDateString()}</Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 4 }]}>
                <Text style={styles.detailTitle}>Total Payout:</Text>
                <Text style={[styles.detailText, { color: '#059669', fontWeight: '800', fontSize: 16 }]}>Rs. {item.totalPrice}</Text>
              </View>
            </View>

            {activeTab === 'active' && item.status === 'returning' && (
              <View style={styles.actionRow}>
                <Text style={styles.actionWarning}>Customer has checked out and parked the vehicle.</Text>
                <TouchableOpacity
                  style={[styles.btn, {backgroundColor: '#F59E0B'}]}
                  onPress={() => setVerificationModal(item)}
                >
                  <Text style={styles.btnText}>Verify & Complete ✅</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'active' && item.status === 'active' && (
              <View style={styles.actionRow}>
                <Text style={[styles.upcomingNote, {backgroundColor: '#F0FDF4', color: '#16A34A'}]}>Trip is currently ongoing. Customer driving.</Text>
              </View>
            )}

            {activeTab === 'active' && item.status === 'confirmed' && (
              <View style={styles.actionRow}>
                <Text style={[styles.upcomingNote, {backgroundColor: '#FFFBEB', color: '#D97706'}]}>Waiting for customer to check-in securely.</Text>
              </View>
            )}
            
            {activeTab === 'upcoming' && (
              <View style={styles.actionRow}>
                <Text style={styles.upcomingNote}>Vehicle must be made available for pick-up securely.</Text>
              </View>
            )}
          </View>
        )}
      />

      {/* ─── Verification Modal ────────────────────────────────────── */}
      {verificationModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalBox}>
              <Text style={styles.modalTitle}>✅ Verify Return</Text>
              <Text style={styles.modalSub}>{verificationModal.vehicle?.makeAndModel}</Text>

              <Text style={styles.ratingLabel}>Final Odometer Reading</Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailValueText}>{verificationModal.checkOutDetails?.odometer || 'Not Provided'} km</Text>
              </View>

              <Text style={styles.ratingLabel}>Check-Out Condition Photo</Text>
              {verificationModal.checkOutDetails?.conditionPhoto ? (
                <Image source={{ uri: `${api.defaults.baseURL || 'http://localhost:5000'}${verificationModal.checkOutDetails.conditionPhoto}` }} style={styles.conditionImage} resizeMode="cover" />
              ) : (
                <View style={styles.noPhotoBox}><Text style={styles.noPhotoText}>No photo provided.</Text></View>
              )}

              <TouchableOpacity style={[styles.primaryActionBtn, {marginTop: 20}]} onPress={completeBooking} disabled={verifying}>
                {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionText}>Archive Trip & Close Booking</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setVerificationModal(null)} disabled={verifying}><Text style={styles.cancelBtnText}>Discard / Review Later</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#F8FAFC' },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:            { paddingBottom: 40 },
  headerContainer: { backgroundColor: '#fff', paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 4, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  headerTitle:     { fontSize: 28, fontWeight: '900', color: '#0F172A', paddingHorizontal: 20, paddingTop: 20, marginBottom: 16 },
  
  statsScroll:     { paddingHorizontal: 16, paddingBottom: 10 },
  statCard:        { width: 160, padding: 18, borderRadius: 20, marginRight: 12, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  statHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statValue:       { fontSize: 24, fontWeight: '900' },
  statTitle:       { fontSize: 14, fontWeight: '600', opacity: 0.9 },
  statIcon:        { fontSize: 18 },
  
  tabContainer:    { flexDirection: 'row', backgroundColor: '#F1F5F9', marginHorizontal: 20, marginTop: 24, borderRadius: 12, padding: 4 },
  tabBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive:    { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tabText:         { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive:   { color: PRIMARY, fontWeight: '800' },
  
  emptyContainer:  { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIcon:       { fontSize: 40, marginBottom: 12 },
  emptyText:       { color: '#94A3B8', fontSize: 16, fontWeight: '500' },

  card:            { backgroundColor: '#fff', marginHorizontal: 16, padding: 16, borderRadius: 20, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  vehicleName:     { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  licenseText:     { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  statusBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  badgeText:       { fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  
  metaBox:         { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  metaRow:         { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 8 },
  detailTitle:     { fontSize: 13, color: '#64748B', fontWeight: '600' },
  detailText:      { fontSize: 13, color: '#1E293B', fontWeight: '700' },
  
  actionRow:       { paddingTop: 16, marginTop: 4 },
  actionWarning:   { fontSize: 12, color: '#D97706', marginBottom: 10, fontWeight: '600', textAlign: 'center' },
  upcomingNote:    { fontSize: 13, color: '#3B82F6', fontWeight: '600', textAlign: 'center', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8 },
  btn:             { backgroundColor: PRIMARY, paddingVertical: 14, borderRadius: 12, width: '100%', alignItems: 'center', elevation: 2 },
  btnText:         { color: '#fff', fontWeight: '800', fontSize: 15 },
  
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle:      { fontSize: 24, fontWeight: '900', color: '#16A34A', marginBottom: 4 },
  modalSub:        { color: '#64748B', marginBottom: 20, fontWeight: '600' },
  ratingLabel:     { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  detailBox:       { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', padding: 16, borderRadius: 12, marginBottom: 20 },
  detailValueText: { fontSize: 18, fontWeight: '800', color: '#334155' },
  conditionImage:  { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  noPhotoBox:      { backgroundColor: '#F1F5F9', height: 100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  noPhotoText:     { color: '#94A3B8', fontWeight: '600' },
  primaryActionBtn:{ backgroundColor: '#10B981', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryActionText:{ color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn:       { marginTop: 12, alignItems: 'center', padding: 14 },
  cancelBtnText:   { color: '#64748B', fontWeight: '700' },
});
