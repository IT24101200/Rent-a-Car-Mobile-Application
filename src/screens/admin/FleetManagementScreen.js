import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function FleetManagementScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={vehicles}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFleet(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.greenHeader}>
            <Text style={styles.title}>Fleet Directory</Text>
            <Text style={styles.subtitle}>{vehicles.length} active vehicles on platform</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🛣️</Text>
            <Text style={styles.emptyTitle}>Empty Fleet</Text>
            <Text style={styles.emptySub}>No active vehicles are currently accepted onto the platform.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.makeModel}>{item.makeAndModel}</Text>
              <Text style={styles.price}>Rs. {item.pricePerDay} <Text style={{fontSize: 12, color: colors.textSecondary}}>/ day</Text></Text>
            </View>
            <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
            <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
            {item.features ? <Text style={[styles.detail, {fontStyle: 'italic', fontSize: 12}]}>{item.features}</Text> : null}
            <View style={styles.actionRow}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>✅ Active Platform</Text>
              </View>
              <TouchableOpacity
                style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => delistVehicle(item._id)}
                disabled={actionId === item._id}
                activeOpacity={0.8}
              >
                {actionId === item._id 
                  ? <ActivityIndicator size="small" color={colors.surface} />
                  : <Text style={styles.btnText}>Delist</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:     { flex: 1, backgroundColor: C.background },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:       { padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },
  
  card:       { backgroundColor: C.surface, padding: 20, borderRadius: SIZES.radius, marginBottom: 16, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  makeModel:  { fontSize: 18, fontWeight: '900', color: C.textPrimary, flex: 1, letterSpacing: -0.2 },
  price:      { fontSize: 17, fontWeight: '900', color: C.success, letterSpacing: -0.5 },
  detail:     { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginBottom: 4 },
  
  actionRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16, marginTop: 12 },
  statusBadge:{ backgroundColor: C.success + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusPill },
  statusText: { fontWeight: '800', color: C.success, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  
  btn:        { backgroundColor: C.surfaceHighlight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusPill, borderWidth: 1, borderColor: C.border },
  btnText:    { color: C.error, fontWeight: '800', fontSize: 13 },
  
  emptyBox:   { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  emptySub:   { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500', fontSize: 15, lineHeight: 22 },
});
