import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, Platform, StatusBar, Linking
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { BASE_URL, API_URL } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Booking State
  const [startDate, setStartDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hr from now
  const [endDate, setEndDate] = useState(new Date(Date.now() + 25 * 60 * 60 * 1000)); // Default to 25 hrs from now
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [totalReviews, setTotalReviews] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/api/vehicles/${vehicle._id}/feedback`);
        setReviews(res.data.feedbacks || []);
        setAvgRating(res.data.averageRating);
        setTotalReviews(res.data.totalReviews || 0);
      } catch { /* silently fail */ }
      finally { setReviewsLoading(false); }
    };
    fetchReviews();
  }, [vehicle._id]);

  const calculateDays = () => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // Minimum 1 day
  };

  const submitBooking = async () => {
    if (endDate <= startDate) {
      return Alert.alert('Invalid Dates', 'End date must be after pick-up date.');
    }
    
    // KYC Verification Interceptor
    if (user.role === 'Customer' && user.identity?.status !== 'verified') {
      const statusText = user.identity?.status === 'pending'
        ? 'Your documents are currently under review by an Admin. Please wait for approval.'
        : 'You must verify your identity (Driving License, NIC, Selfie) before your first booking.';
        
      return Alert.alert(
        'Verification Required 🛡️',
        statusText,
        [
          { text: 'Cancel', style: 'cancel' },
          ...(user.identity?.status !== 'pending' ? [{ text: 'Verify Now', onPress: () => navigation.navigate('KYCUpload') }] : [])
        ]
      );
    }

    const days = calculateDays();
    const totalPrice = days * vehicle.pricePerDay;
    
    navigation.navigate('Payment', {
      vehicle,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
      total: totalPrice
    });
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.surface} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* ── Hero Image ────────────────────────────────────────── */}
        <View style={styles.imageContainer}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          {vehicle.imageUrl ? (
            <Image
              source={{ uri: `${BASE_URL}${vehicle.imageUrl}` }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={{ fontSize: 60 }}>🚘</Text>
            </View>
          )}
        </View>

        {/* ── Title Block ───────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <View style={styles.titleHeader}>
            <Text style={styles.vehicleTitle}>{vehicle.makeAndModel}</Text>
            <View style={[styles.statusBadge, { backgroundColor: vehicle.isCurrentlyBooked ? colors.warning : (vehicle.isAvailable ? colors.success : colors.error) }]}>
              <Text style={styles.statusBadgeText}>
                {vehicle.isCurrentlyBooked ? 'Booked' : (vehicle.isAvailable ? 'Available' : 'Unavailable')}
              </Text>
            </View>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>Rs. {vehicle.pricePerDay.toLocaleString()}</Text>
            <Text style={styles.priceSub}> / day</Text>
          </View>
        </View>

        {/* ── Specs Grid ────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specHScroll}>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>🏎️</Text>
            <Text style={styles.specLabel}>Type</Text>
            <Text style={styles.specValue}>{vehicle.type || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>⚙️</Text>
            <Text style={styles.specLabel}>Transmission</Text>
            <Text style={styles.specValue}>{vehicle.transmission || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>⛽</Text>
            <Text style={styles.specLabel}>Fuel</Text>
            <Text style={styles.specValue}>{vehicle.fuelType || 'N/A'}</Text>
          </View>
          <View style={styles.specItem}>
            <Text style={styles.specIcon}>💺</Text>
            <Text style={styles.specLabel}>Seats</Text>
            <Text style={styles.specValue}>{vehicle.seats || 'N/A'}</Text>
          </View>
        </ScrollView>

        {/* ── Details Card ──────────────────────────────────────── */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Manufacture Year</Text>
            <Text style={styles.detailValue}>{vehicle.year || 'N/A'}</Text>
          </View>
          <View style={styles.detailLine} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>License Plate</Text>
            <Text style={styles.detailValue}>{vehicle.licensePlate}</Text>
          </View>
          
          {vehicle.features ? (
            <>
              <View style={styles.detailLine} />
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Features Included</Text>
                <Text style={styles.featuresText}>{vehicle.features}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* ── Reviews ───────────────────────────────────────────── */}
        <View style={[styles.sectionHeader, { marginTop: 12 }]}>
          <Text style={styles.sectionTitle}>Reviews & Ratings</Text>
        </View>
        
        {reviewsLoading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
        ) : totalReviews > 0 ? (
          <View style={styles.reviewContainer}>
            {/* Avg Card */}
            <View style={styles.avgRatingCard}>
              <Text style={styles.avgRatingValue}>{avgRating}</Text>
              <View style={{ marginLeft: 16 }}>
                <View style={styles.starRow}>
                  {[1,2,3,4,5].map(n => (
                    <Text key={n} style={{ fontSize: 18, color: n <= Math.round(avgRating) ? colors.warning : '#CBD5E1' }}>★</Text>
                  ))}
                </View>
                <Text style={styles.avgRatingLabel}>Based on {totalReviews} reviews</Text>
              </View>
            </View>

            {/* List */}
            {reviews.map(r => (
              <View key={r._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{r.user?.name || 'Verified Customer'}</Text>
                  <View style={styles.starRow}>
                    {[1,2,3,4,5].map(n => (
                      <Text key={n} style={{ fontSize: 14, color: n <= r.rating ? colors.warning : '#E2E8F0', marginLeft: 2 }}>★</Text>
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewComment}>"{r.comment || 'No comment provided'}"</Text>
                
                {r.photos && r.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 12}} contentContainerStyle={{gap: 8}}>
                    {r.photos.map((p, i) => (
                      <TouchableOpacity key={i} onPress={() => Linking.openURL(`${API_URL}${p}`)}>
                        <Image source={{uri: `${API_URL}${p}`}} style={{width: 80, height: 60, borderRadius: 8, backgroundColor: colors.surfaceHighlight}} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <Text style={styles.reviewDate}>{new Date(r.createdAt).toLocaleDateString()}</Text>
                
                {r.ownerReply?.text && (
                  <View style={styles.ownerReplyBox}>
                    <Text style={styles.ownerReplyLabel}>Reply from host</Text>
                    <Text style={styles.ownerReplyText}>{r.ownerReply.text}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <Text style={styles.noReviewsIcon}>✨</Text>
            <Text style={styles.noReviewsText}>Be the first to review this ride.</Text>
          </View>
        )}

      </ScrollView>

      {/* ── Checkout Footer ─────────────────────────────────────── */}
      {vehicle.isAvailable && (
        <View style={styles.checkoutFooter}>
          <Text style={styles.checkoutTitle}>Rental Horizon</Text>
          
          <View style={styles.pickerRow}>
            {/* Pick Up */}
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>PICK-UP</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={startDate} mode="datetime" display="default" minimumDate={new Date()} onChange={(e, d) => d && setStartDate(d)} />
              ) : (
                <View style={{flexDirection: 'row', gap: 4}}>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.dateBtnText}>{startDate.toLocaleDateString([], {month: 'short', day: 'numeric'})}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowStartTimePicker(true)}>
                    <Text style={styles.dateBtnText}>{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.pickerDivider}><Text style={styles.pickerDividerText}>to</Text></View>
            
            {/* Drop Off */}
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>DROP-OFF</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={endDate} mode="datetime" display="default" minimumDate={startDate} onChange={(e, d) => d && setEndDate(d)} />
              ) : (
                <View style={{flexDirection: 'row', gap: 4}}>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.dateBtnText}>{endDate.toLocaleDateString([], {month: 'short', day: 'numeric'})}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dateBtn} onPress={() => setShowEndTimePicker(true)}>
                    <Text style={styles.dateBtnText}>{endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Android Pickers */}
          {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" minimumDate={new Date()} onChange={(e, d) => { setShowStartPicker(false); if (d) { const nd = new Date(startDate); nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setStartDate(nd); } }} />}
          {showStartTimePicker && <DateTimePicker value={startDate} mode="time" display="default" onChange={(e, d) => { setShowStartTimePicker(false); if (d) { const nd = new Date(startDate); nd.setHours(d.getHours(), d.getMinutes()); setStartDate(nd); } }} />}
          {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" minimumDate={startDate} onChange={(e, d) => { setShowEndPicker(false); if (d) { const nd = new Date(endDate); nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setEndDate(nd); } }} />}
          {showEndTimePicker && <DateTimePicker value={endDate} mode="time" display="default" onChange={(e, d) => { setShowEndTimePicker(false); if (d) { const nd = new Date(endDate); nd.setHours(d.getHours(), d.getMinutes()); setEndDate(nd); } }} />}

          <TouchableOpacity 
            style={[styles.submitBtn, (bookingLoading || vehicle.isCurrentlyBooked) && {opacity: 0.8}]} 
            onPress={submitBooking} 
            disabled={bookingLoading || vehicle.isCurrentlyBooked}
            activeOpacity={0.8}
          >
            {bookingLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : vehicle.isCurrentlyBooked ? (
              <Text style={styles.submitBtnText}>Currently Unavailable</Text>
            ) : (
              <View style={styles.btnContentRow}>
                <Text style={styles.submitBtnText}>Review & Book</Text>
                <Text style={styles.btnPriceOverlay}>Rs. {(calculateDays() * vehicle.pricePerDay).toLocaleString()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.background },
  scrollContent:  { paddingBottom: 30 },
  
  imageContainer: { width: '100%', height: 320, backgroundColor: C.surfaceHighlight, position: 'relative' },
  heroImage:      { width: '100%', height: '100%' },
  heroPlaceholder:{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  backBtn:        { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, opacity: 0.9, justifyContent: 'center', alignItems: 'center', zIndex: 10, ...SHADOWS.card },
  backBtnText:    { fontSize: 24, color: C.textPrimary, fontWeight: '600' },
  
  titleSection:   { padding: 24, backgroundColor: C.surface, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, ...SHADOWS.card, marginBottom: 24 },
  titleHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  vehicleTitle:   { fontSize: 26, fontWeight: '900', color: C.textPrimary, flex: 1, letterSpacing: -0.5 },
  statusBadge:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusPill, marginLeft: 12 },
  statusBadgeText:{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  priceRow:       { flexDirection: 'row', alignItems: 'baseline' },
  priceText:      { fontSize: 24, fontWeight: '800', color: C.primary },
  priceSub:       { fontSize: 15, color: C.textSecondary, fontWeight: '600' },
  
  sectionHeader:  { paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle:   { fontSize: 18, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  
  specHScroll:    { paddingHorizontal: 20, paddingBottom: 16 },
  specItem:       { width: 100, height: 110, backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 16, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  specIcon:       { fontSize: 28, marginBottom: 8 },
  specLabel:      { fontSize: 10, color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  specValue:      { fontSize: 14, color: C.textPrimary, fontWeight: '800' },
  
  detailsCard:    { marginHorizontal: 20, backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:    { fontSize: 13, color: C.textSecondary, fontWeight: '600' },
  detailValue:    { fontSize: 15, color: C.textPrimary, fontWeight: '800' },
  detailLine:     { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailGroup:    { flexDirection: 'column' },
  featuresText:   { fontSize: 15, color: C.textPrimary, lineHeight: 24, marginTop: 8 },
  
  reviewContainer:{ paddingHorizontal: 20, marginBottom: 24 },
  avgRatingCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHighlight, padding: 20, borderRadius: SIZES.radius, marginBottom: 16, borderWidth: 1, borderColor: C.success + '80' },
  avgRatingValue: { fontSize: 44, fontWeight: '900', color: C.success },
  starRow:        { flexDirection: 'row', gap: 2 },
  avgRatingLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 6 },
  
  reviewCard:     { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  reviewHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewAuthor:   { fontSize: 14, fontWeight: '800', color: C.textPrimary },
  reviewComment:  { fontSize: 14, color: C.textSecondary, lineHeight: 22, fontStyle: 'italic', marginBottom: 12 },
  reviewDate:     { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  ownerReplyBox:  { backgroundColor: C.surfaceHighlight, padding: 12, borderRadius: 8, marginTop: 16, borderLeftWidth: 3, borderLeftColor: C.primary },
  ownerReplyLabel:{ fontSize: 11, fontWeight: '800', color: C.primary, textTransform: 'uppercase', marginBottom: 6 },
  ownerReplyText: { fontSize: 13, color: C.textPrimary, lineHeight: 20 },
  
  noReviews:      { alignItems: 'center', marginVertical: 32 },
  noReviewsIcon:  { fontSize: 32, marginBottom: 12 },
  noReviewsText:  { color: C.textMuted, fontWeight: '600', fontSize: 14 },
  
  checkoutFooter: { backgroundColor: C.surface, padding: 20, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, ...SHADOWS.float, borderTopWidth: 1, borderTopColor: C.border },
  checkoutTitle:  { fontSize: 13, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  pickerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  pickerBlock:    { flex: 1 },
  pickerLabel:    { fontSize: 10, color: C.textSecondary, fontWeight: '800', marginBottom: 6 },
  dateBtn:        { flex: 1, backgroundColor: C.background, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  dateBtnText:    { color: C.textPrimary, fontWeight: '700', fontSize: 13 },
  pickerDivider:  { paddingHorizontal: 12 },
  pickerDividerText:{ color: C.textMuted, fontSize: 12, fontWeight: '600' },
  
  submitBtn:      { backgroundColor: C.primary, height: 56, borderRadius: SIZES.radius, justifyContent: 'center', alignItems: 'center', ...SHADOWS.float },
  submitBtnText:  { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  btnContentRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 24 },
  btnPriceOverlay:{ color: '#FFFFFF', fontWeight: '800', fontSize: 16, opacity: 0.9, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }
});
