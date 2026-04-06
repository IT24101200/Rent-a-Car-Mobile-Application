import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function AllBookingsScreen() {
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

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={bookings}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.vehicleName}>{item.vehicle?.makeAndModel || 'Unknown Vehicle'}</Text>
              <View style={[styles.statusBadge, item.status === 'cancelled' && styles.statusCancelled]}>
                <Text style={[styles.statusText, item.status === 'cancelled' && styles.statusCancelledText]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>
            
            <Text style={styles.detail}>Customer: {item.user?.name} ({item.user?.email})</Text>
            <Text style={styles.detail}>Dates: {new Date(item.startDate).toLocaleDateString()} -> {new Date(item.endDate).toLocaleDateString()}</Text>
            <Text style={styles.detail}>Price: Rs. {item.totalPrice}</Text>
            
            <View style={styles.actionRow}>
              <Text style={styles.bookingId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
              {item.status !== 'cancelled' && (
                <TouchableOpacity
                  style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => forceCancel(item._id)}
                  disabled={actionId === item._id}
                >
                  {actionId === item._id 
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.btnText}>Force Cancel</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F8FAFC' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vehicleName:   { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
  statusBadge:   { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText:    { color: '#16A34A', fontWeight: '700', fontSize: 12 },
  statusCancelled: { backgroundColor: '#FEE2E2' },
  statusCancelledText: { color: '#DC2626' },
  detail:        { fontSize: 14, color: '#475569', marginBottom: 6 },
  actionRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, marginTop: 6 },
  bookingId:     { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  btn:           { backgroundColor: '#C81E1E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 13 }
});
