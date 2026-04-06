import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl, TextInput, Modal, ScrollView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../../api/api';

const PRIMARY = '#1E3A8A';

const STATUS_COLOR = {
  confirmed: { bg: '#DBEAFE', text: '#2563EB', label: '✅ Confirmed' },
  active:    { bg: '#DCFCE7', text: '#16A34A', label: '🚗 Active Trip' },
  returning: { bg: '#FEF3C7', text: '#D97706', label: '⏳ Verifying Return' },
  pending:   { bg: '#FEF3C7', text: '#92400E', label: '⏳ Pending'   },
  cancelled: { bg: '#FEE2E2', text: '#DC2626', label: '❌ Cancelled'  },
  completed: { bg: '#F1F5F9', text: '#475569', label: '🔒 Completed'  },
};

export default function MyBookingsScreen() {
  const [bookings,   setBookings]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  // Tab State
  const [activeTab, setActiveTab] = useState('upcoming'); // 'active', 'upcoming', 'history'

  // Feedback Modal State
  const [modal,      setModal]      = useState(null);
  const [feedback,   setFeedback]   = useState('');
  const [rating,     setRating]     = useState(5);
  const [submitting, setSubmitting] = useState(false);

  // Reschedule Modal State
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newStartDate,    setNewStartDate]    = useState(new Date());
  const [newEndDate,      setNewEndDate]      = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker,   setShowEndTimePicker]   = useState(false);
  const [rescheduling,    setRescheduling]    = useState(false);

  // Accountability Modal (Check-in / Check-out)
  const [accountabilityModal, setAccountabilityModal] = useState(null); // booking
  const [actionType, setActionType] = useState(null); // 'checkin' | 'checkout'
  const [odometer, setOdometer] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [processingState, setProcessingState] = useState(false);


  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/bookings/my');
      setBookings(res.data);
    } catch {
      Alert.alert('Error', 'Could not load your bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // ── Data Partitioning ─────────────────────────────────────────────
  const upcomingBookingsArr = bookings.filter(b => b.status === 'confirmed');
  const activeBookingsArr = bookings.filter(b => b.status === 'active' || b.status === 'returning');
  const historyBookingsArr = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  let displayData = [];
  if (activeTab === 'active') displayData = activeBookingsArr;
  if (activeTab === 'upcoming') displayData = upcomingBookingsArr;
  if (activeTab === 'history') displayData = historyBookingsArr;

  // ── Actions ───────────────────────────────────────────────────────
  const cancelBooking = (bookingId) => {
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep It', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          setCancelling(bookingId);
          try {
            await api.patch(`/api/bookings/${bookingId}/cancel`);
            setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
            setActiveTab('history');
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Could not cancel booking.');
          } finally {
            setCancelling(null);
          }
      }}
    ]);
  };

  const openReschedule = (booking) => {
    setRescheduleModal(booking);
    setNewStartDate(new Date(booking.startDate));
    setNewEndDate(new Date(booking.endDate));
  };

  const submitReschedule = async () => {
    setRescheduling(true);
    const msDiff = newEndDate.getTime() - newStartDate.getTime();
    const days = Math.ceil(msDiff / (1000 * 3600 * 24));
    
    if (days <= 0) {
      Alert.alert('Invalid Dates', 'Drop-off date/time must be strictly after pick-up date/time.');
      setRescheduling(false);
      return;
    }

    const pricePerDay = rescheduleModal?.vehicle?.pricePerDay || 0;
    const totalPrice = days * pricePerDay;

    try {
      const res = await api.patch(`/api/bookings/${rescheduleModal._id}/reschedule`, {
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
        totalPrice
      });
      setBookings(prev => prev.map(b => b._id === rescheduleModal._id ? { ...res.data, vehicle: rescheduleModal.vehicle } : b));
      Alert.alert('Success!', 'Your booking has been rescheduled.', [{ text: 'Great', onPress: () => setRescheduleModal(null) }]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not reschedule booking.');
    } finally {
      setRescheduling(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedback.trim()) { Alert.alert('Validation', 'Please write your feedback.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/feedback', { bookingId: modal._id, rating, comment: feedback.trim() });
      Alert.alert('Thank You!', 'Your feedback has been submitted.', [{ text: 'OK', onPress: () => { setModal(null); setFeedback(''); setRating(5); } }]);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Accountability Flow ──────────────────────────────────────────
  const openAccountability = (booking, type) => {
    setAccountabilityModal(booking);
    setActionType(type);
    setOdometer('');
    setPhotoUri(null);
  }

  const pickConditionPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const submitAccountability = async () => {
    if (!odometer || isNaN(odometer)) return Alert.alert('Invalid Input', 'Please enter a valid numeric odometer reading.');
    if (!photoUri) return Alert.alert('Photo Required', 'You must upload a dashboard/condition photo.');

    setProcessingState(true);
    const formData = new FormData();
    formData.append('odometer', odometer);
    
    const uriParts = photoUri.split('.');
    const fileType = uriParts[uriParts.length - 1];
    formData.append('conditionPhoto', { uri: photoUri, name: `condition_${Date.now()}.${fileType}`, type: `image/${fileType}` });

    try {
      const endpoint = actionType === 'checkin' ? `/api/bookings/${accountabilityModal._id}/checkin` : `/api/bookings/${accountabilityModal._id}/checkout`;
      const res = await api.patch(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      setBookings(prev => prev.map(b => b._id === accountabilityModal._id ? { ...res.data, vehicle: accountabilityModal.vehicle } : b));
      if (actionType === 'checkin') setActiveTab('active');
      setAccountabilityModal(null);
      Alert.alert('Success', actionType === 'checkin' ? 'You are checked in! Safe travels.' : 'You have dropped off the car successfully!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not complete process.');
    } finally {
      setProcessingState(false);
    }
  };

  // ── Renders ───────────────────────────────────────────────────────
  const renderHeader = () => (
    <View style={styles.headerBox}>
      <Text style={styles.title}>My Trips</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active ({activeBookingsArr.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]} onPress={() => setActiveTab('upcoming')}>
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming ({upcomingBookingsArr.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'active': return 'You have no trips currently underway.';
      case 'upcoming': return 'No future trips scheduled.';
      case 'history': return 'No past trips to show.';
      default: return 'No bookings found.';
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;
  }

  let newDays = 0;
  if (rescheduleModal) newDays = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 3600 * 24));
  const livePrice = newDays > 0 && rescheduleModal ? newDays * rescheduleModal.vehicle.pricePerDay : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={displayData}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} colors={[PRIMARY]} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>{getEmptyMessage()}</Text>
            <Text style={styles.emptySub}>Browse cars to start your next adventure.</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sc = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
          
          const bookingStart = new Date(item.startDate);
          const timeToStartMs = bookingStart.getTime() - Date.now();
          const canCheckIn = item.status === 'confirmed' && timeToStartMs <= (30 * 60 * 1000); // within 30 mins

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {item.vehicle?.imageUrl ? (
                  <Image source={{ uri: `${BASE_URL}${item.vehicle?.imageUrl}` }} style={styles.vehicleImg} />
                ) : (
                  <View style={styles.vehicleImgPlaceholder}><Text style={{fontSize: 24}}>🚗</Text></View>
                )}
                <View style={{flex: 1, marginLeft: 12}}>
                  <Text style={styles.carName}>{item.vehicle?.makeAndModel || 'Vehicle'}</Text>
                  <Text style={styles.licensePlate}>{item.vehicle?.licensePlate}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
                </View>
              </View>
              
              <View style={styles.metaRow}>
                <Text style={styles.detailTitle}>Dates:</Text>
                <Text style={styles.detailVal}>{new Date(item.startDate).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})} → {new Date(item.endDate).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</Text>
              </View>
              <View style={[styles.metaRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 4 }]}>
                <Text style={styles.detailTitle}>Total Price:</Text>
                <Text style={styles.priceVal}>Rs. {item.totalPrice?.toLocaleString()}</Text>
              </View>

              {/* Action Buttons for UPCOMING */}
              {activeTab === 'upcoming' && item.status === 'confirmed' && (
                <View style={styles.actionGrid}>
                  {canCheckIn ? (
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => openAccountability(item, 'checkin')}>
                      <Text style={styles.primaryActionText}>🔑 Start Trip (Check-In)</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.rescheduleBtn, cancelling === item._id && {opacity: 0.5}]} onPress={() => openReschedule(item)} disabled={cancelling === item._id}>
                        <Text style={styles.rescheduleText}>📅 Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cancelTripBtn, cancelling === item._id && {opacity: 0.5}]} onPress={() => cancelBooking(item._id)} disabled={cancelling === item._id}>
                        {cancelling === item._id ? <ActivityIndicator size="small" color="#DC2626"/> : <Text style={styles.cancelTripText}>❌ Cancel</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* Action Buttons for ACTIVE */}
              {activeTab === 'active' && item.status === 'active' && (
               <View style={styles.actionRow}>
                 <TouchableOpacity style={styles.primaryActionBtn} onPress={() => openAccountability(item, 'checkout')}>
                    <Text style={styles.primaryActionText}>🏁 End Trip (Check-Out)</Text>
                 </TouchableOpacity>
               </View>
              )}
              {activeTab === 'active' && item.status === 'returning' && (
               <View style={styles.actionRow}>
                 <View style={styles.activePill}>
                   <Text style={styles.activePillText}>Success! Waiting for owner verification.</Text>
                 </View>
               </View>
              )}

              {/* Action Buttons for HISTORY */}
              {item.status === 'completed' && activeTab === 'history' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.feedbackBtn} onPress={() => setModal(item)}>
                    <Text style={styles.feedbackBtnText}>⭐ Leave Feedback</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* ─── Feedback Modal ─────────────────────────────────── */}
      <Modal visible={!!modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalBox}>
            <Text style={styles.modalTitle}>⭐ Feedback</Text>
            <Text style={styles.modalSub}>{modal?.vehicle?.makeAndModel}</Text>

            <Text style={styles.ratingLabel}>Rate Your Experience</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={[styles.star, { color: n <= rating ? '#F59E0B' : '#D1D5DB' }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>Comments</Text>
            <TextInput
              style={styles.feedbackInput} placeholder="How was the ride? Anything to note?" placeholderTextColor="#94A3B8"
              multiline numberOfLines={4} value={feedback} onChangeText={setFeedback}
            />

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submitFeedback} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Feedback</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Accountability (Checkin/Checkout) Modal ───────── */}
      {accountabilityModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalBox}>
              <Text style={styles.modalTitle}>{actionType === 'checkin' ? '🔑 Start Trip' : '🏁 End Trip'}</Text>
              <Text style={styles.modalSub}>Record vehicle condition to protect yourself.</Text>

              <Text style={styles.ratingLabel}>Current Odometer (km)</Text>
              <TextInput style={[styles.feedbackInput, {minHeight:50, marginBottom:16}]} keyboardType="numeric" placeholder="e.g. 45200" value={odometer} onChangeText={setOdometer} />

              <Text style={styles.ratingLabel}>Dashboard / Condition Photo</Text>
              <TouchableOpacity style={styles.photoUploadBtn} onPress={pickConditionPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 150, borderRadius: 10 }} resizeMode="cover" />
                ) : (
                  <View style={{alignItems:'center'}}>
                    <Text style={{fontSize: 32, marginBottom:8}}>📸</Text>
                    <Text style={{color:'#64748B'}}>Tap to take/upload photo</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.primaryActionBtn, {marginTop: 20}]} onPress={submitAccountability} disabled={processingState}>
                {processingState ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionText}>{actionType === 'checkin' ? 'Submit Check-In' : 'Submit Check-Out'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAccountabilityModal(null)} disabled={processingState}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ─── Reschedule Modal ───────────────────────────────── */}
      {rescheduleModal && (
        <Modal visible animationType="fade" transparent>
          {/* Similar format as before but wrapped safely */}
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { paddingBottom: 20 }]}>
              <Text style={styles.modalTitle}>📅 Reschedule Trip</Text>
              <Text style={styles.modalSub}>{rescheduleModal.vehicle?.makeAndModel}</Text>

              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerCol}>
                  <Text style={styles.datePickerLabel}>Pick-up</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker value={newStartDate} mode="datetime" display="default" minimumDate={new Date()} onChange={(e, d) => d && setNewStartDate(d)} />
                  ) : (
                    <View style={{flexDirection: 'row', gap: 5}}>
                      <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowStartPicker(true)}><Text style={styles.dateBtnText}>{newStartDate.toLocaleDateString()}</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowStartTimePicker(true)}><Text style={styles.dateBtnText}>{newStartDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.datePickerCol}>
                  <Text style={styles.datePickerLabel}>Drop-off</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker value={newEndDate} mode="datetime" display="default" minimumDate={newStartDate} onChange={(e, d) => d && setNewEndDate(d)} />
                  ) : (
                    <View style={{flexDirection: 'row', gap: 5}}>
                      <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowEndPicker(true)}><Text style={styles.dateBtnText}>{newEndDate.toLocaleDateString()}</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowEndTimePicker(true)}><Text style={styles.dateBtnText}>{newEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Android Pickers */}
              {showStartPicker && <DateTimePicker value={newStartDate} mode="date" display="default" minimumDate={new Date()} onChange={(e, d) => { setShowStartPicker(false); if(d) { const nd = new Date(newStartDate); nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setNewStartDate(nd); } }} />}
              {showStartTimePicker && <DateTimePicker value={newStartDate} mode="time" display="default" onChange={(e, d) => { setShowStartTimePicker(false); if(d) { const nd = new Date(newStartDate); nd.setHours(d.getHours(), d.getMinutes()); setNewStartDate(nd); } }} />}
              {showEndPicker && <DateTimePicker value={newEndDate} mode="date" display="default" minimumDate={newStartDate} onChange={(e, d) => { setShowEndPicker(false); if(d) { const nd = new Date(newEndDate); nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setNewEndDate(nd); } }} />}
              {showEndTimePicker && <DateTimePicker value={newEndDate} mode="time" display="default" onChange={(e, d) => { setShowEndTimePicker(false); if(d) { const nd = new Date(newEndDate); nd.setHours(d.getHours(), d.getMinutes()); setNewEndDate(nd); } }} />}

              <View style={styles.rescheduleMetaBox}>
                <View style={[styles.metaRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 4 }]}>
                  <Text style={styles.detailTitle}>New Total</Text>
                  <Text style={styles.priceVal}>Rs. {livePrice.toLocaleString()}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, marginTop: 0 }]} onPress={() => setRescheduleModal(null)}><Text style={styles.cancelBtnText}>Nevermind</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 2, padding: 14, marginTop: 0 }, (newDays <= 0 || rescheduling) && { opacity: 0.6 }]} onPress={submitReschedule} disabled={newDays <= 0 || rescheduling}>
                  {rescheduling ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Confirm Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#F8FAFC' },
  list:            { paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBox:       { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 20 },
  title:           { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 16 },
  tabContainer:    { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 },
  tabBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabBtnActive:    { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  tabText:         { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive:   { color: PRIMARY, fontWeight: '800' },
  emptyBox:        { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyEmoji:      { fontSize: 50, marginBottom: 12 },
  emptyTitle:      { fontSize: 18, fontWeight: '800', color: '#334155' },
  emptySub:        { color: '#64748B', marginTop: 6, textAlign: 'center', fontWeight: '500' },
  card:            { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginHorizontal: 16, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  vehicleImg:      { width: 60, height: 60, borderRadius: 12 },
  vehicleImgPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  carName:         { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  licensePlate:    { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 2 },
  badge:           { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginLeft: 8 },
  badgeText:       { fontSize: 11, fontWeight: '800' },
  metaRow:         { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8, marginBottom: 8, alignItems: 'center' },
  detailTitle:     { color: '#64748B', fontSize: 13, fontWeight: '600' },
  detailVal:       { color: '#1E293B', fontSize: 13, fontWeight: '700' },
  priceVal:        { color: '#059669', fontSize: 18, fontWeight: '800' },
  actionRow:       { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14, marginTop: 12 },
  actionGrid:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14, marginTop: 12, gap: 10 },
  primaryActionBtn:{ flex: 1, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryActionText:{ color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelTripBtn:   { flex: 1, backgroundColor: '#FEE2E2', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  cancelTripText:  { color: '#DC2626', fontWeight: '800', fontSize: 14 },
  rescheduleBtn:   { flex: 1.5, backgroundColor: '#EFF6FF', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rescheduleText:  { color: PRIMARY, fontWeight: '800', fontSize: 14 },
  feedbackBtn:     { backgroundColor: '#FEF3C7', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  feedbackBtnText: { color: '#92400E', fontWeight: '800', fontSize: 14 },
  activePill:      { backgroundColor: '#F0FDF4', paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#86EFAC' },
  activePillText:  { color: '#16A34A', fontWeight: '800', fontSize: 13 },
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle:      { fontSize: 24, fontWeight: '900', color: PRIMARY, marginBottom: 4 },
  modalSub:        { color: '#64748B', marginBottom: 20, fontWeight: '600' },
  ratingLabel:     { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 8 },
  stars:           { flexDirection: 'row', gap: 8, marginBottom: 24 },
  star:            { fontSize: 36 },
  feedbackInput:   { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, fontSize: 15, color: '#0F172A', minHeight: 100, textAlignVertical: 'top', marginBottom: 24, backgroundColor: '#F8FAFC' },
  submitBtn:       { backgroundColor: PRIMARY, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn:       { marginTop: 12, alignItems: 'center', padding: 14 },
  cancelBtnText:   { color: '#64748B', fontWeight: '700' },
  photoUploadBtn:  { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', borderRadius: 12, padding: 24, alignItems: 'center', justifyContent: 'center' },
  datePickerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  datePickerCol:   { width: '48%' },
  datePickerLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 6 },
  dateBtn:         { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  dateBtnText:     { fontSize: 14, color: '#0F172A', fontWeight: '600' },
  rescheduleMetaBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
});
