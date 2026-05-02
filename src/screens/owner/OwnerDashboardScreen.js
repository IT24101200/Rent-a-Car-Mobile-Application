import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl, ScrollView, Platform, Image, StatusBar
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

import Card from '../../components/atoms/Card';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';




export default function OwnerDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Sleek, minimal Stat Card
  const StatCard = ({ title, value, iconName, color }) => (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIconCircle, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={iconName} size={22} color={color} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: C.textPrimary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: C.textSecondary }]}>{title}</Text>
    </View>
  );
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
  const [detailModal, setDetailModal] = useState(null);

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
    <View style={styles.greenHeader}>
      <Text style={styles.title}>Business Dashboard</Text>
      <Text style={styles.subtitle}>Track your fleet performance</Text>
      
      {/* Scrollable KPI Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
        <StatCard title="Total Revenue" value={`Rs. ${totalEarnings.toLocaleString()}`} iconName="cash-multiple" color={C.success} />
        <StatCard title="Active Rentals" value={activeRentalsCount.toString()} iconName="car-connected" color={C.primary} />
        <StatCard title="Completed Trips" value={totalTrips.toString()} iconName="check-circle-outline" color="#60A5FA" />
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerGradientStart} />
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
          <Card 
            pressable 
            onPress={() => setDetailModal(item)}
            style={{ marginHorizontal: 16, marginBottom: 16 }}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || 'Unknown Vehicle'}</Text>
                <Text style={styles.licenseText}>{item.vehicle?.licensePlate}</Text>
              </View>
              <Badge 
                label={item.status.toUpperCase()}
                variant={
                  item.status === 'completed' ? 'primary' : 
                  item.status === 'cancelled' ? 'error' : 
                  item.status === 'returning' ? 'warning' : 'success'
                }
              />
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
                <Text style={[styles.detailText, { color: C.success, fontWeight: '800', fontSize: 16 }]}>Rs. {item.totalPrice}</Text>
              </View>
              
              {/* Inject Odometer readings directly onto the card if present */}
              {(item.checkInDetails?.odometer || item.checkOutDetails?.odometer) && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                  
                  {item.checkInDetails?.odometer && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>Check-In Odo:</Text>
                      <Text style={[styles.detailText, { fontWeight: '700' }]}>{item.checkInDetails.odometer} km</Text>
                    </View>
                  )}

                  {item.checkOutDetails?.odometer && (
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <Text style={styles.detailTitle}>Return Odo:</Text>
                      <Text style={[styles.detailText, { fontWeight: '700' }]}>{item.checkOutDetails.odometer} km</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {activeTab === 'active' && item.status === 'returning' && (
              <View style={styles.actionRow}>
                <Text style={styles.actionWarning}>Customer has checked out and parked the vehicle.</Text>
                <Button 
                  label="Verify & Complete ✅"
                  onPress={() => setVerificationModal(item)}
                  style={{ backgroundColor: C.warning }}
                  textStyle={{ color: '#FFF' }}
                />
              </View>
            )}

            {activeTab === 'active' && item.status === 'active' && (
              <View style={styles.actionRow}>
                <Text style={[styles.upcomingNote, {backgroundColor: C.successBg, color: C.success}]}>Trip is currently ongoing. Customer driving.</Text>
              </View>
            )}

            {activeTab === 'active' && item.status === 'confirmed' && (
              <View style={styles.actionRow}>
                <Text style={[styles.upcomingNote, {backgroundColor: C.warningBg, color: C.warning}]}>Waiting for customer to check-in securely.</Text>
              </View>
            )}
            
            {activeTab === 'upcoming' && (
              <View style={styles.actionRow}>
                <Text style={styles.upcomingNote}>Vehicle must be made available for pick-up securely.</Text>
              </View>
            )}
          </Card>
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

              <Button 
                label="Archive Trip & Close Booking"
                onPress={completeBooking}
                loading={verifying}
                style={{ marginTop: 20 }}
              />
              <Button 
                label="Discard / Review Later"
                variant="ghost"
                onPress={() => setVerificationModal(null)}
                disabled={verifying}
                style={{ marginTop: 12 }}
                textStyle={{ color: C.textSecondary }}
              />
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ─── Detail Modal ─────────────────────────────────────── */}
      {detailModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '85%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>📋 Trip Details</Text>
                
                <Text style={styles.ratingLabel}>Vehicle</Text>
                <Text style={styles.modalSub}>{detailModal.vehicle?.makeAndModel || 'Unknown'} {detailModal.vehicle?.licensePlate ? `(${detailModal.vehicle.licensePlate})` : ''}</Text>

                <Text style={styles.ratingLabel}>Renter</Text>
                <Text style={styles.modalSub}>{detailModal.user?.name} — {detailModal.user?.email}</Text>

                <Text style={styles.ratingLabel}>Dates</Text>
                <Text style={styles.modalSub}>{new Date(detailModal.startDate).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})} → {new Date(detailModal.endDate).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})}</Text>

                <Text style={styles.ratingLabel}>Total Payout</Text>
                <Text style={[styles.modalSub, { color: C.success, fontWeight: '900', fontSize: 20 }]}>Rs. {(detailModal.totalPrice || 0).toLocaleString()}</Text>

                {detailModal.checkInDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-In Details</Text>
                    <Text style={styles.modalSub}>🕐 {new Date(detailModal.checkInDetails.time).toLocaleString()}</Text>
                    <Text style={styles.modalSub}>📟 Odometer: {detailModal.checkInDetails.odometer} km</Text>
                    {detailModal.checkInDetails.conditionPhoto && (
                      <View style={{marginTop: 8, marginBottom: 16}}>
                        <Text style={{fontSize: 12, color: C.textSecondary, marginBottom: 4}}>Check-In Photo:</Text>
                        <Image source={{ uri: `${api.defaults.baseURL || 'http://localhost:5000'}${detailModal.checkInDetails.conditionPhoto}` }} style={{width: 150, height: 100, borderRadius: 8, backgroundColor: C.surfaceHighlight}} resizeMode="cover" />
                      </View>
                    )}
                  </>
                )}

                {detailModal.checkOutDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-Out Details</Text>
                    <Text style={styles.modalSub}>🕐 {new Date(detailModal.checkOutDetails.time).toLocaleString()}</Text>
                    <Text style={styles.modalSub}>📟 Odometer: {detailModal.checkOutDetails.odometer} km</Text>
                    {detailModal.checkOutDetails.conditionPhoto && (
                      <View style={{marginTop: 8}}>
                        <Text style={{fontSize: 12, color: C.textSecondary, marginBottom: 4}}>Condition Photo:</Text>
                        <Image source={{ uri: `${api.defaults.baseURL || 'http://localhost:5000'}${detailModal.checkOutDetails.conditionPhoto}` }} style={{width: 150, height: 100, borderRadius: 8, backgroundColor: C.surfaceHighlight}} resizeMode="cover" />
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.ratingLabel}>Booking ID</Text>
                <Text style={[styles.modalSub, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]}>{detailModal._id}</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
              <Button 
                label="Close"
                onPress={() => setDetailModal(null)}
                style={{ marginTop: 10 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.background },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:            { paddingBottom: 40 },

  // ── Dark Premium Header ──
  greenHeader:     { backgroundColor: C.surface, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: 0 },
  title:           { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  subtitle:        { fontSize: 14, color: C.textSecondary, fontWeight: '600', marginTop: 4 },
  
  // ── Stat Cards ──
  statsScroll:     { paddingHorizontal: 16, paddingBottom: 10, marginTop: 20 },
  statCard:        { width: 160, padding: 18, borderRadius: 16, marginRight: 12, backgroundColor: C.surface, borderWidth: 1 },
  statHeader:      { marginBottom: 14 },
  statIconCircle:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue:       { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  statTitle:       { fontSize: 12, fontWeight: '700', marginTop: 4 },
  
  // ── Segmented Tabs ──
  tabContainer:    { flexDirection: 'row', backgroundColor: C.surfaceHighlight, marginTop: 20, borderRadius: 12, padding: 4 },
  tabBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive:    { backgroundColor: C.primary },
  tabText:         { fontSize: 13, fontWeight: '600', color: C.textMuted },
  tabTextActive:   { color: C.textOnPrimary, fontWeight: '800' },
  
  // ── Empty State ──
  emptyContainer:  { alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 20 },
  emptyIcon:       { fontSize: 40, marginBottom: 12 },
  emptyText:       { color: C.textMuted, fontSize: 16, fontWeight: '500' },

  // ── Booking Cards ──
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  vehicleName:     { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  licenseText:     { fontSize: 13, color: C.textMuted, fontWeight: '600', marginTop: 2 },
  
  metaBox:         { backgroundColor: C.background, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  metaRow:         { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 8, marginBottom: 8 },
  detailTitle:     { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  detailText:      { fontSize: 13, color: C.textPrimary, fontWeight: '700' },
  
  actionRow:       { paddingTop: 16, marginTop: 4 },
  actionWarning:   { fontSize: 12, color: C.warning, marginBottom: 10, fontWeight: '600', textAlign: 'center' },
  upcomingNote:    { fontSize: 13, color: C.primary, fontWeight: '600', textAlign: 'center', backgroundColor: C.primaryLight, padding: 10, borderRadius: 10 },
  
  // ── Modal ──
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40, borderWidth: 1, borderColor: C.border, borderBottomWidth: 0 },
  modalTitle:      { fontSize: 24, fontWeight: '900', color: C.primary, marginBottom: 4 },
  modalSub:        { color: C.textSecondary, marginBottom: 20, fontWeight: '600' },
  ratingLabel:     { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  detailBox:       { backgroundColor: C.background, borderWidth: 1, borderColor: C.border, padding: 16, borderRadius: 12, marginBottom: 20 },
  detailValueText: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  conditionImage:  { width: '100%', height: 200, borderRadius: 12, marginBottom: 10 },
  noPhotoBox:      { backgroundColor: C.background, height: 100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  noPhotoText:     { color: C.textSecondary, fontWeight: '600' },
});
