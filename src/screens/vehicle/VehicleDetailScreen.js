import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  Alert, ActivityIndicator, SafeAreaView, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api, { BASE_URL } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const PRIMARY = '#1E3A8A';

export default function VehicleDetailScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { user } = useAuth();

  // Booking State
  const [startDate, setStartDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // Default to 1 hr from now
  const [endDate, setEndDate] = useState(new Date(Date.now() + 25 * 60 * 60 * 1000)); // Default to 25 hrs from now
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [mode, setMode] = useState('date');
  const [bookingLoading, setBookingLoading] = useState(false);

  const calculateDays = () => {
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // Minimum 1 day
  };

  const submitBooking = async () => {
    if (endDate <= startDate) {
      return Alert.alert('Invalid Dates', 'End date must be after start date.');
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
    
    // Navigate straight to the Payment Screen instead of instantly booking it
    navigation.navigate('Payment', {
      vehicle,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days,
      total: totalPrice
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Image */}
        {vehicle.imageUrl ? (
          <Image
            source={{ uri: `${BASE_URL}${vehicle.imageUrl}` }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={{ fontSize: 60 }}>🚗</Text>
          </View>
        )}

        {/* Header Block */}
        <View style={styles.heroSection}>
          <Text style={styles.vehicleTitle}>{vehicle.makeAndModel}</Text>
          <Text style={styles.priceText}>Rs. {vehicle.pricePerDay} <Text style={{fontSize: 16, color: '#64748B'}}>/ day</Text></Text>
          <View style={[styles.badge, { backgroundColor: vehicle.isCurrentlyBooked ? '#FEF3C7' : (vehicle.isAvailable ? '#DCFCE7' : '#FEE2E2'), marginTop: 12 }]}>
            <Text style={[styles.badgeText, { color: vehicle.isCurrentlyBooked ? '#D97706' : (vehicle.isAvailable ? '#16A34A' : '#DC2626') }]}>
              {vehicle.isCurrentlyBooked ? '⏳ Currently Booked' : (vehicle.isAvailable ? '✅ Ready to Book' : '🚫 Currently Unavailable')}
            </Text>
          </View>
        </View>

        {/* Specs Grid */}
        <Text style={styles.sectionTitle}>Specifications</Text>
        <View style={styles.specGrid}>
          <View style={styles.specBox}>
            <Text style={styles.specIcon}>🏎️</Text>
            <Text style={styles.specLabel}>Type</Text>
            <Text style={styles.specValue}>{vehicle.type || 'N/A'}</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specIcon}>⚙️</Text>
            <Text style={styles.specLabel}>Transmission</Text>
            <Text style={styles.specValue}>{vehicle.transmission || 'N/A'}</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specIcon}>⛽</Text>
            <Text style={styles.specLabel}>Fuel</Text>
            <Text style={styles.specValue}>{vehicle.fuelType || 'N/A'}</Text>
          </View>
          <View style={styles.specBox}>
            <Text style={styles.specIcon}>💺</Text>
            <Text style={styles.specLabel}>Seats</Text>
            <Text style={styles.specValue}>{vehicle.seats || 'N/A'}</Text>
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Manufacture Year</Text>
            <Text style={styles.infoValue}>{vehicle.year || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License Plate</Text>
            <Text style={styles.infoValue}>{vehicle.licensePlate}</Text>
          </View>
          {vehicle.features ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[styles.infoLabel, { marginBottom: 8 }]}>Vehicle Features</Text>
              <Text style={styles.featuresText}>{vehicle.features}</Text>
            </View>
          ) : null}
        </View>

      </ScrollView>

      {/* Fixed Checkout Bar */}
      {vehicle.isAvailable && (
        <View style={styles.checkoutBar}>
          <Text style={styles.checkoutTitle}>Select Rental Dates:</Text>
          
          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerLabel}>Pick-up</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={startDate} mode="datetime" display="default" minimumDate={new Date()} onChange={(e, d) => d && setStartDate(d)} />
              ) : (
                <View style={{flexDirection: 'row', gap: 5}}>
                  <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowStartPicker(true)}>
                    <Text style={styles.dateBtnText}>{startDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowStartTimePicker(true)}>
                    <Text style={styles.dateBtnText}>{startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <Text style={styles.pickerArrow}>→</Text>
            <View style={styles.pickerCol}>
              <Text style={styles.pickerLabel}>Drop-off</Text>
              {Platform.OS === 'ios' ? (
                <DateTimePicker value={endDate} mode="datetime" display="default" minimumDate={startDate} onChange={(e, d) => d && setEndDate(d)} />
              ) : (
                <View style={{flexDirection: 'row', gap: 5}}>
                  <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowEndPicker(true)}>
                    <Text style={styles.dateBtnText}>{endDate.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.dateBtn, {flex: 1}]} onPress={() => setShowEndTimePicker(true)}>
                    <Text style={styles.dateBtnText}>{endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Android Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startDate} mode="date" display="default" minimumDate={new Date()}
              onChange={(e, d) => { setShowStartPicker(false); if (d) { const newDate = new Date(startDate); newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setStartDate(newDate); } }}
            />
          )}
          {showStartTimePicker && (
            <DateTimePicker
              value={startDate} mode="time" display="default"
              onChange={(e, d) => { setShowStartTimePicker(false); if (d) { const newDate = new Date(startDate); newDate.setHours(d.getHours(), d.getMinutes()); setStartDate(newDate); } }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={endDate} mode="date" display="default" minimumDate={startDate}
              onChange={(e, d) => { setShowEndPicker(false); if (d) { const newDate = new Date(endDate); newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); setEndDate(newDate); } }}
            />
          )}
          {showEndTimePicker && (
            <DateTimePicker
              value={endDate} mode="time" display="default"
              onChange={(e, d) => { setShowEndTimePicker(false); if (d) { const newDate = new Date(endDate); newDate.setHours(d.getHours(), d.getMinutes()); setEndDate(newDate); } }}
            />
          )}

          <TouchableOpacity style={[styles.submitBtn, (bookingLoading || vehicle.isCurrentlyBooked) && {opacity: 0.7}]} onPress={submitBooking} disabled={bookingLoading || vehicle.isCurrentlyBooked}>
            {bookingLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{vehicle.isCurrentlyBooked ? 'Currently Unavailable' : `Review & Book • Rs. ${(calculateDays() * vehicle.pricePerDay).toLocaleString()}`}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent:  { paddingBottom: 20 },
  heroImage:      { width: '100%', height: 260 },
  heroPlaceholder:{ width: '100%', height: 200, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  heroSection:    { backgroundColor: '#fff', padding: 24, paddingTop: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, alignItems: 'center', marginBottom: 24 },
  vehicleTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  priceText:    { fontSize: 22, fontWeight: '800', color: '#059669', marginTop: 8 },
  badge:        { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  badgeText:    { fontWeight: '800', fontSize: 13 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#334155', marginHorizontal: 20, marginBottom: 12 },
  specGrid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, justifyContent: 'space-between', marginBottom: 24 },
  specBox:      { width: '48%', backgroundColor: '#fff', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9' },
  specIcon:     { fontSize: 24, marginBottom: 4 },
  specLabel:    { fontSize: 12, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  specValue:    { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  
  infoCard:     { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 20, elevation: 1, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel:    { fontSize: 14, color: '#64748B', fontWeight: '600' },
  infoValue:    { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  featuresText: { fontSize: 14, color: '#334155', lineHeight: 22 },

  checkoutBar:  { backgroundColor: '#fff', padding: 20, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  checkoutTitle:{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  pickerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pickerCol:    { flex: 1 },
  pickerArrow:  { fontSize: 20, color: '#94A3B8', marginHorizontal: 10 },
  pickerLabel:  { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  dateBtn:      { backgroundColor: '#F1F5F9', paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  dateBtnText:  { color: '#0F172A', fontWeight: '700', fontSize: 15 },
  submitBtn:    { backgroundColor: PRIMARY, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText:{ color: '#fff', fontWeight: '800', fontSize: 16 }
});
