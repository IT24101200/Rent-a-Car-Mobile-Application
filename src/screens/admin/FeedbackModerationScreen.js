import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, StatusBar
} from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function FeedbackModerationScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const fetchFeedbacks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/admin/feedback');
      setFeedbacks(res.data);
    } catch {
      Alert.alert('Error', 'Could not load feedback.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const deleteFeedback = (feedbackId) => {
    Alert.alert(
      'Delete Feedback',
      'This action will permanently remove this feedback from the platform. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            setActionId(feedbackId);
            try {
              await api.delete(`/api/admin/feedback/${feedbackId}`);
              setFeedbacks(prev => prev.filter(f => f._id !== feedbackId));
            } catch {
              Alert.alert('Error', 'Failed to delete feedback.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={feedbacks}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedbacks(true)} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.greenHeader}>
            <Text style={styles.title}>All Feedback</Text>
            <Text style={styles.subtitle}>{feedbacks.length} reviews submitted by customers</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No Feedback</Text>
            <Text style={styles.emptySub}>Customers have not left any feedback yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.rating <= 2 && styles.cardLowRating]}>
            <View style={styles.headerRow}>
              <View style={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Text key={i} style={{ fontSize: 18 }}>{i < item.rating ? '⭐' : '☆'}</Text>
                ))}
              </View>
              {item.rating <= 2 && <Text style={styles.warningText}>Needs Review</Text>}
            </View>
            
            <Text style={styles.comment}>"{item.comment || 'No comment provided.'}"</Text>
            
            <View style={styles.metaBox}>
              <Text style={styles.detail}><Text style={{fontWeight: '700'}}>By:</Text> {item.user?.name} ({item.user?.email})</Text>
              <Text style={styles.detail}><Text style={{fontWeight: '700'}}>Vehicle:</Text> {item.booking?.vehicle?.makeAndModel || 'Unknown'}</Text>
              <Text style={styles.detail}><Text style={{fontWeight: '700'}}>Date:</Text> {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => deleteFeedback(item._id)}
                disabled={actionId === item._id}
                activeOpacity={0.8}
              >
                {actionId === item._id 
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Text style={styles.btnText}>🗑️ Delete Review</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.background },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:          { padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },

  card:          { backgroundColor: C.surface, padding: 20, borderRadius: SIZES.radius, marginBottom: 16, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  cardLowRating: { borderColor: C.error, backgroundColor: C.error + '05', ...SHADOWS.light },
  
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  stars:         { flexDirection: 'row', gap: 2 },
  warningText:   { color: C.error, fontWeight: '800', fontSize: 11, backgroundColor: C.error + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: SIZES.radiusPill, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  comment:       { fontSize: 16, color: C.textPrimary, fontStyle: 'italic', marginBottom: 20, lineHeight: 24 },
  
  metaBox:       { backgroundColor: C.surfaceHighlight, padding: 16, borderRadius: SIZES.radius, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  detail:        { fontSize: 13, color: C.textSecondary, marginBottom: 6 },
  
  actionRow:     { alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 16 },
  btn:           { backgroundColor: C.surfaceHighlight, paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusPill, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  btnText:       { color: C.error, fontWeight: '800', fontSize: 13 },

  emptyBox:      { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji:    { fontSize: 60, marginBottom: 16 },
  emptyTitle:    { fontSize: 22, fontWeight: '900', color: C.textPrimary, letterSpacing: -0.5 },
  emptySub:      { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500', fontSize: 15, lineHeight: 22 },
});
