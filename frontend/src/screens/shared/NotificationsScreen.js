import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [notifRes, bookRes] = await Promise.all([
        api.get('/api/notifications'),
        api.get('/api/bookings/my')
      ]);
      setNotifications(notifRes.data);
      setBookings(bookRes.data);
    } catch (err) {
      console.log('Failed to load data for notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.log('Failed to mark read', err);
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'penalty': return { icon: '🚨', bg: colors.error + '15', text: colors.error };
      case 'warning': return { icon: '⚠️', bg: colors.warning + '15', text: colors.warning };
      case 'success': return { icon: '✅', bg: colors.success + '15', text: colors.success };
      case 'info':
      default: return { icon: 'ℹ️', bg: colors.info + '15', text: colors.info };
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const renderHeader = () => {
    const now = new Date();
    const urgentStarting = bookings.find(b => b.status === 'confirmed' && (new Date(b.startDate) - now) < 2 * 60 * 60 * 1000 && (new Date(b.startDate) - now) > 0);
    const overdueTrip = bookings.find(b => b.status === 'active' && now > new Date(b.endDate));

    if (!overdueTrip && !urgentStarting) return null;

    return (
      <View style={{ marginBottom: 16 }}>
        {overdueTrip && (
          <TouchableOpacity style={{ backgroundColor: colors.error, padding: 12, borderRadius: 8, marginBottom: 16 }} onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>🚨 OVERDUE TRIP ALERT</Text>
            <Text style={{ color: '#fff', fontSize: 13, marginTop: 4 }}>Your trip with the {overdueTrip.vehicle?.makeAndModel || 'vehicle'} is past its return time! Please Check-Out immediately to avoid further penalties.</Text>
          </TouchableOpacity>
        )}

        {!overdueTrip && urgentStarting && (
          <TouchableOpacity style={{ backgroundColor: colors.warning, padding: 12, borderRadius: 8 }} onPress={() => navigation.navigate('Main', { screen: 'MyBookings' })}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>⏳ Trip Starting Soon!</Text>
            <Text style={{ color: '#fff', fontSize: 13, marginTop: 4 }}>Your {urgentStarting.vehicle?.makeAndModel} trip is starting in less than 2 hours. Be ready to check in!</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <FlatList
        data={notifications}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
        renderItem={({ item }) => {
          const typeStyle = getTypeStyle(item.type);
          return (
            <TouchableOpacity 
              style={[styles.card, !item.read && styles.unreadCard]} 
              activeOpacity={0.8}
              onPress={() => {
                if (!item.read) markAsRead(item._id);
              }}
            >
              <View style={[styles.iconBox, { backgroundColor: typeStyle.bg }]}>
                <Text style={styles.icon}>{typeStyle.icon}</Text>
              </View>
              <View style={styles.content}>
                <Text style={[styles.title, !item.read && { fontWeight: '900' }]}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  empty: { textAlign: 'center', color: C.textMuted, marginTop: 40, fontSize: 16 },
  card: { flexDirection: 'row', backgroundColor: C.surface, padding: 16, borderRadius: SIZES.radius, marginBottom: 12, ...SHADOWS.card, alignItems: 'center' },
  unreadCard: { backgroundColor: C.surfaceHighlight, borderWidth: 1, borderColor: C.border },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: C.textPrimary, marginBottom: 4 },
  message: { fontSize: 14, color: C.textSecondary, marginBottom: 6 },
  date: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.error, marginLeft: 10 }
});
