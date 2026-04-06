import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, SafeAreaView, TextInput
} from 'react-native';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const PRIMARY = '#1E3A8A';

export default function PaymentScreen({ route, navigation }) {
  const { vehicle, startDate, endDate, days, total } = route.params;
  const { user } = useAuth();
  const [loading,  setLoading]  = useState(false);
  const [paid,     setPaid]     = useState(false);
  
  // Payment States
  const [payMethod,  setPayMethod]  = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv,        setCvv]        = useState('');
  const [errors,     setErrors]     = useState({});

  const validateForm = () => {
    if (payMethod === 'cash') return true;
    
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
      // Create the booking in the backend
      await api.post('/api/bookings', {
        vehicleId:  vehicle._id,
        startDate,
        endDate,
        totalPrice: total,
        status:     'confirmed',
      });
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
      <SafeAreaView style={styles.successScreen}>
        <Text style={styles.successEmoji}>🎉</Text>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successSub}>Your vehicle has been successfully booked.</Text>
        <View style={styles.successCard}>
          <Text style={styles.successDetail}>🚗 {vehicle.makeAndModel}</Text>
          <Text style={styles.successDetail}>📅 {new Date(startDate).toLocaleDateString()} → {new Date(endDate).toLocaleDateString()}</Text>
          <Text style={styles.successTotal}>💰 Rs. {total.toLocaleString()} paid</Text>
        </View>
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })}>
          <Text style={styles.homeBtnText}>View My Bookings</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F0F4FF' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.pageTitle}>Checkout</Text>

        {/* Order Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📋 Order Summary</Text>
          <Row label="Vehicle"    value={vehicle.makeAndModel} />
          <Row label="Plate"      value={vehicle.licensePlate} />
          <Row label="From"       value={new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
          <Row label="To"         value={new Date(endDate).toLocaleDateString('en-GB',   { day: '2-digit', month: 'short', year: 'numeric' })} />
          <Row label="Duration"   value={`${days} day${days !== 1 ? 's' : ''}`} />
          <View style={styles.totalDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Payment Method (dummy) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>💳 Payment Method</Text>
          <View style={styles.payMethodRow}>
            <TouchableOpacity style={[styles.payMethod, payMethod === 'card' && styles.payMethodActive]} onPress={() => setPayMethod('card')}>
              <Text style={styles.payMethodIcon}>💳</Text>
              <Text style={styles.payMethodText}>Pay Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payMethod, payMethod === 'cash' && styles.payMethodActive]} onPress={() => setPayMethod('cash')}>
              <Text style={styles.payMethodIcon}>💵</Text>
              <Text style={styles.payMethodText}>Cash on Pickup</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Card Fields */}
          {payMethod === 'card' && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Card Number</Text>
              <View style={[styles.pseudoInput, errors.card && styles.inputErrorBorder]}>
                <Text>💳</Text>
                <TextInput style={styles.textInput} placeholder="1234 5678 9101 1121" keyboardType="numeric" maxLength={19} value={cardNumber} onChangeText={setCardNumber} />
              </View>
              {errors.card && <Text style={styles.errorText}>{errors.card}</Text>}
              
              <View style={{flexDirection: 'row', gap: 12, marginTop: 12}}>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <TextInput style={[styles.pseudoInput, errors.expiry && styles.inputErrorBorder]} placeholder="MM/YY" keyboardType="numeric" maxLength={5} value={expiryDate} onChangeText={setExpiryDate} />
                  {errors.expiry && <Text style={styles.errorText}>{errors.expiry}</Text>}
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput style={[styles.pseudoInput, errors.cvv && styles.inputErrorBorder]} placeholder="123" keyboardType="numeric" maxLength={3} secureTextEntry={true} value={cvv} onChangeText={setCvv} />
                  {errors.cvv && <Text style={styles.errorText}>{errors.cvv}</Text>}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Confirm Payment Button */}
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.btnDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={styles.payBtnText}>Confirm & Pay</Text>
                <Text style={styles.payBtnAmount}>Rs. {total.toLocaleString()}</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>🔒 Secure & encrypted payment</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container:       { padding: 20, paddingBottom: 40 },
  pageTitle:       { fontSize: 26, fontWeight: '800', color: PRIMARY, marginBottom: 20 },
  card:            { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 14, elevation: 4 },
  sectionTitle:    { fontSize: 16, fontWeight: '700', marginBottom: 14, color: '#1a1a1a' },
  row:             { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel:        { color: '#777', fontSize: 15 },
  rowValue:        { color: '#1a1a1a', fontWeight: '600', fontSize: 15, textAlign: 'right', flex: 1, marginLeft: 8 },
  totalDivider:    { height: 1, backgroundColor: '#EEEEEE', marginVertical: 12 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel:      { fontSize: 17, fontWeight: '800', color: '#1a1a1a' },
  totalValue:      { fontSize: 17, fontWeight: '800', color: PRIMARY },
  payMethodRow:    { flexDirection: 'row', gap: 12, marginBottom: 16 },
  payMethod:       { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, alignItems: 'center' },
  payMethodActive: { borderColor: PRIMARY, backgroundColor: '#EEF2FF' },
  payMethodIcon:   { fontSize: 22 },
  payMethodText:   { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  dummyCard:       { backgroundColor: PRIMARY, borderRadius: 14, padding: 20 },
  dummyCardNumber: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 4 },
  dummyCardName:   { color: '#C7D2FE', marginTop: 12, fontWeight: '500' },
  payBtn:          { backgroundColor: '#16A34A', borderRadius: 16, padding: 18, alignItems: 'center', elevation: 4 },
  btnDisabled:     { opacity: 0.7 },
  payBtnText:      { color: '#fff', fontWeight: '700', fontSize: 17 },
  payBtnAmount:    { color: '#BBF7D0', fontSize: 14, marginTop: 2 },
  disclaimer:      { color: '#9CA3AF', textAlign: 'center', marginTop: 14, fontSize: 13 },
  // Success
  successScreen:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F0FFF4' },
  successEmoji:    { fontSize: 72 },
  successTitle:    { fontSize: 28, fontWeight: '800', color: '#15803D', marginTop: 16 },
  successSub:      { color: '#555', marginTop: 8, fontSize: 15, textAlign: 'center' },
  successCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginTop: 24, elevation: 4 },
  successDetail:   { fontSize: 15, color: '#333', marginBottom: 8 },
  successTotal:    { fontSize: 16, fontWeight: '800', color: '#15803D', marginTop: 4 },
  homeBtn:         { backgroundColor: PRIMARY, borderRadius: 14, paddingHorizontal: 36, paddingVertical: 14, marginTop: 28 },
  homeBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  inputContainer:  { marginTop: 16, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  inputLabel:      { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  pseudoInput:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,  gap: 8 },
  textInput:       { flex: 1, color: '#111827', fontWeight: '600', fontSize: 15 },
  inputErrorBorder:{ borderColor: '#EF4444', borderWidth: 1.5 },
  errorText:       { color: '#EF4444', fontSize: 12, marginTop: 4, fontWeight: '500' }
});
