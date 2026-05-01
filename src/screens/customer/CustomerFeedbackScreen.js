import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity, Image, StatusBar, Linking
} from 'react-native';
import api, { API_URL, BASE_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function CustomerFeedbackScreen() {
  const { colors, isDark } = useTheme();
  const S = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/feedback/my');
      setFeedbacks(res.data);
    } catch {
      // silently fail or show error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFeedbacks();
    }, [])
  );

  const renderItem = ({ item }) => {
    const v = item.vehicle || {};
    const b = item.booking || {};
    return (
      <View style={S.card}>
        <View style={S.cardHeader}>
          <View style={S.vehicleInfoRow}>
            {v.imageUrl ? (
              <Image source={{ uri: `${BASE_URL}${v.imageUrl}` }} style={S.vehicleImage} resizeMode="cover" />
            ) : (
              <View style={S.vehicleImagePlaceholder}><Text>🚘</Text></View>
            )}
            <View style={S.vehicleTextCol}>
              <Text style={S.vehicleName}>{v.makeAndModel || 'Unknown Vehicle'}</Text>
              <Text style={S.dateText}>{new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
            </View>
          </View>
          <View style={S.ratingBadge}>
            <Text style={S.ratingText}>{item.rating}.0</Text>
            <Text style={S.starIcon}>⭐</Text>
          </View>
        </View>

        {item.comment ? (
          <Text style={S.commentText}>"{item.comment}"</Text>
        ) : (
          <Text style={[S.commentText, { fontStyle: 'italic', color: colors.textMuted }]}>No comment provided.</Text>
        )}

        {item.photos && item.photos.length > 0 && (
          <View style={S.photosContainer}>
            {item.photos.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => Linking.openURL(`${API_URL}${p}`)}>
                <Image source={{ uri: `${API_URL}${p}` }} style={S.photo} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {item.ownerReply?.text && (
          <View style={S.replyBox}>
            <Text style={S.replyLabel}>Host's Reply:</Text>
            <Text style={S.replyText}>{item.ownerReply.text}</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;
  }

  return (
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <View style={S.header}>
        <Text style={S.title}>My Reviews</Text>
        <Text style={S.subtitle}>Feedback you have submitted</Text>
      </View>

      <FlatList
        data={feedbacks}
        keyExtractor={i => i._id}
        contentContainerStyle={S.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedbacks(true)} tintColor={colors.primary} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={S.emptyState}>
            <Text style={{ fontSize: 50, marginBottom: 12 }}>✍️</Text>
            <Text style={S.emptyTitle}>No Reviews Yet</Text>
            <Text style={S.emptySub}>After completing a trip, you can share your experience here.</Text>
          </View>
        }
      />
    </View>
  );
}

const getStyles = (C, isDark) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.headerGradientStart,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 40 },
  
  card: {
    backgroundColor: C.surface,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    ...SHADOWS.card
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  vehicleImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.surfaceHighlight
  },
  vehicleImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center'
  },
  vehicleTextCol: {
    marginLeft: 10,
    flex: 1
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '800',
    color: C.textPrimary
  },
  dateText: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '600',
    marginTop: 2
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusPill,
    marginLeft: 10
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '900',
    color: C.textPrimary
  },
  starIcon: {
    fontSize: 12,
    marginLeft: 4
  },
  commentText: {
    fontSize: 14,
    color: C.textPrimary,
    lineHeight: 22,
    marginBottom: 12
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  photo: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: C.surfaceHighlight
  },
  replyBox: {
    backgroundColor: C.surfaceHighlight,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
    marginTop: 4
  },
  replyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.primary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  replyText: {
    fontSize: 13,
    color: C.textPrimary,
    lineHeight: 20
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.textPrimary,
    marginBottom: 8
  },
  emptySub: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20
  }
});
