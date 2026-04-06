import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  ScrollView, TouchableOpacity, SafeAreaView, Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BarChart } from 'react-native-chart-kit';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';
const screenWidth = Dimensions.get('window').width;

const StatCard = ({ emoji, label, value, color = PRIMARY, bg = '#EEF2FF', width = '47%' }) => (
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

export default function AnalyticsScreen() {
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  
  const nav = useNavigation();

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/analytics');
      setStats(res.data);
    } catch {
      setStats({ totalIncome: 0, totalBookings: 0, canceledBookings: 0, totalVehicles: 0, pendingApprovals: 0 });
      setError('Could not reach analytics endpoint.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>📊 Admin Dashboard</Text>
        <Text style={styles.subtitle}>Overview & Quick Actions</Text>

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
        </View>

        {/* ── Key Statistics ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <StatCard width="100%" emoji="💰" label="Total Platform Income" value={`Rs. ${(stats?.totalIncome || 0).toLocaleString()}`} color="#15803D" bg="#F0FFF4" />
          <StatCard emoji="📋" label="Bookings" value={stats?.totalBookings ?? 0} color={PRIMARY} bg="#EEF2FF" />
          <StatCard emoji="🚗" label="Vehicles" value={stats?.totalVehicles ?? 0} color="#7C3AED" bg="#F5F3FF" />
        </View>

        {/* ── Chart ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Monthly Income Trend</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={{
              labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
              datasets: [{ data: [20000, 45000, 28000, 80000, 99000, (stats?.totalIncome || 0)/10] }]
            }}
            width={screenWidth - 40} // from react-native
            height={220}
            yAxisLabel="Rs "
            chartConfig={{
              backgroundColor: "#1E293B", backgroundGradientFrom: "#1E3A8A", backgroundGradientTo: "#3B82F6",
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: '#F8FAFC' },
  container:      { padding: 20, paddingBottom: 40 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title:          { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  subtitle:       { color: '#64748B', marginTop: 4, marginBottom: 20, fontSize: 16 },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 10, marginBottom: 12 },
  warningBox:     { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginBottom: 16 },
  warningText:    { color: '#92400E', fontSize: 13 },
  
  actionGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  actionBtn:      { width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', elevation: 2 },
  actionEmoji:    { fontSize: 20, marginRight: 10 },
  actionTitle:    { flex: 1, fontWeight: '700', color: '#334155', fontSize: 14 },
  actionArrow:    { color: '#CBD5E1', fontSize: 16, fontWeight: 'bold' },

  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard:       { borderRadius: 18, padding: 18, alignItems: 'center', elevation: 2 },
  statEmoji:      { fontSize: 32 },
  statValue:      { fontSize: 24, fontWeight: '800', marginTop: 8 },
  statLabel:      { color: '#64748B', fontSize: 13, marginTop: 4, textAlign: 'center', fontWeight: '500' },

  chartContainer: { alignItems: 'center', elevation: 5, backgroundColor: '#fff', borderRadius: 16 }
});
