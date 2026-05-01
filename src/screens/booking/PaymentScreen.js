import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, TextInput, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function PaymentScreen({ route, navigation }) {
  const { vehicle, startDate, endDate, days, total } = route.params;
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  
  const [loading,  setLoading]  = useState(false);
  const [paid,     setPaid]     = useState(false);
  
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  
  // Payment States
  const [payMethod,  setPayMethod]  = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv,        setCvv]        = useState('');
  const [paymentSlipUri, setPaymentSlipUri] = useState(null);
  const [errors,     setErrors]     = useState({});

  const validateForm = () => {
    if (payMethod === 'cash') return true;
    if (payMethod === 'bank_transfer') {
      if (!paymentSlipUri) {
        setErrors({ slip: 'Payment slip is required.' });
        return false;
      }
      return true;
    }
    
    let newErrors = {};
    const cleanCard = cardNumber.replace(/\s+/g, '');
    
    if (cleanCard.length < 16) {
      newErrors.card = 'Valid 16-19 digit card number required.';
    }
    
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
      newErrors.expiry = 'Use MM/YY format.';
    } else {
      const [mm, yy] = expiryDate.split('/');
      const year = 2000 + parseInt(yy, 10);
      const month = parseInt(mm, 10);
      const now = new Date();
      if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
         newErrors.expiry = 'Card is expired.';
      }
    }
    
    if (cvv.length < 3) newErrors.cvv = 'Invalid CVV.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (payMethod === 'bank_transfer') {
        // STEP 1: Create the booking with pure JSON (no file)
        const bookingRes = await api.post('/api/bookings', {
          vehicleId:     vehicle._id,
          startDate,
          endDate,
          totalPrice:    total,
          paymentMethod: payMethod,
        });
        const bookingId = bookingRes.data._id;

        // STEP 2: Upload the slip to the dedicated multipart endpoint
        const formData = new FormData();
        const uriParts = paymentSlipUri.split('.');
        const fileType = uriParts[uriParts.length - 1].toLowerCase();
        const mimeType = fileType === 'jpg' || fileType === 'jpeg' ? 'image/jpeg' : `image/${fileType}`;
        formData.append('paymentSlip', { uri: paymentSlipUri, name: `slip_${Date.now()}.${fileType}`, type: mimeType });

        await api.post(`/api/bookings/${bookingId}/upload-slip`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/api/bookings', {
          vehicleId:     vehicle._id,
          startDate,
          endDate,
          totalPrice:    total,
          paymentMethod: payMethod,
        });
      }
      setPaid(true);
    } catch (err) {
      Alert.alert('Payment Failed', err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  // ── Success Screen ────────────────────────────────────────────────
  if (paid) {
    return (
      <View style={styles.successScreen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.success + '15'} />
        <View style={styles.successCenter}>
          <Text style={styles.successEmoji}>{payMethod === 'bank_transfer' ? '⏳' : '🎉'}</Text>
          <Text style={styles.successTitle}>{payMethod === 'bank_transfer' ? 'Booking Submitted!' : 'Booking Confirmed!'}</Text>
          <Text style={styles.successSub}>{payMethod === 'bank_transfer' ? 'Your booking is pending payment verification by our team.' : 'Your vehicle has been successfully booked.'}</Text>

          
          <View style={styles.successCard}>
            <Text style={styles.successVehicle}>🚗 {vehicle.makeAndModel}</Text>
            <View style={styles.successDivider} />
            <Text style={styles.successDetail}>📅 {new Date(startDate).toLocaleDateString()}  →  {new Date(endDate).toLocaleDateString()}</Text>
            <Text style={styles.successTotal}>Amount: Rs. {total.toLocaleString()}</Text>
          </View>
          
          <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })} activeOpacity={0.8}>
            <Text style={styles.homeBtnText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <View style={styles.greenHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Checkout</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          <Row label="Vehicle"    value={vehicle.makeAndModel} styles={styles} />
          <Row label="Plate"      value={vehicle.licensePlate} styles={styles} />
          <Row label="From"       value={new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} styles={styles} />
          <Row label="To"         value={new Date(endDate).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' })} styles={styles} />
          <Row label="Duration"   value={`${days} day${days !== 1 ? 's' : ''}`} styles={styles} />
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          <View style={styles.payMethodRow}>
            <TouchableOpacity style={[styles.payMethod, payMethod === 'card' && styles.payMethodActive]} onPress={() => setPayMethod('card')} activeOpacity={0.8}>
              <Text style={styles.payMethodIcon}>💳</Text>
              <Text style={[styles.payMethodText, payMethod === 'card' && styles.payMethodTextActive]}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payMethod, payMethod === 'cash' && styles.payMethodActive]} onPress={() => setPayMethod('cash')} activeOpacity={0.8}>
              <Text style={styles.payMethodIcon}>💵</Text>
              <Text style={[styles.payMethodText, payMethod === 'cash' && styles.payMethodTextActive]}>Cash on Pickup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payMethod, payMethod === 'bank_transfer' && styles.payMethodActive]} onPress={() => setPayMethod('bank_transfer')} activeOpacity={0.8}>
              <Text style={styles.payMethodIcon}>🏦</Text>
              <Text style={[styles.payMethodText, payMethod === 'bank_transfer' && styles.payMethodTextActive]}>Bank Transfer</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Card Fields */}
          {payMethod === 'card' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <View style={[styles.pseudoInput, errors.card && styles.inputErrorBorder]}>
                <Text style={{opacity: 0.5}}>💳</Text>
                <TextInput style={styles.textInput} placeholder="1234 5678 9101 1121" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={19} value={cardNumber} onChangeText={setCardNumber} />
              </View>
              {errors.card && <Text style={styles.errorText}>{errors.card}</Text>}
              
              <View style={{flexDirection: 'row', gap: 16, marginTop: 16}}>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput style={[styles.pseudoInput, errors.expiry && styles.inputErrorBorder]} placeholderTextColor={colors.textMuted} placeholder="MM/YY" keyboardType="numeric" maxLength={5} value={expiryDate} onChangeText={setExpiryDate} />
                  {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput style={[styles.pseudoInput, errors.cvv && styles.inputErrorBorder]} placeholder="123" placeholderTextColor={colors.textMuted} keyboardType="numeric" maxLength={3} secureTextEntry={true} value={cvv} onChangeText={setCvv} />
                  {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                </View>
              </View>
            </View>
          )}

          {payMethod === 'bank_transfer' && (
            <View style={styles.inputContainer}>
              <View style={styles.bankDetailsBox}>
                <Text style={styles.bankDetailsTitle}>Bank Details</Text>
                <Text style={styles.bankDetailsText}><Text style={{fontWeight:'bold'}}>Bank:</Text> Bank of Ceylon</Text>
                <Text style={styles.bankDetailsText}><Text style={{fontWeight:'bold'}}>Account Name:</Text> Rent-a-Car System</Text>
                <Text style={styles.bankDetailsText}><Text style={{fontWeight:'bold'}}>Account Number:</Text> 123456789</Text>
                <Text style={styles.bankDetailsText}><Text style={{fontWeight:'bold'}}>Branch:</Text> City Center</Text>
              </View>

              <Text style={[styles.inputLabel, {marginTop: 20}]}>Upload Transfer Slip</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
                if (!result.canceled) { setPaymentSlipUri(result.assets[0].uri); setErrors({}); }
              }}>
                {paymentSlipUri ? (
                  <Image source={{ uri: paymentSlipUri }} style={styles.slipImage} resizeMode="cover" />
                ) : (
                  <>
                    <Text style={{fontSize: 32, marginBottom: 8}}>🧾</Text>
                    <Text style={{color: colors.textSecondary, fontWeight: '600'}}>Tap to upload slip screenshot</Text>
                  </>
                )}
              </TouchableOpacity>
              {errors.slip && <Text style={styles.errorText}>{errors.slip}</Text>}
            </View>
          )}
        </View>

        {/* Confirm Payment Button */}
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.btnDisabled]}
          onPress={handlePayment}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.surface} />
            : <>
                <Text style={styles.payBtnText}>Confirm Booking {payMethod === 'card' && '& Pay'}</Text>
                <Text style={styles.payBtnAmount}>Rs. {total.toLocaleString()}</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>🔒 Secure & encrypted checkout via DrivEase</Text>
      </ScrollView>
    </View>
  );
}

