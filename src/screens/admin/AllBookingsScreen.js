import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function AllBookingsScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/admin/bookings');
      setBookings(res.data);
    } catch {
      Alert.alert('Error', 'Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const forceCancel = (bookingId) => {
    Alert.alert(
      'Force Cancel Booking',
      'This action will cancel the booking without the users consent. Are you sure?',
      [
        { text: 'Back', style: 'cancel' },
        { text: 'Force Cancel', style: 'destructive', onPress: async () => {
            setActionId(bookingId);
            try {
              const res = await api.patch(`/api/admin/bookings/${bookingId}/force-cancel`);
              setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: res.data.status } : b));
            } catch {
              Alert.alert('Error', 'Failed to force cancel booking.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={bookings}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.greenHeader}>
            <Text style={styles.title}>All Bookings</Text>
            <Text style={styles.subtitle}>{bookings.length} total bookings recorded</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>No Bookings</Text>
            <Text style={styles.emptySub}>No bookings have been made on the platform yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || 'Unknown Vehicle'}</Text>
              <View style={[
                  styles.statusBadge, 
                  item.status === 'cancelled' && styles.statusCancelled,
                  item.status === 'completed' && styles.statusCompleted,
                  item.status === 'active' && styles.statusActive,
                  item.status === 'returning' && styles.statusReturning
                ]}>
                <Text style={[
                    styles.statusText, 
                    item.status === 'cancelled' && styles.statusCancelledText,
                    item.status === 'completed' && styles.statusCompletedText,
                    item.status === 'active' && styles.statusActiveText,
                    item.status === 'returning' && styles.statusReturningText
                  ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text style={styles.detail}><Text style={{fontWeight: '700', color: colors.textPrimary}}>Customer:</Text> {item.user?.name} ({item.user?.email})</Text>
            <Text style={styles.detail}><Text style={{fontWeight: '700', color: colors.textPrimary}}>Dates:</Text> {new Date(item.startDate).toLocaleDateString()} -> {new Date(item.endDate).toLocaleDateString()}</Text>
            <Text style={styles.price}>Rs. {item.totalPrice?.toLocaleString() || 0}</Text>
            
            <View style={styles.actionRow}>
              <Text style={styles.bookingId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
              {item.status !== 'cancelled' && item.status !== 'completed' && (
                <TouchableOpacity
                  style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => forceCancel(item._id)}
                  disabled={actionId === item._id}
                  activeOpacity={0.8}
                >
                  {actionId === item._id 
                    ? <ActivityIndicator size="small" color={colors.surface} />
                    : <Text style={styles.btnText}>Force Cancel</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:          { padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },

  card:          { backgroundColor: C.surface, padding: 20, borderRadius: SIZES.radius, marginBottom: 16, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  vehicleName:   { fontSize: 18, fontWeight: '900', color: C.textPrimary, flex: 1, letterSpacing: -0.2 },
  
  statusBadge:   { backgroundColor: C.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: SIZES.radiusPill, marginLeft: 12 },
  statusText:    { color: C.primary, fontWeight: '800', fontSize: 11, letterSpacing: 0.5 },
  
  statusCancelled: { backgroundColor: C.error + '15' },
  statusCancelledText: { color: C.error },
  
  statusCompleted: { backgroundColor: C.textSecondary + '15' },
  statusCompletedText: { color: C.textSecondary },

  statusActive: { backgroundColor: C.success + '15' },
  statusActiveText: { color: C.success },

  statusReturning: { backgroundColor: C.warning + '15' },
  statusReturningText: { color: C.warning },

  detail:        { fontSize: 14, color: C.textSecondary, marginBottom: 8, fontWeight: '500' },
  price:         { fontSize: 18, fontWeight: '900', color: C.success, marginTop: 4, marginBottom: 8, letterSpacing: -0.5 },
  
  actionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 8 },
  bookingId:     { color: C.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  
  btn:           { backgroundColor: C.error, paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusPill, ...SHADOWS.light },
  btnText:       { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  emptyBox:      { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji:    { fontSize: 60, marginBottom: 16 },
  emptyTitle:    { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  emptySub:      { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500', fontSize: 15, lineHeight: 22 },
});
