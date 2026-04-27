import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, Dimensions, RefreshControl, StatusBar
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import api from '../../api/api';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const screenWidth = Dimensions.get('window').width;

export default function OwnerAnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const StatCard = ({ iconName, label, value, color = colors.primary, bg = colors.primary + '15' }) => (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <Feather name={iconName} size={32} color={color} style={{ marginBottom: 4 }} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/owner/analytics');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Could not load analytics.</Text></View>;

  const chartLabels = data.monthlyEarnings?.map(m => m.label) || [];
  const chartData = data.monthlyEarnings?.map(m => m.amount) || [];
  const hasChartData = chartData.some(d => d > 0);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAnalytics(true)} colors={[colors.primary]} tintColor={colors.primary}/>}
      >
        <View style={styles.greenHeader}>
          <Text style={styles.title}>My Performance</Text>
          <Text style={styles.subtitle}>Analytics and metrics for your fleet</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <StatCard iconName="dollar-sign" label="Total Earnings" value={`Rs. ${(data.totalEarnings || 0).toLocaleString()}`} color={colors.success} bg={colors.success + '15'} />
          <StatCard iconName="file-text" label="Total Bookings" value={data.totalBookings ?? 0} color={colors.primary} bg={colors.primary + '15'} />
          <StatCard iconName="check-circle" label="Completed" value={data.completedBookings ?? 0} color="#059669" bg="#ECFDF5" />
          <StatCard iconName="x-circle" label="Cancelled" value={data.cancelledBookings ?? 0} color={colors.error} bg={colors.error + '15'} />
          <StatCard iconName="truck" label="Active Vehicles" value={`${data.activeVehicles ?? 0} / ${data.totalVehicles ?? 0}`} color="#7C3AED" bg="#F5F3FF" />
          <StatCard iconName="star" label="Avg Rating" value={data.avgRating ?? '—'} color={colors.warning} bg={colors.warning + '15'} />
        </View>

        {/* Monthly Earnings Chart */}
        {hasChartData && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monthly Earnings</Text>
            </View>
            <View style={styles.chartContainer}>
              <BarChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartData }]
                }}
                width={screenWidth - 40}
                height={220}
                yAxisLabel="Rs "
                chartConfig={{
                  backgroundColor: colors.surfaceHighlight,
                  backgroundGradientFrom: colors.primary,
                  backgroundGradientTo: '#0284C7',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  style: { borderRadius: SIZES.radius },
                  propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.2)' }
                }}
                style={{ borderRadius: SIZES.radius }}
                showValuesOnTopOfBars={true}
              />
            </View>
          </>
        )}

        {/* Per-Vehicle Performance Table */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vehicle Performance</Text>
        </View>
        
        {data.vehicleStats?.length > 0 ? (
          data.vehicleStats.map((v, i) => (
            <View key={v.vehicleId || i} style={styles.vehicleRow}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleName}>{v.makeAndModel}</Text>
                <Text style={styles.vehiclePlate}>{v.licensePlate}</Text>
              </View>
              <View style={styles.vehicleStats}>
                <View style={styles.vehicleStat}>
                  <Text style={styles.vehicleStatValue}>{v.totalBookings}</Text>
                  <Text style={styles.vehicleStatLabel}>Bookings</Text>
                </View>
                <View style={styles.vehicleStat}>
                  <Text style={[styles.vehicleStatValue, { color: colors.success }]}>Rs. {(v.totalIncome || 0).toLocaleString()}</Text>
                  <Text style={styles.vehicleStatLabel}>Income</Text>
                </View>
                <View style={styles.vehicleStat}>
                  <Text style={[styles.vehicleStatValue, { color: colors.warning }]}>{v.avgRating ?? '—'} ⭐</Text>
                  <Text style={styles.vehicleStatLabel}>{v.reviewCount} reviews</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 12}}>🚙</Text>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>No vehicles registered yet.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:           { flex: 1, backgroundColor: C.background },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  container:        { padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 14, fontWeight: '600' },
  
  sectionHeader:    { marginTop: 32, marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle:     { fontSize: 18, fontWeight: '900', color: C.primary, letterSpacing: -0.2 },

  // Stats Grid
  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard:         { width: '47%', borderRadius: SIZES.radius, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  statValue:        { fontSize: 22, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  statLabel:        { color: C.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Chart
  chartContainer:   { alignItems: 'center', ...SHADOWS.card, backgroundColor: C.surface, borderRadius: SIZES.radius, overflow: 'hidden' },

  // Vehicle Performance
  vehicleRow:       { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 20, marginBottom: 14, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  vehicleInfo:      { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  vehicleName:      { fontSize: 18, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.2 },
  vehiclePlate:     { fontSize: 12, color: C.textSecondary, fontWeight: '700', marginTop: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  vehicleStats:     { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleStat:      { alignItems: 'center', flex: 1 },
  vehicleStatValue: { fontSize: 16, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  vehicleStatLabel: { fontSize: 11, color: C.textSecondary, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  emptyState:       { alignItems: 'center', marginTop: 32, padding: 32, backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed' },
});