const Row = ({ label, value, styles }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const getStyles = (C) => StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.background },
  greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  backBtn:         { padding: 8, marginLeft: -8 },
  backBtnText:     { fontSize: 16, color: C.primary, fontWeight: '700' },
  pageTitle:       { fontSize: 20, fontWeight: '800', color: C.textPrimary },
  headerRight:     { width: 60 },
  
  container:       { padding: 20, paddingBottom: 60 },
  card:            { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  sectionTitle:    { fontSize: 16, fontWeight: '800', marginBottom: 20, color: C.textPrimary, letterSpacing: -0.2 },
  
  row:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  rowLabel:        { color: C.textSecondary, fontSize: 14, fontWeight: '500' },
  rowValue:        { color: C.textPrimary, fontWeight: '700', fontSize: 15, textAlign: 'right', flex: 1, marginLeft: 8 },
  totalDivider:    { height: 1, backgroundColor: C.border, marginVertical: 16 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel:      { fontSize: 16, fontWeight: '800', color: C.textPrimary },
  totalValue:      { fontSize: 22, fontWeight: '900', color: C.primary },
  
  payMethodRow:    { flexDirection: 'row', gap: 16, marginBottom: 8 },
  payMethod:       { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radius, padding: 16, alignItems: 'center', backgroundColor: C.surface },
  payMethodActive: { borderColor: C.primary, backgroundColor: C.surfaceHighlight, borderWidth: 2 },
  payMethodIcon:   { fontSize: 32, marginBottom: 8 },
  payMethodText:   { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  payMethodTextActive: { color: C.primary },
  
  inputContainer:  { marginTop: 24 },
  inputLabel:      { fontSize: 12, fontWeight: '800', color: C.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  pseudoInput:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.background, borderWidth: 1, borderColor: C.border, paddingHorizontal: 16, height: SIZES.inputHeight, borderRadius: SIZES.radius, gap: 12 },
  textInput:       { flex: 1, color: C.textPrimary, fontWeight: '700', fontSize: 16 },
  inputErrorBorder:{ borderColor: C.error, borderWidth: 1.5 },
  errorText:       { color: C.error, fontSize: 12, marginTop: 6, fontWeight: '600' },
  
  payBtn:          { backgroundColor: C.primary, borderRadius: SIZES.radius, paddingVertical: 18, alignItems: 'center', marginTop: 12, ...SHADOWS.float },
  btnDisabled:     { opacity: 0.7 },
  payBtnText:      { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  payBtnAmount:    { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, fontWeight: '600' },
  disclaimer:      { color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 12, fontWeight: '600' },
  
  bankDetailsBox:  { backgroundColor: C.surfaceHighlight, padding: 16, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border },
  bankDetailsTitle:{ fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  bankDetailsText: { fontSize: 13, color: C.textSecondary, marginBottom: 4 },
  uploadBtn:       { borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: SIZES.radius, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background, overflow: 'hidden' },
  slipImage:       { width: '100%', height: '100%' },

  // Success
  successScreen:   { flex: 1, backgroundColor: C.success + '15', justifyContent: 'center' },
  successCenter:   { alignItems: 'center', padding: 32 },
  successEmoji:    { fontSize: 80, marginBottom: 16 },
  successTitle:    { fontSize: 32, fontWeight: '900', color: C.success, textAlign: 'center', letterSpacing: -0.5 },
  successSub:      { color: C.textSecondary, marginTop: 8, fontSize: 16, textAlign: 'center', fontWeight: '500', marginBottom: 32 },
  
  successCard:     { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 24, width: '100%', ...SHADOWS.float, borderWidth: 1, borderColor: C.success + '80' },
  successVehicle:  { fontSize: 18, color: C.textPrimary, fontWeight: '800', textAlign: 'center' },
  successDivider:  { height: 1, backgroundColor: C.border, marginVertical: 16 },
  successDetail:   { fontSize: 14, color: C.textSecondary, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  successTotal:    { fontSize: 18, fontWeight: '900', color: C.success, textAlign: 'center' },
  
  homeBtn:         { backgroundColor: C.success, borderRadius: SIZES.radius, paddingHorizontal: 32, paddingVertical: 16, marginTop: 40, ...SHADOWS.float },
  homeBtnText:     { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }
});
