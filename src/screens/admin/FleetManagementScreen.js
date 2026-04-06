import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function FleetManagementScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchFleet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/vehicles?status=accepted');
      setVehicles(res.data);
    } catch {
      Alert.alert('Error', 'Could not load fleet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFleet(); }, [fetchFleet]);

  const delistVehicle = (vehicleId) => {
    Alert.alert(
      'Delist Vehicle',
      'This will change the vehicle status to rejected, removing it from the platform. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delist', style: 'destructive', onPress: async () => {
            setActionId(vehicleId);
            try {
              // We reuse the existing status patch route used by approvals
              await api.patch(`/api/vehicles/${vehicleId}/status`, { validationStatus: 'rejected' });
              setVehicles(prev => prev.filter(v => v._id !== vehicleId));
            } catch {
              Alert.alert('Error', 'Failed to delist vehicle.');
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
        data={vehicles}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFleet(true)} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.makeModel}>{item.makeAndModel}</Text>
              <Text style={styles.price}>Rs. {item.pricePerDay}</Text>
            </View>
            <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
            <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
            {item.features ? <Text style={[styles.detail, {fontStyle: 'italic', fontSize: 12}]}>{item.features}</Text> : null}
            <View style={styles.actionRow}>
              <Text style={styles.statusText}>✅ Active on platform</Text>
              <TouchableOpacity
                style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => delistVehicle(item._id)}
                disabled={actionId === item._id}
              >
                {actionId === item._id 
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>Delist Vehicle</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: '#F8FAFC' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:       { padding: 16, paddingBottom: 40 },
  card:       { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  makeModel:  { fontSize: 18, fontWeight: '700', color: '#1E293B', flex: 1 },
  price:      { fontSize: 16, fontWeight: '800', color: '#059669' },
  detail:     { fontSize: 14, color: '#64748B', marginBottom: 16 },
  actionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  statusText: { fontWeight: '600', color: '#16A34A', fontSize: 14 },
  btn:        { backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnText:    { color: '#fff', fontWeight: '700' }
});
