import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, TextInput, ScrollView, Platform, StatusBar
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { BASE_URL } from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';

const FILTERS = ['All', 'SUV', 'Sedan', 'Luxury', 'Automatic', 'Hybrid', 'Petrol'];

// ── Vehicle Card Component ─────────────────────────────────────────
const VehicleCard = ({ item, onPress }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const isBooked = item.isCurrentlyBooked;
  const isAvail = item.isAvailable && !isBooked;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.9}>
      <View style={styles.cardImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: `${BASE_URL}${item.imageUrl}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Text style={{ fontSize: 40 }}>🚘</Text>
          </View>
        )}
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>Rs. {item.pricePerDay}</Text>
          <Text style={styles.priceSub}>/day</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.carName}>{item.makeAndModel}</Text>
          <View style={[styles.statusIndicator, { backgroundColor: isBooked ? colors.warning : (isAvail ? colors.success : colors.error) }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.surface }]} />
            <Text style={[styles.statusText, { color: colors.surface }]}>
              {isBooked ? 'Booked' : (isAvail ? 'Available' : 'Unavailable')}
            </Text>
          </View>
        </View>
        
        <Text style={styles.plateText}>{item.licensePlate} • {item.year || 'N/A'}</Text>
        
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}><Text style={styles.featureIcon}>⚙️</Text><Text style={styles.featureText}>{item.transmission || 'Auto'}</Text></View>
          <View style={styles.featureItem}><Text style={styles.featureIcon}>⛽</Text><Text style={styles.featureText}>{item.fuelType || 'Gas'}</Text></View>
          <View style={styles.featureItem}><Text style={styles.featureIcon}>💺</Text><Text style={styles.featureText}>{item.seats || '4'} Seats</Text></View>
        </View>
        
        {item.avgRating && (
          <View style={styles.ratingRow}>
            <Text style={styles.starIcon}>★</Text>
            <Text style={styles.ratingVal}>{item.avgRating}</Text>
            <Text style={styles.ratingCount}>({item.reviewCount} reviews)</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors, isDark } = useTheme();

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
      console.error('Vehicle fetch error:', err.code, err.message, err.response?.status);
      setError(err.code === 'ECONNABORTED'
        ? 'Connection timed out. Is the server running?'
        : `Could not load vehicles. (${err.code || err.message})`);
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

  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // ── Header ───────────────────────────────────────────────────────
  const ListHeader = () => (
    <View>
      {/* ── Emerald Green Header ── */}
      <View style={styles.greenHeader}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.brandLabel}>DriveEase</Text>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]}</Text>
            <Text style={styles.subGreeting}>Welcome to DriveEase</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content below header ── */}
      <View style={styles.contentArea}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search vehicles..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✖</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorTitle}>Connection Issue</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchVehicles()}>
          <Text style={styles.retryText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={displayVehicles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <VehicleCard item={item} onPress={handlePressVehicle} />}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏜️</Text>
            <Text style={styles.emptyText}>No vehicles match your search.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchVehicles(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.background },
  list:           { paddingBottom: 40 },
  centerScreen:   { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  
  // ── Green Header ──
  greenHeader:    { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greetingRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandLabel:     { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5, marginBottom: 4 },
  greeting:       { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subGreeting:    { color: 'rgba(255,255,255,0.6)', marginTop: 2, fontSize: 13, fontWeight: '500' },
  avatarBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText:     { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  
  // ── Content Area ──
  contentArea:    { paddingHorizontal: 20, paddingTop: 20 },
  searchBox:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: SIZES.radius, height: SIZES.inputHeight, paddingHorizontal: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  searchIcon:     { fontSize: 18, marginRight: 12, opacity: 0.5 },
  searchInput:    { flex: 1, height: '100%', color: C.textPrimary, fontSize: 15 },
  clearIcon:      { fontSize: 14, color: C.textMuted, padding: 4 },
  
  sectionTitle:   { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 12 },
  filterScroll:   { paddingVertical: 4, marginBottom: 8 },
  filterChip:     { paddingHorizontal: 20, height: 36, justifyContent: 'center', backgroundColor: C.surface, borderRadius: SIZES.radius, marginRight: 10, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText:     { color: C.textSecondary, fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#FFFFFF', fontWeight: '800' },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon:      { fontSize: 48, marginBottom: 16 },
  emptyText:      { color: C.textMuted, fontSize: 15, fontWeight: '600' },
  
  errorTitle:     { fontSize: 18, fontWeight: '800', color: C.textPrimary, marginBottom: 8 },
  errorMsg:       { color: C.textSecondary, textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 },
  retryBtn:       { backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: SIZES.radius },
  retryText:      { color: '#FFFFFF', fontWeight: '700' },
  
  // ── Vehicle Cards ──
  card:           { backgroundColor: C.surface, marginHorizontal: 20, borderRadius: SIZES.radius, marginBottom: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  cardImageContainer: { height: 180, width: '100%', backgroundColor: C.surfaceHighlight, position: 'relative' },
  cardImage:      { width: '100%', height: '100%' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceHighlight },
  priceTag:       { position: 'absolute', bottom: 12, right: 12, backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radius, flexDirection: 'row', alignItems: 'baseline' },
  priceText:      { fontWeight: '900', fontSize: 15, color: '#FFFFFF' },
  priceSub:       { fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginLeft: 2 },
  
  cardBody:       { padding: 16 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  carName:        { fontSize: 17, fontWeight: '800', color: C.textPrimary, flex: 1 },
  statusIndicator:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radius, marginLeft: 12 },
  statusDot:      { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText:     { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  plateText:      { color: C.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 14, marginTop: -2 },
  
  featuresRow:    { flexDirection: 'row', gap: 16, marginBottom: 14 },
  featureItem:    { flexDirection: 'row', alignItems: 'center' },
  featureIcon:    { fontSize: 14, marginRight: 6 },
  featureText:    { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
  
  ratingRow:      { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 4 },
  starIcon:       { color: C.warning, fontSize: 16, marginRight: 4, marginTop: -2 },
  ratingVal:      { fontSize: 13, fontWeight: '800', color: C.textPrimary, marginRight: 4 },
  ratingCount:    { fontSize: 12, color: C.textMuted, fontWeight: '600' }
});

