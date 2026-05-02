import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, Dimensions, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const isAdmin = user?.role === 'Admin';
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const StatCard = ({ iconName, label, value, color = colors.primary, bg = colors.primaryLight, width = '47%' }) => (
    <View style={[styles.statCard, { backgroundColor: bg, borderColor: color + '30', width }]}>
      <View style={[styles.statIconCircle, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={iconName} size={26} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ActionButton = ({ iconName, title, onPress }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <View style={styles.actionIconCircle}>
        <MaterialCommunityIcons name={iconName} size={20} color={colors.primary} />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textMuted} />
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.title}>Admin Dashboard</Text>
              <Text style={styles.subtitle}>Overview & Quick Actions</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => nav.navigate('Notifications')}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {error}</Text>
          </View>
        )}

        {/* ── Quick Management Menus ──────────────────────────────── */}
        <Text style={styles.sectionTitle}>Management Menu</Text>
        <View style={styles.actionGrid}>
          {isAdmin && <ActionButton iconName="account-group-outline" title="Manage Users" onPress={() => nav.navigate('UserManagement')} />}
          {isAdmin && <ActionButton iconName="clipboard-text-outline" title="All Bookings" onPress={() => nav.navigate('AllBookings')} />}
          {isAdmin && <ActionButton iconName="car-cog" title="Fleet Config" onPress={() => nav.navigate('FleetManagement')} />}
          {isAdmin && <ActionButton iconName="star-outline" title="Feedback" onPress={() => nav.navigate('FeedbackModeration')} />}
          <ActionButton iconName="file-chart-outline" title="Full Report" onPress={() => nav.navigate('AdminReport')} />
        </View>

        {/* ── Key Statistics ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard width="100%" iconName="cash-multiple" label="Total Platform Income" value={`Rs. ${(stats?.totalIncome || 0).toLocaleString()}`} color={colors.success} bg={colors.successBg} />
          <StatCard iconName="clipboard-text-outline" label="Bookings" value={stats?.totalBookings ?? 0} color={colors.primary} bg={colors.primaryLight} />
          <StatCard iconName="car-multiple" label="Vehicles" value={stats?.totalVehicles ?? 0} color="#A78BFA" bg="rgba(167,139,250,0.12)" />
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
              backgroundColor: colors.surface,
              backgroundGradientFrom: colors.surface,
              backgroundGradientTo: colors.surfaceHighlight,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(176, 176, 176, ${opacity})`,
              style: { borderRadius: 16 },
              propsForBackgroundLines: { strokeDasharray: '', stroke: 'rgba(255,255,255,0.05)' },
              barPercentage: 0.6,
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
  greenHeader:    { backgroundColor: C.surface, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border, marginHorizontal: -20, marginTop: -20, marginBottom: 16 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  title:          { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  subtitle:       { color: C.textSecondary, marginTop: 4, marginBottom: 10, fontSize: 14, fontWeight: '500' },
  avatarBtn:      { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: C.primary, marginTop: 10, marginBottom: 12 },
  warningBox:     { backgroundColor: C.warningBg, borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: C.warning },
  warningText:    { color: C.warning, fontSize: 13, fontWeight: '600' },
  
  actionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionBtn:      { width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  actionIconCircle: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  actionTitle:    { flex: 1, fontWeight: '700', color: C.textPrimary, fontSize: 13 },

  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:       { borderRadius: 16, padding: 18, alignItems: 'center', borderWidth: 1 },
  statIconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue:      { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statLabel:      { color: C.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  chartContainer: { alignItems: 'center', backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }
});
