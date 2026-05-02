import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

import Card from '../../components/atoms/Card';
import Button from '../../components/atoms/Button';

// Premium date picker helper
const DatePickerRow = ({ label, date, onDecrement, onIncrement, styles }) => (
  <View style={styles.dateRow}>
    <Text style={styles.dateLabel}>{label}</Text>
    <View style={styles.dateControl}>
      <TouchableOpacity style={styles.dateBtn} onPress={onDecrement} activeOpacity={0.7}><Text style={styles.dateBtnText}>—</Text></TouchableOpacity>
      <View style={styles.dateDisplay}>
        <Text style={styles.dateDisplayMonth}>{date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}</Text>
        <Text style={styles.dateDisplayDay}>{date.toLocaleDateString('en-GB', { day: '2-digit' })}</Text>
        <Text style={styles.dateDisplayYear}>{date.toLocaleDateString('en-GB', { year: 'numeric' })}</Text>
      </View>
      <TouchableOpacity style={styles.dateBtn} onPress={onIncrement} activeOpacity={0.7}><Text style={styles.dateBtnText}>+</Text></TouchableOpacity>
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
            <Text style={styles.vehiclePrice}>Rs. {vehicle.pricePerDay} / day</Text>
          </View>
        </View>

        {/* Date Selection */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Rental Horizon</Text>
          <View style={styles.calendarBox}>
            <DatePickerRow
              label="PICK-UP"
              date={startDate}
              onDecrement={() => setStartDate(d => addDays(d, -1))}
              onIncrement={() => setStartDate(d => addDays(d, 1))}
              styles={styles}
            />
            <View style={styles.divider} />
            <DatePickerRow
              label="DROP-OFF"
              date={endDate}
              onDecrement={() => setEndDate(d => addDays(d, -1))}
              onIncrement={() => setEndDate(d => addDays(d, 1))}
              styles={styles}
            />
          </View>
        </View>

        {/* Price Breakdown (Receipt Style) */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptTopRing} />
          <Text style={styles.receiptTitle}>RECEIPT</Text>
          
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Duration</Text>
            <Text style={styles.breakdownValue}>{days} day{days !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Price per day</Text>
            <Text style={styles.breakdownValue}>Rs. {vehicle.pricePerDay.toLocaleString()}</Text>
          </View>
          
          <View style={styles.dashedLine} />
          
          <View style={[styles.breakdownRow, { marginTop: 10 }]}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <Button 
          label="Proceed to Payment →" 
          onPress={handleConfirmBooking} 
          loading={loading} 
          disabled={loading} 
          size="large"
          style={{ marginTop: 20 }}
        />
      </ScrollView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 60, paddingBottom: 30, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, ...SHADOWS.float },
  headerTitle:     { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub:       { color: 'rgba(255,255,255,0.8)', marginTop: 4, fontWeight: '700', fontSize: 15 },
  container:       { padding: 20, paddingBottom: 40 },
  
  vehicleCard:     { backgroundColor: C.primary, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: -40, ...SHADOWS.float },
  vehicleEmoji:    { fontSize: 48 },
  vehicleName:     { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  vehiclePlate:    { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '700', fontSize: 13 },
  vehiclePrice:    { color: '#FFFFFF', fontWeight: '800', marginTop: 8, fontSize: 16 },
  
  calendarSection: { marginBottom: 24 },
  sectionTitle:    { fontSize: 14, fontWeight: '900', color: C.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  calendarBox:     { backgroundColor: C.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  
  dateRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  dateLabel:       { fontSize: 12, color: C.textSecondary, fontWeight: '800', letterSpacing: 0.5 },
  dateControl:     { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dateBtn:         { backgroundColor: C.background, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  dateBtnText:     { fontSize: 18, color: C.primary, fontWeight: '600' },
  
  dateDisplay:     { alignItems: 'center', width: 60 },
  dateDisplayMonth:{ fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 1 },
  dateDisplayDay:  { fontSize: 22, fontWeight: '900', color: C.textPrimary, lineHeight: 26 },
  dateDisplayYear: { fontSize: 10, fontWeight: '700', color: C.textSecondary },
  
  divider:         { height: 1, backgroundColor: C.border, marginVertical: 16 },
  
  receiptCard:     { backgroundColor: C.surfaceHighlight, borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: C.border, ...SHADOWS.light, position: 'relative', overflow: 'hidden' },
  receiptTopRing:  { position: 'absolute', top: -15, right: 30, width: 30, height: 30, borderRadius: 15, backgroundColor: C.background, borderWidth: 1, borderColor: C.border },
  receiptTitle:    { fontSize: 11, fontWeight: '900', color: C.textMuted, letterSpacing: 2, marginBottom: 20, textAlign: 'center' },
  
  breakdownRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  breakdownLabel:  { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  breakdownValue:  { color: C.textPrimary, fontWeight: '800', fontSize: 15 },
  
  dashedLine:      { height: 1, borderBottomWidth: 1, borderBottomColor: C.border, borderStyle: 'dashed', marginVertical: 16 },
  
  totalLabel:      { fontSize: 18, fontWeight: '900', color: C.textPrimary },
  totalValue:      { fontSize: 22, fontWeight: '900', color: C.primary },
});

