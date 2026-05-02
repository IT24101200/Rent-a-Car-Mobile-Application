import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, RefreshControl, ScrollView, StatusBar,
  TextInput as RNTextInput, Dimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api, { BASE_URL } from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 60) / 2; // 2-column grid with gaps

const FILTERS = ['All', 'SUV', 'Sedan', 'Luxury', 'Electric', 'Sport'];

// ── Vehicle Card Component ─────────────────────────────────────────
const VehicleCard = ({ item, onPress, colors }) => {
  const isBooked = item.isCurrentlyBooked;
  const isAvail = item.isAvailable && !isBooked;

  return (
    <TouchableOpacity 
      activeOpacity={0.85} 
      onPress={() => onPress(item)}
      disabled={!isAvail}
      style={[
        styles.cardWrapper, 
        { backgroundColor: colors.surface, borderColor: colors.border },
        !isAvail && { opacity: 0.5 },
      ]}
    >
      {/* Car Image */}
      <View style={styles.cardImageContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: `${BASE_URL}${item.imageUrl}` }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.surfaceHighlight }]}>
            <MaterialCommunityIcons name="car-sports" size={40} color={colors.textMuted} />
          </View>
        )}
        {!isAvail && (
          <View style={styles.unavailOverlay}>
            <Text style={styles.unavailText}>{isBooked ? 'BOOKED' : 'UNAVAILABLE'}</Text>
          </View>
        )}
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.makeAndModel}
        </Text>
        <Text style={[styles.cardSpecs, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.type || 'Car'} | {item.seats || '4'} Seats | {item.transmission || 'Auto'}
        </Text>
        
        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, { color: colors.textPrimary }]}>
            Rs.{item.pricePerDay}<Text style={[styles.cardPriceUnit, { color: colors.textMuted }]}>/day</Text>
          </Text>
          <View style={[styles.viewDetailsBadge, { backgroundColor: colors.primary + '15' }]}>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
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

  const displayVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = v.makeAndModel.toLowerCase().includes(query) || v.licensePlate.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (activeFilter === 'All') return true;
      return v.type === activeFilter || v.transmission === activeFilter || v.fuelType === activeFilter;
    });
  }, [vehicles, searchQuery, activeFilter]);

  // ── Header ───────────────────────────────────────────────────────
  const ListHeader = () => (
    <View style={[headerStyles.container, { backgroundColor: colors.background }]}>
      
      {/* Top Bar: Brand + Avatar + Bell */}
      <View style={headerStyles.topBar}>
        <Text style={[headerStyles.brandText, { color: colors.primary }]}>
          Drive<Text style={{ color: colors.textPrimary }}>Ease</Text>
        </Text>
        <View style={headerStyles.topBarRight}>
          <TouchableOpacity 
            style={[headerStyles.avatarCircle, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]} 
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={[headerStyles.avatarText, { color: colors.textPrimary }]}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              {user?.name?.split(' ')[1]?.charAt(0)?.toUpperCase() || ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[headerStyles.bellBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Banner */}
      <View style={[headerStyles.heroBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=800&auto=format&fit=crop' }}
          style={headerStyles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={headerStyles.heroOverlay}
        >
          <Text style={headerStyles.heroSubtitle}>Your Premium Ride Awaits</Text>
          <Text style={headerStyles.heroTitle}>Find Your Perfect Drive</Text>
          <View style={[headerStyles.heroIndicator, { backgroundColor: colors.primary }]} />
        </LinearGradient>
      </View>

      {/* Where to? Search Section */}
      <Text style={[headerStyles.sectionLabel, { color: colors.textPrimary }]}>Search Your Ride</Text>
      <View style={[headerStyles.searchBar, { borderColor: colors.primary, backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
        <RNTextInput
          style={[headerStyles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search Vehicle Model..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={headerStyles.filterScroll}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity 
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                headerStyles.chip,
                { 
                  backgroundColor: isActive ? colors.primary : 'transparent',
                  borderColor: isActive ? colors.primary : colors.textMuted,
                }
              ]}
            >
              <Text style={[
                headerStyles.chipText,
                { color: isActive ? colors.textOnPrimary : colors.textPrimary }
              ]}>
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section Title */}
      <Text style={[headerStyles.popularTitle, { color: colors.textPrimary }]}>Popular Vehicles</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="wifi-off" size={56} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Connection Issue</Text>
        <Text style={[styles.errorMsg, { color: colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={() => fetchVehicles()}>
          <Text style={[styles.retryText, { color: colors.textOnPrimary }]}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <FlatList
        data={displayVehicles}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <VehicleCard item={item} onPress={handlePressVehicle} colors={colors} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="car-off" size={56} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No vehicles match your search.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchVehicles(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

// ── HEADER STYLES ──────────────────────────────────────────────────
const headerStyles = StyleSheet.create({
  container: { paddingBottom: 8 },
  topBar: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  brandText: { fontSize: 26, fontWeight: '800' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { 
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  avatarText: { fontSize: 14, fontWeight: '800' },
  bellBtn: { 
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },

  // Hero Banner
  heroBanner: { 
    marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', 
    height: 180, marginBottom: 24, borderWidth: 1,
  },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 20, paddingTop: 40,
  },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 4 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 },
  heroIndicator: { width: 40, height: 4, borderRadius: 2 },

  // Search
  sectionLabel: { fontSize: 22, fontWeight: '800', paddingHorizontal: 20, marginBottom: 12 },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20,
    borderWidth: 1.5, borderRadius: 30, paddingHorizontal: 18, height: 50, marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', height: '100%' },

  // Filters
  filterScroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  chip: { 
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  // Popular Section
  popularTitle: { fontSize: 20, fontWeight: '800', paddingHorizontal: 20, marginBottom: 16 },
});

// ── MAIN STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: 40 },
  columnWrapper: { paddingHorizontal: 20, gap: 16, marginBottom: 16 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', marginTop: 16 },

  errorTitle: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  errorMsg: { textAlign: 'center', paddingHorizontal: 40, marginBottom: 24, fontSize: 15 },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  retryText: { fontWeight: '800', fontSize: 15 },

  // ── Vehicle Cards (2-column grid) ──
  cardWrapper: { 
    flex: 1, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, maxWidth: CARD_WIDTH,
  },
  cardImageContainer: { width: '100%', height: 120 },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  cardSpecs: { fontSize: 11, fontWeight: '600', marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 15, fontWeight: '900' },
  cardPriceUnit: { fontSize: 11, fontWeight: '600' },
  viewDetailsBadge: { 
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  unavailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  unavailText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
});
