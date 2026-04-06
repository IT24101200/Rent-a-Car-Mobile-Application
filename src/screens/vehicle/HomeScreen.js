import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, SafeAreaView, TextInput, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../api/api';

const PRIMARY = '#1E3A8A';
const FILTERS = ['All', 'SUV', 'Sedan', 'Luxury', 'Automatic', 'Hybrid', 'Petrol'];

// ── Vehicle Card Component ─────────────────────────────────────────
const VehicleCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
    {item.imageUrl ? (
      <Image
        source={{ uri: `${BASE_URL}${item.imageUrl}` }}
        style={styles.cardImage}
        resizeMode="cover"
      />
    ) : (
      <View style={styles.cardImagePlaceholder}>
        <Text style={{ fontSize: 36 }}>🚗</Text>
      </View>
    )}
    <View style={styles.cardBody}>
      <View style={styles.cardHeader}>
        <Text style={styles.carName}>{item.makeAndModel}</Text>
        <View style={[styles.badge, { backgroundColor: item.isCurrentlyBooked ? '#FEF3C7' : (item.isAvailable ? '#E8F5E9' : '#FFEBEE') }]}>
          <Text style={[styles.badgeText, { color: item.isCurrentlyBooked ? '#D97706' : (item.isAvailable ? '#2E7D32' : '#C62828') }]}>
            {item.isCurrentlyBooked ? '⏳ Currently Booked' : (item.isAvailable ? '✅ Available' : '🚫 Unavailable')}
          </Text>
        </View>
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
        <Text style={styles.price}>💰 Rs. {item.pricePerDay}/day</Text>
      </View>
      <View style={{ marginBottom: 4 }}>
        <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
      </View>
      <View style={styles.bookBtn}>
        <Text style={styles.bookBtnText}>View Details →</Text>
      </View>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchVehicles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/vehicles?status=accepted');
      setVehicles(res.data);
    } catch (err) {
      setError(err.code === 'ECONNABORTED'
        ? 'Connection timed out. Is the server running?'
        : 'Could not load vehicles. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handlePressVehicle = (vehicle) => navigation.navigate('VehicleDetail', { vehicle });

  // ── Derived Data ─────────────────────────────────────────────────
  const displayVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // 1. Text Search Target
      const query = searchQuery.toLowerCase();
      const matchesSearch = v.makeAndModel.toLowerCase().includes(query) || v.licensePlate.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      // 2. Chip Filter Target
      if (activeFilter === 'All') return true;
      const target = activeFilter;
      const tType = v.type === target;
      const tTrans = v.transmission === target;
      const tFuel = v.fuelType === target;
      
      return tType || tTrans || tFuel;
    });
  }, [vehicles, searchQuery, activeFilter]);

  // ── Header ───────────────────────────────────────────────────────
  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>Find your perfect ride</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by make, model, or plate..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorTitle}>⚠️ Could Not Load</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchVehicles()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={displayVehicles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <VehicleCard item={item} onPress={handlePressVehicle} />}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={[styles.center, {paddingTop: 40}]}>
            <Text style={{fontSize: 40, marginBottom: 12}}>🏜️</Text>
            <Text style={styles.emptyText}>No vehicles match your search.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchVehicles(true)} colors={[PRIMARY]} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#F8FAFC' },
  list:         { paddingBottom: 40 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  
  headerContainer:{ backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, marginBottom: 20 },
  greetingRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:     { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  subGreeting:  { color: '#64748B', marginTop: 4, fontSize: 14, fontWeight: '500' },
  logoutBtn:    { backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  logoutText:   { color: '#DC2626', fontWeight: '700', fontSize: 13 },
  
  searchBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon:   { fontSize: 16, marginRight: 8 },
  searchInput:  { flex: 1, height: 44, color: '#0F172A', fontWeight: '600' },
  
  filterScroll: { paddingVertical: 4 },
  filterChip:   { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F1F5F9', borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterText:   { color: '#64748B', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff', fontWeight: '800' },

  loadingText:  { marginTop: 12, color: '#64748B', fontWeight: '500' },
  errorTitle:   { fontSize: 18, fontWeight: '800', color: '#DC2626', marginBottom: 8 },
  errorMsg:     { color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  retryBtn:     { marginTop: 16, backgroundColor: PRIMARY, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryText:    { color: '#fff', fontWeight: '800' },
  emptyText:    { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
  
  card:         { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  cardImage:    { width: '100%', height: 160 },
  cardImagePlaceholder: { width: '100%', height: 120, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  cardBody:     { padding: 14 },
  cardHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  carName:      { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1 },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  badgeText:    { fontSize: 11, fontWeight: '800' },
  cardRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  detail:       { color: '#64748B', fontSize: 13, fontWeight: '500' },
  price:        { color: '#059669', fontWeight: '800', fontSize: 15 },
  bookBtn:      { marginTop: 8, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 12, alignItems: 'center' },
  bookBtnText:  { color: PRIMARY, fontWeight: '800', fontSize: 14 },
});
