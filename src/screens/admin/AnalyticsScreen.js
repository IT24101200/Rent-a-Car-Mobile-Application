import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const StatCard = ({ emoji, label, value, color = colors.primary, bg = colors.primary + '15', width = '47%' }) => (
    <View style={[styles.statCard, { backgroundColor: bg, width }]}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ActionButton = ({ emoji, title, onPress }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionArrow}>→</Text>
    </TouchableOpacity>
  );

  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  
  const nav = useNavigation();

  const [report, setReport] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, reportRes] = await Promise.all([
        api.get('/api/analytics'),
        api.get('/api/admin/analytics/report'),
      ]);
      setStats(statsRes.data);
      setReport(reportRes.data);
    } catch {
      setStats({ totalIncome: 0, totalBookings: 0, canceledBookings: 0, totalVehicles: 0, pendingApprovals: 0 });
      setError('Could not reach analytics endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.greenHeader}>
          <Text style={styles.title}>📊 Admin Dashboard</Text>
          <Text style={styles.subtitle}>Overview & Quick Actions</Text>
        </View>

        {error && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ── Quick Management Menus ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>Management Menu</Text>
        <View style={styles.actionGrid}>
          <ActionButton emoji="👥" title="Manage Users" onPress={() => nav.navigate('UserManagement')} />
          <ActionButton emoji="📋" title="All Bookings" onPress={() => nav.navigate('AllBookings')} />
          <ActionButton emoji="🚗" title="Fleet Config" onPress={() => nav.navigate('FleetManagement')} />
          <ActionButton emoji="⭐" title="Feedback"     onPress={() => nav.navigate('FeedbackModeration')} />
          <ActionButton emoji="📄" title="Full Report"  onPress={() => nav.navigate('AdminReport')} />
        </View>

        {/* ── Key Statistics ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard width="100%" emoji="💰" label="Total Platform Income" value={`Rs. ${(stats?.totalIncome || 0).toLocaleString()}`} color={colors.success} bg={colors.success + '15'} />
          <StatCard emoji="📋" label="Bookings" value={stats?.totalBookings ?? 0} color={colors.primary} bg={colors.primary + '15'} />
          <StatCard emoji="🚗" label="Vehicles" value={stats?.totalVehicles ?? 0} color="#7C3AED" bg={isDark ? '#4C1D95' : '#F5F3FF'} />
        </View>

        {/* ── Chart ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Monthly Income Trend</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: report?.monthlyRevenue?.map(m => m.label) || ['—'],
              datasets: [{ data: report?.monthlyRevenue?.map(m => m.amount) || [0] }]
            }}
            width={screenWidth - 40}
            height={220}
            yAxisLabel="Rs "
            chartConfig={{
              backgroundColor: colors.surfaceHighlight, backgroundGradientFrom: colors.primary, backgroundGradientTo: isDark ? colors.surfaceHighlight : '#0284C7',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 }
            }}
            style={{ borderRadius: 16 }}
            showValuesOnTopOfBars={true}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.background },
  container:      { padding: 20, paddingBottom: 40 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  title:           { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:       { color: 'rgba(255,255,255,0.7)', marginTop: 4, marginBottom: 10, fontSize: 14, fontWeight: '500' },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: C.primary, marginTop: 10, marginBottom: 12 },
  warningBox:     { backgroundColor: C.warning + '15', borderRadius: SIZES.radius, padding: 12, marginBottom: 16 },
  warningText:    { color: C.warning, fontSize: 13, fontWeight: '600' },
  
  actionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionBtn:      { width: '47%', backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 16, flexDirection: 'row', alignItems: 'center', ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  actionEmoji:    { fontSize: 20, marginRight: 10 },
  actionTitle:    { flex: 1, fontWeight: '700', color: C.textPrimary, fontSize: 14 },
  actionArrow:    { color: C.textMuted, fontSize: 16, fontWeight: 'bold' },

  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:       { borderRadius: SIZES.radius, padding: 18, alignItems: 'center', ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  statEmoji:      { fontSize: 32 },
  statValue:      { fontSize: 24, fontWeight: '900', marginTop: 8, letterSpacing: -0.5 },
  statLabel:      { color: C.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  chartContainer: { alignItems: 'center', ...SHADOWS.card, backgroundColor: C.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }
});
