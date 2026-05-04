// Vehicle detail screen for rental app.
// Shows vehicle photos, specs, reviews, pricing, availability,
// lets user choose rental dates and proceed to booking/payment.
// Includes validation for booking dates and KYC verification.
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, Platform, StatusBar, Linking, Dimensions, FlatList
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { BASE_URL, API_URL } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

import Card from '../../components/atoms/Card';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const { width } = Dimensions.get('window');
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fallback to array of 1 if vehicle.images isn't present
  const displayImages = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images 
    : (vehicle.imageUrl ? [vehicle.imageUrl] : []);

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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        
        {/* ── Edge-to-Edge Hero Image Carousel ───────────────────────────── */}
        <View style={styles.imageContainer}>
          {displayImages.length > 0 ? (
            <FlatList
              data={displayImages}
              keyExtractor={(_, idx) => idx.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveImageIndex(newIndex);
              }}
              renderItem={({ item }) => (
                <View style={{ width, height: 320 }}>
                  <Image
                    source={{ uri: `${BASE_URL}${item}` }}
                    style={styles.heroImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            />
          ) : (
            <View style={[styles.heroPlaceholder, { width }]}>
              <Text style={{ fontSize: 60 }}>🚘</Text>
            </View>
          )}

          {/* Image Counter Badge */}
          {displayImages.length > 1 && (
            <View style={styles.imageCounterBadge}>
              <Text style={styles.imageCounterText}>{activeImageIndex + 1} / {displayImages.length}</Text>
            </View>
          )}
          
          {/* Dot Indicators */}
          {displayImages.length > 1 && (
            <View style={styles.dotContainer}>
              {displayImages.map((_, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.dot, 
                    activeImageIndex === idx ? styles.activeDot : styles.inactiveDot
                  ]} 
                />
              ))}
            </View>
          )}
          {/* Gradient Overlay for Top Area */}
          <LinearGradient 
            colors={['rgba(0,0,0,0.7)', 'transparent']} 
            style={styles.topGradient}
          />
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        </View>

        {/* ── Title Block (Shifted up to overlap image slightly) ── */}
        <View style={styles.titleSection}>
          <View style={styles.titleHeader}>
            <Text style={styles.vehicleTitle}>{vehicle.makeAndModel}</Text>
            <Badge 
              label={vehicle.isCurrentlyBooked ? 'Booked' : (vehicle.isAvailable ? 'Available' : 'Unavailable')}
              variant={vehicle.isCurrentlyBooked ? 'warning' : (vehicle.isAvailable ? 'success' : 'error')}
              style={{ marginLeft: 12 }}
            />
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>Rs. {vehicle.pricePerDay.toLocaleString()}</Text>
            <Text style={styles.priceSub}> / day</Text>
          </View>
          {vehicle.priceUpdatedAt && (
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', marginTop: 4, fontStyle: 'italic' }}>
              ℹ️ Price last updated on {new Date(vehicle.priceUpdatedAt).toLocaleDateString()}
            </Text>
          )}
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
        <Card style={{ marginHorizontal: 20, marginBottom: 32 }}>
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
        </Card>

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
              <Card key={r._id} style={{ marginBottom: 12 }}>
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
              </Card>
            ))}
          </View>
        ) : (
          <View style={styles.noReviews}>
            <Text style={styles.noReviewsIcon}>✨</Text>
            <Text style={styles.noReviewsText}>Be the first to review this ride.</Text>
          </View>
        )}

      </ScrollView>

      {/* ── Checkout Footer (Floating Glass Bar) ─────────────── */}
      {vehicle.isAvailable && (
        <BlurView intensity={90} tint={isDark ? "dark" : "light"} style={styles.checkoutFooter}>
          <Text style={styles.checkoutTitle}>Rental Horizon</Text>
          
          <View style={styles.pickerRow}>
            {/* Pick Up */}
            <View style={styles.pickerBlock}>
              <Text style={styles.pickerLabel}>PICK-UP</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={startDate} mode="datetime" display="default" themeVariant={isDark ? "dark" : "light"} minimumDate={new Date()} onChange={(e, d) => d && setStartDate(d)} />
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
                <DateTimePicker value={endDate} mode="datetime" display="default" themeVariant={isDark ? "dark" : "light"} minimumDate={startDate} onChange={(e, d) => d && setEndDate(d)} />
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

          <Button 
            label={vehicle.isCurrentlyBooked ? 'Currently Unavailable' : `Review & Book • Rs. ${(calculateDays() * vehicle.pricePerDay).toLocaleString()}`}
            onPress={submitBooking}
            loading={bookingLoading}
            disabled={vehicle.isCurrentlyBooked}
            size="large"
            style={styles.bookBtn}
          />
        </BlurView>
      )}
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.background },
  scrollContent:  { paddingBottom: 250 }, // Extra space for floating bar
  
  imageContainer: { width: '100%', height: 320, backgroundColor: C.surfaceHighlight, position: 'relative' },
  heroImage:      { width: '100%', height: '100%' },
  heroPlaceholder:{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  
  imageCounterBadge: { position: 'absolute', top: Platform.OS === 'ios' ? 65 : 45, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 10 },
  imageCounterText:  { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  
  dotContainer:   { flexDirection: 'row', position: 'absolute', bottom: 50, alignSelf: 'center', gap: 8 },
  dot:            { width: 10, height: 10, borderRadius: 5 },
  activeDot:      { backgroundColor: '#FFFFFF', width: 28 },
  inactiveDot:    { backgroundColor: 'rgba(255,255,255,0.4)' },
  
  topGradient:    { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  backBtn:        { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', ...SHADOWS.light },
  backBtnText:    { fontSize: 24, color: '#FFFFFF', fontWeight: '800' },
  
  titleSection:   { padding: 24, backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -32, ...SHADOWS.float, marginBottom: 24 },
  titleHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  vehicleTitle:   { fontSize: 28, fontWeight: '900', color: C.textPrimary, flex: 1, letterSpacing: -0.5 },
  priceRow:       { flexDirection: 'row', alignItems: 'baseline' },
  priceText:      { fontSize: 28, fontWeight: '900', color: C.primary },
  priceSub:       { fontSize: 16, color: C.textSecondary, fontWeight: '700' },
  
  sectionHeader:  { paddingHorizontal: 24, marginBottom: 12 },
  sectionTitle:   { fontSize: 20, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.2 },
  
  specHScroll:    { paddingHorizontal: 20, paddingBottom: 16 },
  specItem:       { width: 110, height: 120, backgroundColor: C.surface, borderRadius: 24, padding: 16, marginRight: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  specIcon:       { fontSize: 32, marginBottom: 12 },
  specLabel:      { fontSize: 11, color: C.textSecondary, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  specValue:      { fontSize: 15, color: C.textPrimary, fontWeight: '900' },
  
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel:    { fontSize: 14, color: C.textSecondary, fontWeight: '700' },
  detailValue:    { fontSize: 16, color: C.textPrimary, fontWeight: '900' },
  detailLine:     { height: 1, backgroundColor: C.border, marginVertical: 16 },
  detailGroup:    { flexDirection: 'column' },
  featuresText:   { fontSize: 15, color: C.textPrimary, lineHeight: 24, marginTop: 8, fontWeight: '500' },
  
  reviewContainer:{ paddingHorizontal: 20, marginBottom: 24 },
  avgRatingCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceHighlight, padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: C.success + '80', ...SHADOWS.card },
  avgRatingValue: { fontSize: 48, fontWeight: '900', color: C.success },
  starRow:        { flexDirection: 'row', gap: 2 },
  avgRatingLabel: { color: C.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  
  reviewHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  reviewAuthor:   { fontSize: 15, fontWeight: '900', color: C.textPrimary },
  reviewComment:  { fontSize: 15, color: C.textSecondary, lineHeight: 24, fontStyle: 'italic', marginBottom: 12, fontWeight: '500' },
  reviewDate:     { fontSize: 12, color: C.textMuted, fontWeight: '700' },
  ownerReplyBox:  { backgroundColor: C.surfaceHighlight, padding: 16, borderRadius: 12, marginTop: 16, borderLeftWidth: 4, borderLeftColor: C.primary },
  ownerReplyLabel:{ fontSize: 12, fontWeight: '900', color: C.primary, textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 },
  ownerReplyText: { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontWeight: '500' },
  
  noReviews:      { alignItems: 'center', marginVertical: 40 },
  noReviewsIcon:  { fontSize: 40, marginBottom: 16 },
  noReviewsText:  { color: C.textMuted, fontWeight: '700', fontSize: 15 },
  
  checkoutFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1, borderTopColor: C.border },
  checkoutTitle:  { fontSize: 12, fontWeight: '900', color: C.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  pickerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  pickerBlock:    { flex: 1 },
  pickerLabel:    { fontSize: 11, color: C.textSecondary, fontWeight: '900', marginBottom: 8, letterSpacing: 0.5 },
  dateBtn:        { flex: 1, backgroundColor: C.surface, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border, ...SHADOWS.light },
  dateBtnText:    { color: C.textPrimary, fontWeight: '800', fontSize: 14 },
  pickerDividerText:{ color: C.textMuted, fontSize: 13, fontWeight: '700' },
  bookBtn:        { ...SHADOWS.float }
});
