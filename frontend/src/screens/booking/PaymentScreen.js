import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, StatusBar, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

import Card from '../../components/atoms/Card';
import Button from '../../components/atoms/Button';
import TextInputAtom from '../../components/atoms/TextInput';

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


  // ── Premium Success Screen ────────────────────────────────────────────────
  if (paid) {
    return (
      <View style={styles.successScreen}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.successCenter}>
          <View style={styles.successIconBox}>
            <Text style={styles.successEmoji}>{payMethod === 'bank_transfer' ? '⏳' : '✨'}</Text>
          </View>
          <Text style={styles.successTitle}>{payMethod === 'bank_transfer' ? 'Verification Pending' : 'Payment Successful!'}</Text>
          <Text style={styles.successSub}>{payMethod === 'bank_transfer' ? 'Your transfer slip has been securely uploaded and is awaiting approval.' : 'Your booking is confirmed. Your digital keys are ready.'}</Text>
          
          <View style={styles.successReceipt}>
            <View style={styles.receiptHoleTop} />
            <View style={styles.receiptHoleBottom} />
            <Text style={styles.successVehicle}>{vehicle.makeAndModel}</Text>
            <View style={styles.successDashedDivider} />
            <Text style={styles.successDetail}>{new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}  →  {new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text>
            <View style={styles.successDashedDivider} />
            <Text style={styles.successTotal}>Rs. {total.toLocaleString()}</Text>
            <Text style={styles.successTotalLabel}>TOTAL PAID</Text>
          </View>
          
          <Button 
            label="View My Bookings" 
            onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })} 
            size="large"
            style={{ width: '100%', marginTop: 24 }}
          />
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
        <Card style={{ marginBottom: 20 }}>
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
        </Card>

        {/* Payment Method */}
        <Card>
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

          {/* Interactive Digital Credit Card Visualizer */}
          {payMethod === 'card' && (
            <View style={styles.creditCardVisual}>
              <View style={styles.ccHeader}>
                <Text style={styles.ccChip}>💳</Text>
                <Text style={styles.ccBrand}>DRIVEEASE PAY</Text>
              </View>
              <Text style={styles.ccNumber}>
                {cardNumber ? cardNumber.replace(/(.{4})/g, '$1 ').trim() : '••••  ••••  ••••  ••••'}
              </Text>
              <View style={styles.ccFooter}>
                <View>
                  <Text style={styles.ccLabel}>CARD HOLDER</Text>
                  <Text style={styles.ccValue}>{user?.name || 'GUEST USER'}</Text>
                </View>
                <View>
                  <Text style={styles.ccLabel}>EXPIRES</Text>
                  <Text style={styles.ccValue}>{expiryDate || 'MM/YY'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Interactive Card Fields */}
          {payMethod === 'card' && (
            <View style={styles.inputContainer}>
              <TextInputAtom
                label="Card Number"
                placeholder="1234 5678 9101 1121"
                type="number"
                maxLength={19}
                value={cardNumber}
                onChangeText={setCardNumber}
                icon="credit-card-outline"
                error={errors.card}
              />
              
              <View style={{flexDirection: 'row', gap: 16}}>
                <View style={{flex: 1}}>
                  <TextInputAtom
                    label="Expiry Date"
                    placeholder="MM/YY"
                    type="number"
                    maxLength={5}
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    icon="calendar-blank"
                    error={errors.expiry}
                  />
                </View>
                <View style={{flex: 1}}>
                  <TextInputAtom
                    label="CVV"
                    placeholder="123"
                    type="number"
                    maxLength={3}
                    secureTextEntry={true}
                    value={cvv}
                    onChangeText={setCvv}
                    icon="lock-outline"
                    error={errors.cvv}
                  />
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
        </Card>

        {/* Confirm Payment Button */}
        <Button
          label={`Confirm Booking ${payMethod === 'card' ? '& Pay' : ''}\nRs. ${total.toLocaleString()}`}
          onPress={handlePayment}
          loading={loading}
          disabled={loading}
          size="large"
          style={{ marginTop: 12 }}
        />

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
  
  inputContainer:  { marginTop: 12 },
  disclaimer:      { color: C.textMuted, textAlign: 'center', marginTop: 20, fontSize: 12, fontWeight: '600' },
  
  // ── Digital Credit Card ──
  creditCardVisual: { backgroundColor: '#0f172a', borderRadius: 24, padding: 24, marginBottom: 24, ...SHADOWS.float, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  ccHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  ccChip:         { fontSize: 32 },
  ccBrand:        { color: 'rgba(255,255,255,0.3)', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', fontSize: 12 },
  ccNumber:       { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 4, marginBottom: 32, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 4 },
  ccFooter:       { flexDirection: 'row', justifyContent: 'space-between' },
  ccLabel:        { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  ccValue:        { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  
  bankDetailsBox:  { backgroundColor: C.surfaceHighlight, padding: 16, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border },
  bankDetailsTitle:{ fontSize: 14, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  bankDetailsText: { fontSize: 13, color: C.textSecondary, marginBottom: 4 },
  uploadBtn:       { borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: SIZES.radius, height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background, overflow: 'hidden' },
  slipImage:       { width: '100%', height: '100%' },

  // Premium Success Screen
  successScreen:   { flex: 1, backgroundColor: C.background, justifyContent: 'center' },
  successCenter:   { alignItems: 'center', padding: 24 },
  successIconBox:  { width: 100, height: 100, backgroundColor: C.primaryLight, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: C.primary, ...SHADOWS.float },
  successEmoji:    { fontSize: 50 },
  successTitle:    { fontSize: 36, fontWeight: '900', color: C.textPrimary, textAlign: 'center', letterSpacing: -1, lineHeight: 40 },
  successSub:      { color: C.textSecondary, marginTop: 12, fontSize: 16, textAlign: 'center', fontWeight: '600', marginBottom: 40, paddingHorizontal: 20 },
  
  successReceipt:  { backgroundColor: C.surface, borderRadius: 24, padding: 32, width: '100%', ...SHADOWS.float, position: 'relative', borderWidth: 1, borderColor: C.border },
  receiptHoleTop:  { position: 'absolute', top: -15, left: '50%', marginLeft: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: C.background },
  receiptHoleBottom:{ position: 'absolute', bottom: -15, left: '50%', marginLeft: -15, width: 30, height: 30, borderRadius: 15, backgroundColor: C.background },
  successVehicle:  { fontSize: 22, color: C.textPrimary, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  successDashedDivider: { height: 1, borderBottomWidth: 2, borderBottomColor: C.border, borderStyle: 'dashed', marginVertical: 20 },
  successDetail:   { fontSize: 16, color: C.textSecondary, fontWeight: '800', textAlign: 'center' },
  successTotal:    { fontSize: 36, fontWeight: '900', color: C.primary, textAlign: 'center' },
  successTotalLabel:{ fontSize: 10, fontWeight: '900', color: C.textMuted, textAlign: 'center', letterSpacing: 2, marginTop: 4 },
});
