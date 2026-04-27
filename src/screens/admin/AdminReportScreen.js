import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, Dimensions, RefreshControl, StatusBar
} from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const screenWidth = Dimensions.get('window').width;

export default function AdminReportScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const StatCard = ({ emoji, label, value, color = colors.primary, bg = colors.primary + '15', width = '48%' }) => (
    <View style={[styles.statCard, { backgroundColor: bg, width }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const LeaderboardItem = ({ rank, name, value, color = colors.textPrimary }) => (
    <View style={styles.leaderRow}>
      <Text style={styles.leaderRank}>{rank}</Text>
      <Text style={styles.leaderName} numberOfLines={1}>{name}</Text>
      <Text style={[styles.leaderValue, { color }]}>{value}</Text>
    </View>
  );

  const StatsBar = ({ label, count, total, color }) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.statusBarRow}>
        <Text style={styles.statusLabel}>{label}</Text>
        <View style={styles.statusBarBg}>
          <View style={[styles.statusBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.statusCount}>{count}</Text>
      </View>
    );
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReport = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/admin/analytics/report');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!data) return <View style={styles.center}><Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Could not load report.</Text></View>;

  const chartLabels = data.monthlyRevenue?.map(m => m.label) || [];
  const chartData = data.monthlyRevenue?.map(m => m.amount) || [];
  const hasChartData = chartData.some(d => d > 0);
  const totalBookings = data.totalBookings || 1;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchReport(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.greenHeader}>
          <Text style={styles.title}>Platform Report</Text>
          <Text style={styles.subtitle}>Comprehensive analytics overview</Text>
        </View>

        {/* ── Revenue Summary ──────────────────────────────────────── */}
        <View style={styles.statsGrid}>
          <StatCard width="100%" emoji="💰" label="Total Platform Revenue" value={`Rs. ${(data.totalRevenue || 0).toLocaleString()}`} color={colors.success} bg={colors.success + '15'} />
          <StatCard emoji="📋" label="Total Bookings" value={data.totalBookings ?? 0} color={colors.primary} bg={colors.primary + '15'} />
          <StatCard emoji="🚗" label="Total Vehicles" value={data.totalVehicles ?? 0} color="#7C3AED" bg={isDark ? '#4C1D95' : '#F5F3FF'} />
          <StatCard emoji="👥" label="Total Users" value={data.totalUsers ?? 0} color="#0891B2" bg={isDark ? '#164E63' : '#ECFEFF'} />
          <StatCard emoji="⭐" label="Platform Rating" value={data.platformAvgRating ?? '—'} color={colors.warning} bg={colors.warning + '15'} />
        </View>

        {/* ── Monthly Revenue Chart ──────────────────────────────── */}
        {hasChartData && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monthly Revenue Trend</Text>
            </View>
            <View style={styles.chartContainer}>
              <BarChart
                data={{ labels: chartLabels, datasets: [{ data: chartData }] }}
                width={screenWidth - 40}
                height={220}
                yAxisLabel="Rs "
                chartConfig={{
                  backgroundColor: colors.surfaceHighlight,
                  backgroundGradientFrom: colors.primary,
                  backgroundGradientTo: isDark ? colors.surfaceHighlight : '#0284C7',
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

        {/* ── Booking Status Breakdown ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Booking Lineup</Text>
        </View>
        <View style={styles.breakdownCard}>
          <StatsBar label="✅ Confirmed" count={data.statusBreakdown?.confirmed || 0} total={totalBookings} color={colors.primary} />
          <StatsBar label="🚗 Active" count={data.statusBreakdown?.active || 0} total={totalBookings} color={colors.success} />
          <StatsBar label="🔒 Completed" count={data.statusBreakdown?.completed || 0} total={totalBookings} color={colors.textSecondary} />
          <StatsBar label="❌ Cancelled" count={data.statusBreakdown?.cancelled || 0} total={totalBookings} color={colors.error} />
          <StatsBar label="⏳ Returning" count={data.statusBreakdown?.returning || 0} total={totalBookings} color={colors.warning} />
        </View>

        {/* ── Top 5 Earning Vehicles ─────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Top Earning Vehicles</Text>
        </View>
        <View style={styles.leaderCard}>
          {data.topEarners?.length > 0 ? data.topEarners.map((v, i) => (
            <LeaderboardItem key={i} rank={`#${i + 1}`} name={v.name} value={`Rs. ${(v.income || 0).toLocaleString()}`} color={colors.success} />
          )) : <Text style={styles.noData}>No data yet</Text>}
        </View>

        {/* ── Top 5 Rated Vehicles ──────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⭐ Top Rated Vehicles</Text>
        </View>
        <View style={styles.leaderCard}>
          {data.topRated?.length > 0 ? data.topRated.map((v, i) => (
            <LeaderboardItem key={i} rank={`#${i + 1}`} name={v.name} value={`${v.avg} ⭐  (${v.count})`} color={colors.warning} />
          )) : <Text style={styles.noData}>No reviews yet</Text>}
        </View>

        {/* ── Rating Distribution ───────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rating Distribution</Text>
        </View>
        <View style={styles.breakdownCard}>
          {[5, 4, 3, 2, 1].map(n => (
            <StatsBar key={n} label={`${'★'.repeat(n)}`} count={data.ratingDist?.[n - 1] || 0} total={data.totalReviews || 1} color={n >= 4 ? colors.success : n === 3 ? colors.warning : colors.error} />
          ))}
        </View>

        {/* ── Owner Performance ─────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Owner Performance</Text>
        </View>
        {data.ownerPerformance?.length > 0 ? (
          data.ownerPerformance.map((o, i) => (
            <View key={i} style={styles.ownerRow}>
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{o.name}</Text>
                <Text style={styles.ownerEmail}>{o.email}</Text>
              </View>
              <View style={styles.ownerStats}>
                <View style={styles.ownerStat}>
                  <Text style={styles.ownerStatVal}>{o.vehicleCount}</Text>
                  <Text style={styles.ownerStatLbl}>Cars</Text>
                </View>
                <View style={styles.ownerStat}>
                  <Text style={[styles.ownerStatVal, { color: colors.success }]}>Rs. {(o.totalIncome || 0).toLocaleString()}</Text>
                  <Text style={styles.ownerStatLbl}>Income</Text>
                </View>
                <View style={styles.ownerStat}>
                  <Text style={[styles.ownerStatVal, { color: colors.warning }]}>{o.avgRating ?? '—'} ⭐</Text>
                  <Text style={styles.ownerStatLbl}>Rating</Text>
                </View>
              </View>
            </View>
          ))
        ) : <Text style={styles.noData}>No car owners registered yet.</Text>}

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

  statsGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard:         { borderRadius: SIZES.radius, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  statEmoji:        { fontSize: 32 },
  statValue:        { fontSize: 22, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  statLabel:        { color: C.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  chartContainer:   { alignItems: 'center', ...SHADOWS.card, backgroundColor: C.surface, borderRadius: SIZES.radius, overflow: 'hidden' },

  // Breakdown
  breakdownCard:    { backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, padding: 20, ...SHADOWS.light, borderWidth: 1, borderColor: C.border },
  statusBarRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  statusLabel:      { width: 100, fontSize: 13, fontWeight: '800', color: C.textSecondary },
  statusBarBg:      { flex: 1, height: 8, backgroundColor: C.background, borderRadius: 4, overflow: 'hidden', marginHorizontal: 12 },
  statusBarFill:    { height: '100%', borderRadius: 4 },
  statusCount:      { width: 36, fontSize: 14, fontWeight: '900', color: C.textPrimary, textAlign: 'right' },

  // Leaderboard
  leaderCard:       { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 16, paddingVertical: 8, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  leaderRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  leaderRank:       { width: 36, fontSize: 15, fontWeight: '900', color: C.warning },
  leaderName:       { flex: 1, fontSize: 14, fontWeight: '800', color: C.textPrimary },
  leaderValue:      { fontSize: 14, fontWeight: '900' },

  // Owner Performance
  ownerRow:         { backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, padding: 16, marginBottom: 12, ...SHADOWS.light, borderWidth: 1, borderColor: C.border },
  ownerInfo:        { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  ownerName:        { fontSize: 18, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.2 },
  ownerEmail:       { fontSize: 13, color: C.textSecondary, fontWeight: '600', marginTop: 4 },
  ownerStats:       { flexDirection: 'row', justifyContent: 'space-between' },
  ownerStat:        { alignItems: 'center', flex: 1 },
  ownerStatVal:     { fontSize: 16, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  ownerStatLbl:     { fontSize: 11, color: C.textSecondary, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },

  noData:           { color: C.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 14, fontWeight: '600' },
});
