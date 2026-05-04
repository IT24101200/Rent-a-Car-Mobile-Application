import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl, TextInput, Modal, ScrollView, Platform, StatusBar
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import api, { BASE_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';



export default function MyBookingsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const STATUS_COLOR = {
    confirmed: { bg: colors.info + '20', text: colors.info, label: 'Confirmed' },
    active:    { bg: colors.success + '20', text: colors.success, label: 'Active Trip' },
    returning: { bg: colors.warning + '20', text: colors.warning, label: 'Verifying Return' },
    pending:   { bg: colors.warning + '20', text: colors.warning, label: 'Pending'   },
    cancelled: { bg: colors.error + '20', text: colors.error, label: 'Cancelled'  },
    completed: { bg: colors.surfaceHighlight, text: colors.textSecondary, label: 'Completed'  },
  };

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
  const [feedbackPhotos, setFeedbackPhotos] = useState([]);

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

  // Extend Modal
  const [extendModal, setExtendModal] = useState(null);
  const [extendEndDate, setExtendEndDate] = useState(new Date());
  const [showExtendPicker, setShowExtendPicker] = useState(false);
  const [showExtendTimePicker, setShowExtendTimePicker] = useState(false);
  const [extending, setExtending] = useState(false);

  // Detail Modal
  const [detailModal, setDetailModal] = useState(null);

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
  const upcomingBookingsArr = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending');
  const activeBookingsArr = bookings.filter(b => b.status === 'active' || b.status === 'returning');
  const historyBookingsArr = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled');

  let displayData = [];
  if (activeTab === 'active') displayData = activeBookingsArr;
  if (activeTab === 'upcoming') displayData = upcomingBookingsArr;
  if (activeTab === 'history') displayData = historyBookingsArr;

  // ── Actions ───────────────────────────────────────────────────────
  
  // Cancel Booking: Asks for confirmation, then hits the PATCH /cancel route
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

  // Reschedule Booking: Sends the new dates to the backend. The backend will re-check overlaps.
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

  // Submit Feedback: First posts the JSON feedback, then sequentially uploads photos via Multer
  const submitFeedback = async () => {
    if (!feedback.trim()) { Alert.alert('Validation', 'Please write your feedback.'); return; }
    setSubmitting(true);
    try {
      // Step 1: Create feedback with JSON
      const res = await api.post('/api/feedback', { bookingId: modal._id, rating, comment: feedback.trim() });
      const feedbackId = res.data._id;

      // Step 2: Upload photos one by one
      for (const photoUri of feedbackPhotos) {
        const formData = new FormData();
        const ext = photoUri.split('.').pop().toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
        formData.append('photo', { uri: photoUri, name: `review_${Date.now()}.${ext}`, type: mime });
        await api.post(`/api/feedback/${feedbackId}/upload-photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }

      Alert.alert('Thank You!', 'Your feedback has been submitted.', [{ text: 'OK', onPress: () => { setModal(null); setFeedback(''); setRating(5); setFeedbackPhotos([]); } }]);
    } catch {
      Alert.alert('Error', 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Accountability Flow ──────────────────────────────────────────
  
  // Prepares the modal for either checking in (start trip) or checking out (end trip)
  const openAccountability = (booking, type) => {
    setAccountabilityModal(booking);
    setActionType(type);
    setOdometer('');
    setPhotoUri(null);
  }

  const pickConditionPhoto = () => {
    Alert.alert(
      'Upload Odometer Photo',
      'Choose a method to upload the odometer photo.',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera permissions are required to take a live photo.');
            
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
            if (!result.canceled) setPhotoUri(result.assets[0].uri);
          }
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
            if (!result.canceled) setPhotoUri(result.assets[0].uri);
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Submits the check-in or check-out details. Constructs a FormData object
  // to send the odometer integer and conditionPhoto image file to the respective PATCH route.
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

  const openExtend = (booking) => {
    setExtendModal(booking);
    setExtendEndDate(new Date(booking.endDate));
  };

  // Submit Extension: Proactively pushes the end date further out.
  // Backend will charge extra and check if the new timeframe overlaps another booking.
  const submitExtend = async () => {
    if (extendEndDate <= new Date(extendModal.endDate)) {
      return Alert.alert('Invalid Date', 'The new end date must be after your current end date.');
    }
    setExtending(true);
    try {
      const res = await api.patch(`/api/bookings/${extendModal._id}/extend`, { newEndDate: extendEndDate });
      setBookings(prev => prev.map(b => b._id === extendModal._id ? res.data.booking : b));
      setExtendModal(null);
      Alert.alert('Success', res.data.message);
    } catch (err) {
      Alert.alert('Extension Failed', err.response?.data?.message || 'Failed to extend booking.');
    } finally {
      setExtending(false);
    }
  };

  // ── Renders ───────────────────────────────────────────────────────
  const renderHeader = () => {
    return (
      <LinearGradient colors={[colors.headerGradientStart, colors.headerGradientEnd || colors.primary]} style={styles.headerBox}>
        <Text style={styles.title}>My Trips</Text>

        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.tabBtnActive]} onPress={() => setActiveTab('active')}>
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>Active ({activeBookingsArr.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'upcoming' && styles.tabBtnActive]} onPress={() => setActiveTab('upcoming')}>
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>Upcoming ({upcomingBookingsArr.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
          </TouchableOpacity>
        </BlurView>
      </LinearGradient>
    );
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'active': return 'You have no trips currently underway.';
      case 'upcoming': return 'No future trips scheduled.';
      case 'history': return 'No past trips to show.';
      default: return 'No bookings found.';
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  let newDays = 0;
  if (rescheduleModal) newDays = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 3600 * 24));
  const livePrice = newDays > 0 && rescheduleModal ? newDays * rescheduleModal.vehicle.pricePerDay : 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={displayData}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} colors={[colors.primary]} tintColor={colors.primary} />}
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
            <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => setDetailModal(item)}>
              <View>
                {item.vehicle?.imageUrl ? (
                  <Image source={{ uri: `${BASE_URL}${item.vehicle?.imageUrl}` }} style={styles.vehicleImg} resizeMode="cover" />
                ) : (
                  <View style={[styles.vehicleImg, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}><Text style={{fontSize: 40}}>🚘</Text></View>
                )}
                <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={styles.floatingBadge}>
                  <View style={[styles.statusDot, { backgroundColor: sc.text }]} />
                  <Text style={[styles.badgeText, { color: sc.text }]}>{sc.label}</Text>
                </BlurView>
              </View>

              <View style={styles.cardContent}>
                <View style={styles.titleRow}>
                  <Text style={styles.carName} numberOfLines={1}>{item.vehicle?.makeAndModel || 'Vehicle'}</Text>
                  <Text style={styles.licensePlate} numberOfLines={1}>{item.vehicle?.licensePlate || 'N/A'}</Text>
                </View>
              
                <View style={[styles.metaRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <Text style={styles.detailTitle}>Rental Period</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 10 }}>
                    <Text style={[styles.detailVal, { fontSize: 12 }]}>{new Date(item.startDate).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>→</Text>
                    <Text style={[styles.detailVal, { fontSize: 12 }]}>{new Date(item.endDate).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</Text>
                  </View>
                </View>
              
              <View style={[styles.metaRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 4 }]}>
                <Text style={styles.detailTitle}>Total Cost</Text>
                <Text style={styles.priceVal}>Rs. {item.totalPrice?.toLocaleString()}</Text>
              </View>

              {item.status === 'cancelled' && item.cancellationReason && (
                <View style={styles.systemNotice}>
                  <Text style={styles.systemNoticeTitle}>System Notice:</Text>
                  <Text style={styles.systemNoticeText}>{item.cancellationReason}</Text>
                </View>
              )}

              {/* Action Buttons for UPCOMING */}
              {activeTab === 'upcoming' && (item.status === 'confirmed' || item.status === 'pending') && (
                <View style={styles.actionGrid}>
                  {canCheckIn ? (
                    <TouchableOpacity style={styles.primaryActionBtn} onPress={() => openAccountability(item, 'checkin')}>
                      <Text style={styles.primaryActionText}>Start Trip (Check-In)</Text>
                    </TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.rescheduleBtn, cancelling === item._id && {opacity: 0.5}]} onPress={() => openReschedule(item)} disabled={cancelling === item._id}>
                        <Text style={styles.rescheduleText}>Reschedule</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.cancelTripBtn, cancelling === item._id && {opacity: 0.5}]} onPress={() => cancelBooking(item._id)} disabled={cancelling === item._id}>
                        {cancelling === item._id ? <ActivityIndicator size="small" color={colors.error}/> : <Text style={styles.cancelTripText}>Cancel</Text>}
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {/* Action Buttons for ACTIVE */}
              {activeTab === 'active' && item.status === 'active' && (
               <View style={styles.actionRow}>
                 <TouchableOpacity style={[styles.primaryActionBtn, { flex: 2 }]} onPress={() => openAccountability(item, 'checkout')}>
                    <Text style={styles.primaryActionText}>End Trip</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.rescheduleBtn, { flex: 1, marginLeft: 10 }]} onPress={() => openExtend(item)}>
                    <Text style={styles.rescheduleText}>Extend</Text>
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
                  {!item.hasReviewed ? (
                    <TouchableOpacity style={styles.feedbackBtn} onPress={() => { setModal(item); setRating(5); setFeedback(''); setFeedbackPhotos([]); }}>
                      <Text style={styles.feedbackBtnText}>Leave Feedback</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.activePill, {backgroundColor: colors.surfaceHighlight}]}>
                      <Text style={[styles.activePillText, {color: colors.textSecondary}]}>Feedback Submitted ⭐</Text>
                    </View>
                  )}
                </View>
              )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── Detail Modal ─────────────────────────────────────── */}
      {detailModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { maxHeight: '85%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>📋 Trip Details</Text>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLOR[detailModal.status] || STATUS_COLOR.pending).bg, alignSelf: 'flex-start', marginBottom: 16 }]}>
                  <Text style={[styles.badgeText, { color: (STATUS_COLOR[detailModal.status] || STATUS_COLOR.pending).text }]}>
                    {detailModal.status.toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.ratingLabel}>Vehicle</Text>
                <Text style={styles.detailValueText}>{detailModal.vehicle?.makeAndModel || 'Unknown'} {detailModal.vehicle?.licensePlate ? `(${detailModal.vehicle.licensePlate})` : ''}</Text>

                <Text style={styles.ratingLabel}>Dates</Text>
                <Text style={styles.detailValueText}>{new Date(detailModal.startDate).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})} → {new Date(detailModal.endDate).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})}</Text>

                <Text style={styles.ratingLabel}>Total Price</Text>
                <Text style={[styles.detailValueText, { color: colors.success, fontWeight: '900', fontSize: 20 }]}>Rs. {(detailModal.totalPrice || 0).toLocaleString()}</Text>

                {detailModal.additionalCharges > 0 && (
                  <View style={{ backgroundColor: colors.warning+'15', padding: 12, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: colors.warning }}>
                    <Text style={[styles.ratingLabel, { marginTop: 0, color: colors.warning }]}>Outstanding Extra Balance</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.warning }}>Rs. {detailModal.additionalCharges.toLocaleString()}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>This includes late return penalties or extension fees.</Text>
                  </View>
                )}

                {detailModal.cancellationReason && (
                  <>
                    <Text style={styles.ratingLabel}>Cancellation Reason</Text>
                    <Text style={[styles.detailValueText, { color: colors.error }]}>{detailModal.cancellationReason}</Text>
                  </>
                )}
                {detailModal.refundStatus && detailModal.refundStatus !== 'none' && (
                  <>
                    <Text style={styles.ratingLabel}>Refund Status</Text>
                    <Text style={[styles.detailValueText, { color: detailModal.refundStatus === 'issued' ? colors.success : colors.warning }]}>{detailModal.refundStatus.toUpperCase()}</Text>
                  </>
                )}

                {detailModal.checkInDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-In Details</Text>
                    <Text style={styles.detailValueText}>🕐 {new Date(detailModal.checkInDetails.time).toLocaleString()}</Text>
                    <Text style={styles.detailValueText}>📟 Odometer: {detailModal.checkInDetails.odometer} km</Text>
                  </>
                )}

                {detailModal.checkOutDetails?.time && (
                  <>
                    <Text style={styles.ratingLabel}>Check-Out Details</Text>
                    <Text style={styles.detailValueText}>🕐 {new Date(detailModal.checkOutDetails.time).toLocaleString()}</Text>
                    <Text style={styles.detailValueText}>📟 Odometer: {detailModal.checkOutDetails.odometer} km</Text>
                    {detailModal.checkOutDetails.conditionPhoto && (
                      <View style={{marginTop: 8}}>
                        <Text style={{fontSize: 12, color: colors.textSecondary, marginBottom: 4}}>Condition Photo:</Text>
                        <Image source={{ uri: `${BASE_URL}${detailModal.checkOutDetails.conditionPhoto}` }} style={{width: 150, height: 100, borderRadius: 8, backgroundColor: colors.surfaceHighlight}} resizeMode="cover" />
                      </View>
                    )}
                  </>
                )}

                <Text style={styles.ratingLabel}>Booking ID</Text>
                <Text style={[styles.detailValueText, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 }]}>{detailModal._id}</Text>
                <View style={{ height: 20 }} />
              </ScrollView>
              <TouchableOpacity 
                style={[styles.closeModalBtn, { backgroundColor: colors.primary+'15', marginBottom: 12, borderWidth: 1, borderColor: colors.primary+'40' }]} 
                onPress={() => {
                  const v = detailModal.vehicle;
                  setDetailModal(null);
                  if (v) navigation.navigate('VehicleDetail', { vehicle: v });
                }}
              >
                <Text style={[styles.closeModalBtnText, { color: colors.primary }]}>🔍 View Full Vehicle Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDetailModal(null)}>
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ─── Feedback Modal ─────────────────────────────────── */}
      <Modal visible={!!modal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalBox}>
            <Text style={styles.modalTitle}>Feedback</Text>
            <Text style={styles.modalSub}>{modal?.vehicle?.makeAndModel}</Text>

            <Text style={styles.ratingLabel}>Rate Your Experience</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={[styles.star, { color: n <= rating ? colors.warning : '#E2E8F0' }]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingLabel}>Comments</Text>
            <TextInput
              style={styles.feedbackInput} placeholder="How was the ride? Anything to note?" placeholderTextColor={colors.textMuted}
              multiline numberOfLines={4} value={feedback} onChangeText={setFeedback}
            />

            <Text style={styles.ratingLabel}>Photos (optional, max 3)</Text>
            <View style={{flexDirection:'row',gap:10,marginBottom:16,flexWrap:'wrap'}}>
              {feedbackPhotos.map((uri, i) => (
                <View key={i} style={{position:'relative'}}>
                  <Image source={{uri}} style={{width:80,height:80,borderRadius:10}} />
                  <TouchableOpacity style={{position:'absolute',top:-6,right:-6,backgroundColor:colors.error,borderRadius:10,width:20,height:20,alignItems:'center',justifyContent:'center'}} onPress={() => setFeedbackPhotos(p => p.filter((_,j) => j !== i))}>
                    <Text style={{color:'#fff',fontSize:12,fontWeight:'900'}}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {feedbackPhotos.length < 3 && (
                <TouchableOpacity style={{width:80,height:80,borderRadius:10,borderWidth:2,borderColor:colors.border,borderStyle:'dashed',alignItems:'center',justifyContent:'center',backgroundColor:colors.surfaceHighlight}} onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
                  if (!result.canceled) setFeedbackPhotos(p => [...p, result.assets[0].uri]);
                }}>
                  <Text style={{fontSize:24,color:colors.textMuted}}>📷</Text>
                  <Text style={{fontSize:9,color:colors.textMuted,fontWeight:'700'}}>Add</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.7 }]} onPress={submitFeedback} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitBtnText}>Submit Feedback</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModal(null)}><Text style={styles.cancelBtnText}>Nevermind</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ─── Accountability (Checkin/Checkout) Modal ───────── */}
      {accountabilityModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <ScrollView contentContainerStyle={styles.modalBox}>
              <Text style={styles.modalTitle}>{actionType === 'checkin' ? 'Start Trip' : 'End Trip'}</Text>
              <Text style={styles.modalSub}>Record vehicle condition to protect yourself.</Text>

              <Text style={styles.ratingLabel}>Current Odometer (km)</Text>
              <TextInput style={[styles.feedbackInput, {minHeight:50, marginBottom:16}]} keyboardType="numeric" placeholder="e.g. 45200" value={odometer} onChangeText={setOdometer} />

              <Text style={styles.ratingLabel}>Dashboard / Odometer Photo</Text>
              <TouchableOpacity style={styles.photoUploadBtn} onPress={pickConditionPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: 150, borderRadius: SIZES.radius }} resizeMode="cover" />
                ) : (
                  <View style={{alignItems:'center'}}>
                    <Text style={{fontSize: 24, marginBottom:8}}>📸</Text>
                    <Text style={{color:colors.textSecondary, fontWeight: '600'}}>Tap to take photo of odometer</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.primaryActionBtn, {marginTop: 20}]} onPress={submitAccountability} disabled={processingState}>
                {processingState ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryActionText}>{actionType === 'checkin' ? 'Submit Check-In' : 'Submit Check-Out'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAccountabilityModal(null)} disabled={processingState}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}

      {/* ─── Reschedule Modal ───────────────────────────────── */}
      {rescheduleModal && (
        <Modal visible animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { paddingBottom: 20 }]}>
              <Text style={styles.modalTitle}>Reschedule Trip</Text>
              <Text style={styles.modalSub}>{rescheduleModal.vehicle?.makeAndModel}</Text>

              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerCol}>
                  <Text style={styles.datePickerLabel}>Pick-up</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker value={newStartDate} mode="datetime" display="default" minimumDate={new Date()} onChange={(e, d) => d && setNewStartDate(d)} />
                  ) : (
                    <View style={{flexDirection: 'row', gap: 5}}>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}><Text style={styles.dateBtnText}>{newStartDate.toLocaleDateString()}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartTimePicker(true)}><Text style={styles.dateBtnText}>{newStartDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.datePickerCol}>
                  <Text style={styles.datePickerLabel}>Drop-off</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker value={newEndDate} mode="datetime" display="default" minimumDate={newStartDate} onChange={(e, d) => d && setNewEndDate(d)} />
                  ) : (
                    <View style={{flexDirection: 'row', gap: 5}}>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}><Text style={styles.dateBtnText}>{newEndDate.toLocaleDateString()}</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndTimePicker(true)}><Text style={styles.dateBtnText}>{newEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text></TouchableOpacity>
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
                  <Text style={styles.detailTitle}>New Total Price</Text>
                  <Text style={styles.priceVal}>Rs. {livePrice.toLocaleString()}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.surfaceHighlight, borderRadius: 10, marginTop: 0 }]} onPress={() => setRescheduleModal(null)}>
                  <Text style={styles.cancelBtnText}>Nevermind</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 2, padding: 14, marginTop: 0 }, (newDays <= 0 || rescheduling) && { opacity: 0.6 }]} onPress={submitReschedule} disabled={newDays <= 0 || rescheduling}>
                  {rescheduling ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitBtnText}>Confirm Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ── Extend Modal ───────────────────────── */}
      {extendModal && (
        <Modal visible animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Extend Your Trip</Text>
              <Text style={{color: colors.textSecondary, marginBottom: 20}}>Select a new checkout date. Additional charges will apply.</Text>

              <View style={styles.datePickerContainer}>
                <View style={[styles.datePickerCol, { flex: 1 }]}>
                  <Text style={styles.datePickerLabel}>New Drop-off Time</Text>
                  {Platform.OS === 'ios' ? (
                    <DateTimePicker value={extendEndDate} mode="datetime" display="default" minimumDate={new Date(extendModal.endDate)} onChange={(e, d) => d && setExtendEndDate(d)} />
                  ) : (
                    <View style={{flexDirection: 'row', gap: 5}}>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowExtendPicker(true)}>
                        <Text style={styles.dateBtnText}>{extendEndDate.toLocaleDateString()}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dateBtn} onPress={() => setShowExtendTimePicker(true)}>
                        <Text style={styles.dateBtnText}>{extendEndDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Android Pickers */}
              {Platform.OS !== 'ios' && showExtendPicker && (
                <DateTimePicker
                  value={extendEndDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date(extendModal.endDate)}
                  onChange={(e, date) => {
                    setShowExtendPicker(false);
                    if (date) {
                      const updated = new Date(extendEndDate);
                      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                      setExtendEndDate(updated);
                    }
                  }}
                />
              )}
              {Platform.OS !== 'ios' && showExtendTimePicker && (
                <DateTimePicker
                  value={extendEndDate}
                  mode="time"
                  display="default"
                  onChange={(e, time) => {
                    setShowExtendTimePicker(false);
                    if (time) {
                      const updated = new Date(extendEndDate);
                      updated.setHours(time.getHours(), time.getMinutes());
                      setExtendEndDate(updated);
                    }
                  }}
                />
              )}

              {/* Estimate Cost */}
              {(() => {
                const msExtra = extendEndDate.getTime() - new Date(extendModal.endDate).getTime();
                const extraDays = Math.ceil(msExtra / (24 * 60 * 60 * 1000));
                const estPrice = extraDays > 0 ? extraDays * (extendModal.vehicle?.pricePerDay || 0) : 0;
                return (
              <View style={styles.rescheduleMetaBox}>
                <View style={[styles.metaRow, { borderBottomWidth: 0, paddingBottom: 0, marginTop: 4 }]}>
                  <Text style={styles.detailTitle}>Estimated Extra Charge</Text>
                  <Text style={[styles.priceVal, { color: colors.warning }]}>Rs. {estPrice.toLocaleString()}</Text>
                </View>
              </View>
                );
              })()}

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                <TouchableOpacity style={[styles.cancelBtn, { flex: 1, backgroundColor: colors.surfaceHighlight, borderRadius: 10, marginTop: 0 }]} onPress={() => setExtendModal(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 2, padding: 14, marginTop: 0 }]} onPress={submitExtend} disabled={extending}>
                  {extending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Confirm Extension</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.background },
  list:            { paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  headerBox:       { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 50, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, marginBottom: 16, ...SHADOWS.float },
  title: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5, marginBottom: 24 },
  tabContainer:    { flexDirection: 'row', borderRadius: SIZES.radiusPill, padding: 4, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtn:          { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: SIZES.radiusPill },
  tabBtnActive:    { backgroundColor: C.surface, ...SHADOWS.card },
  tabText:         { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  tabTextActive:   { color: C.primary, fontWeight: '900' },
  emptyBox:        { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji:      { fontSize: 60, marginBottom: 16 },
  emptyTitle:      { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  emptySub:        { color: C.textSecondary, textAlign: 'center', fontWeight: '500' },
  
  card:            { backgroundColor: C.surface, borderRadius: 24, marginHorizontal: 20, marginBottom: 24, ...SHADOWS.float, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  vehicleImg:      { width: '100%', height: 160 },
  floatingBadge:   { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: SIZES.radiusPill, overflow: 'hidden' },
  cardContent:     { padding: 20 },
  titleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  carName:         { fontSize: 18, fontWeight: '900', color: C.textPrimary, flex: 1 },
  licensePlate:    { fontSize: 12, color: C.textMuted, fontWeight: '800', letterSpacing: 1 },
  statusDot:       { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText:       { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  metaRow:         { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12, marginBottom: 12, alignItems: 'center' },
  detailTitle:     { color: C.textSecondary, fontSize: 13, fontWeight: '600' },
  detailVal:       { color: C.textPrimary, fontSize: 13, fontWeight: '700' },
  priceVal:        { color: C.primary, fontSize: 18, fontWeight: '900' },
  
  systemNotice:    { backgroundColor: C.error + '10', padding: 12, borderRadius: 10, marginTop: 12, borderWidth: 1, borderColor: C.error + '30' },
  systemNoticeTitle: { fontSize: 12, fontWeight: '800', color: C.error, marginBottom: 4 },
  systemNoticeText:  { fontSize: 13, color: C.error, lineHeight: 20, fontWeight: '500' },

  actionRow:       { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 12 },
  actionGrid:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 12, gap: 12 },
  primaryActionBtn:{ flex: 1, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', ...SHADOWS.float },
  primaryActionText:{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  cancelTripBtn:   { flex: 1, backgroundColor: C.surface, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: C.error },
  cancelTripText:  { color: C.error, fontWeight: '800', fontSize: 14 },
  rescheduleBtn:   { flex: 1.5, backgroundColor: C.surfaceHighlight, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rescheduleText:  { color: C.textPrimary, fontWeight: '800', fontSize: 14 },
  feedbackBtn:     { backgroundColor: C.surfaceHighlight, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  feedbackBtnText: { color: C.textPrimary, fontWeight: '800', fontSize: 14 },
  activePill:      { backgroundColor: C.success + '10', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: C.success + '30' },
  activePillText:  { color: C.success, fontWeight: '800', fontSize: 13 },
  
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalBox:        { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 40 },
  modalTitle:      { fontSize: 24, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5, marginBottom: 8 },
  modalSub:        { color: C.textSecondary, marginBottom: 24, fontWeight: '600' },
  ratingLabel:     { fontSize: 13, fontWeight: '800', color: C.textSecondary, textTransform: 'uppercase', marginBottom: 12 },
  detailValueText: { fontSize: 16, color: C.textPrimary, marginBottom: 16, fontWeight: '500' },
  closeModalBtn:   { backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  closeModalBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  stars:           { flexDirection: 'row', gap: 8, marginBottom: 24 },
  star:            { fontSize: 36 },
  feedbackInput:   { borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radius, padding: 16, fontSize: 15, color: C.textPrimary, minHeight: 120, textAlignVertical: 'top', marginBottom: 24, backgroundColor: C.background },
  submitBtn:       { backgroundColor: C.primary, borderRadius: SIZES.radius, padding: 16, alignItems: 'center', ...SHADOWS.float },
  submitBtnText:   { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  cancelBtn:       { marginTop: 16, alignItems: 'center', padding: 14 },
  cancelBtnText:   { color: C.textSecondary, fontWeight: '700' },
  photoUploadBtn:  { backgroundColor: C.background, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: SIZES.radius, padding: 32, alignItems: 'center', justifyContent: 'center' },
  
  datePickerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  datePickerCol:   { width: '47%' },
  datePickerLabel: { fontSize: 12, fontWeight: '800', color: C.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  dateBtn:         { flex: 1, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  dateBtnText:     { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  rescheduleMetaBox: { backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, padding: 16, marginBottom: 24 }
});
