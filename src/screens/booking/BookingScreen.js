import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

// Simple date picker helper (no extra library needed)
const DatePickerRow = ({ label, date, onDecrement, onIncrement, styles }) => (
  <View style={styles.dateRow}>
    <Text style={styles.dateLabel}>{label}</Text>
    <View style={styles.dateControl}>
      <TouchableOpacity style={styles.dateBtn} onPress={onDecrement}><Text style={styles.dateBtnText}>‹</Text></TouchableOpacity>
      <Text style={styles.dateValue}>{date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
      <TouchableOpacity style={styles.dateBtn} onPress={onIncrement}><Text style={styles.dateBtnText}>›</Text></TouchableOpacity>
    </View>
  </View>
);

const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };

export default function BookingScreen({ route, navigation }) {
  const { vehicle } = route.params;
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const today = new Date();
  const [startDate, setStartDate] = useState(today);
  const [endDate,   setEndDate]   = useState(addDays(today, 1));
  const [loading,   setLoading]   = useState(false);

  const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
  const total = days * vehicle.pricePerDay;

  const handleConfirmBooking = async () => {
    if (endDate <= startDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return;
    }
    setLoading(true);
    // Small artificial delay to simulate booking creation
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Payment', { vehicle, startDate: startDate.toISOString(), endDate: endDate.toISOString(), days, total });
    }, 800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Green Header ── */}
      <View style={styles.greenHeader}>
        <Text style={styles.headerTitle}>Book Vehicle</Text>
        <Text style={styles.headerSub}>{vehicle.makeAndModel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Vehicle Summary Card */}
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleEmoji}>🚗</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.vehicleName}>{vehicle.makeAndModel}</Text>
            <Text style={styles.vehiclePlate}>🔖 {vehicle.licensePlate}</Text>
            <Text style={styles.vehiclePrice}>💰 Rs. {vehicle.pricePerDay}/day</Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📅 Select Rental Dates</Text>

          <DatePickerRow
            label="Start Date"
            date={startDate}
            onDecrement={() => setStartDate(d => addDays(d, -1))}
            onIncrement={() => setStartDate(d => addDays(d, 1))}
            styles={styles}
          />
          <View style={styles.divider} />
          <DatePickerRow
            label="End Date"
            date={endDate}
            onDecrement={() => setEndDate(d => addDays(d, -1))}
            onIncrement={() => setEndDate(d => addDays(d, 1))}
            styles={styles}
          />
        </View>

        {/* Price Breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🧾 Price Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Duration</Text>
            <Text style={styles.breakdownValue}>{days} day{days !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Price/day</Text>
            <Text style={styles.breakdownValue}>Rs. {vehicle.pricePerDay}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleConfirmBooking}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.btnText}>Proceed to Payment →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:       { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500', fontSize: 14 },
  container:       { padding: 20, paddingBottom: 40 },
  vehicleCard:     { backgroundColor: C.primary, borderRadius: SIZES.radius, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, ...SHADOWS.float },
  vehicleEmoji:    { fontSize: 42 },
  vehicleName:     { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  vehiclePlate:    { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '600' },
  vehiclePrice:    { color: 'rgba(255,255,255,0.9)', fontWeight: '700', marginTop: 2 },
  card:            { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  sectionTitle:    { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 16 },
  dateRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  dateLabel:       { fontSize: 15, color: C.textSecondary, fontWeight: '500' },
  dateControl:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBtn:         { backgroundColor: C.iconCircleBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: SIZES.radius },
  dateBtnText:     { fontSize: 18, color: C.primary, fontWeight: '700' },
  dateValue:       { fontSize: 14, fontWeight: '700', color: C.textPrimary, minWidth: 110, textAlign: 'center' },
  divider:         { height: 1, backgroundColor: C.border, marginVertical: 10 },
  breakdownRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  breakdownLabel:  { color: C.textSecondary, fontSize: 15 },
  breakdownValue:  { color: C.textPrimary, fontWeight: '600', fontSize: 15 },
  totalRow:        { borderTopWidth: 1, borderTopColor: C.border, marginTop: 6, paddingTop: 12 },
  totalLabel:      { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  totalValue:      { fontSize: 17, fontWeight: '800', color: C.primary },
  btn:             { backgroundColor: C.primary, borderRadius: SIZES.radius, padding: 18, alignItems: 'center', ...SHADOWS.float },
  btnDisabled:     { opacity: 0.7 },
  btnText:         { color: '#FFFFFF', fontWeight: '700', fontSize: 17 },
});

