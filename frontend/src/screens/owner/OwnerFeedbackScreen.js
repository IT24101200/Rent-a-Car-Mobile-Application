import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal, TextInput, ScrollView, StatusBar
} from 'react-native';
import api from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

import Card from '../../components/atoms/Card';
import Chip from '../../components/atoms/Chip';
import Button from '../../components/atoms/Button';
import TextInputAtom from '../../components/atoms/TextInput';

export default function OwnerFeedbackScreen() {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  const [data, setData] = useState({ feedbacks: [], averageRating: null, totalReviews: 0, vehicles: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  // Reply modal
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchFeedback = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/owner/feedback');
      setData(res.data);
    } catch {
      Alert.alert('Error', 'Could not load reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const submitReply = async () => {
    if (!replyText.trim()) { Alert.alert('Validation', 'Please type a reply.'); return; }
    setReplying(true);
    try {
      const res = await api.patch(`/api/owner/feedback/${replyModal._id}/reply`, { text: replyText.trim() });
      setData(prev => ({
        ...prev,
        feedbacks: prev.feedbacks.map(f => f._id === replyModal._id ? { ...f, ownerReply: res.data.ownerReply } : f)
      }));
      setReplyModal(null);
      setReplyText('');
      Alert.alert('Success', 'Your reply has been posted.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to post reply.');
    } finally {
      setReplying(false);
    }
  };

  const filtered = filter === 'all'
    ? data.feedbacks
    : data.feedbacks.filter(f => f.vehicle?._id === filter);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedback(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <View>
            {/* Header Title */}
            <View style={styles.greenHeader}>
              <Text style={styles.title}>Customer Reviews</Text>
              <Text style={styles.subtitle}>See what your users are saying.</Text>
            </View>

            {/* Summary Card */}
            <Card style={{ margin: 20 }}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{data.averageRating ?? '—'}</Text>
                  <Text style={styles.summaryLabel}>Avg Rating</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{data.totalReviews}</Text>
                  <Text style={styles.summaryLabel}>Total Reviews</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{data.vehicles?.length ?? 0}</Text>
                  <Text style={styles.summaryLabel}>Vehicles</Text>
                </View>
              </View>
              {data.averageRating && (
                <View style={styles.starRow}>
                  {[1,2,3,4,5].map(n => (
                    <Text key={n} style={{ fontSize: 24, color: n <= Math.round(data.averageRating) ? '#F59E0B' : '#D1D5DB' }}>★</Text>
                  ))}
                </View>
              )}
            </Card>

            {/* Filter Chips */}
            {data.vehicles?.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <Chip
                  label="All Vehicles"
                  selected={filter === 'all'}
                  onPress={() => setFilter('all')}
                  style={{ marginRight: 10 }}
                />
                {data.vehicles.map(v => (
                  <Chip
                    key={v._id}
                    label={v.makeAndModel}
                    selected={filter === v._id}
                    onPress={() => setFilter(v._id)}
                    style={{ marginRight: 10 }}
                  />
                ))}
              </ScrollView>
            )}
            
            {filtered.length > 0 && <Text style={styles.sectionTitle}>Recent Feedback</Text>}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySub}>Reviews from your customers will appear here once they complete a booking.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLow = item.rating <= 2;
          const isHigh = item.rating === 5;
          return (
            <Card style={[isLow && styles.cardLow, isHigh && styles.cardHigh, { marginHorizontal: 20, marginBottom: 16 }]}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.starDisplay}>
                  {[1,2,3,4,5].map(n => (
                    <Text key={n} style={{ fontSize: 18, color: n <= item.rating ? '#F59E0B' : '#E2E8F0', marginRight: 2 }}>★</Text>
                  ))}
                </View>
                {isLow && <Text style={styles.warningBadge}>⚠️ Attention Required</Text>}
                {isHigh && <Text style={styles.excellentBadge}>🌟 Excellent</Text>}
              </View>

              {/* Comment */}
              <Text style={[styles.comment, !item.comment && { color: colors.textMuted }]}>"{item.comment || 'No written feedback provided.'}"</Text>

              {/* Meta */}
              <View style={styles.metaBox}>
                <Text style={styles.metaText} numberOfLines={1}>👤 {item.user?.name || 'Customer'}</Text>
                <Text style={styles.metaText} numberOfLines={1}>🚗 {item.vehicle?.makeAndModel || 'Vehicle'}</Text>
                <Text style={styles.metaText} numberOfLines={1}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>

              {/* Owner Reply */}
              {item.ownerReply?.text ? (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Your Reply:</Text>
                  <Text style={styles.replyText}>{item.ownerReply.text}</Text>
                  <Text style={styles.replyDate}>{new Date(item.ownerReply.repliedAt).toLocaleDateString()}</Text>
                </View>
              ) : (
                <Button
                  label="💬 Reply to Customer"
                  variant="outline"
                  onPress={() => { setReplyModal(item); setReplyText(''); }}
                  size="medium"
                  style={{ marginTop: 10 }}
                />
              )}
            </Card>
          );
        }}
      />

      {/* Reply Modal */}
      <Modal visible={!!replyModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reply to Review</Text>
            <Text style={styles.modalSub}>Replying to {replyModal?.user?.name} for {replyModal?.vehicle?.makeAndModel}</Text>

            <View style={styles.originalReview}>
              <View style={styles.starDisplay}>
                {[1,2,3,4,5].map(n => (
                  <Text key={n} style={{ fontSize: 16, color: n <= (replyModal?.rating || 0) ? '#F59E0B' : '#E2E8F0', marginRight: 2 }}>★</Text>
                ))}
              </View>
              <Text style={styles.originalComment}>"{replyModal?.comment || 'No written feedback.'}"</Text>
            </View>

            <Text style={styles.inputLabel}>Your Response</Text>
            <TextInputAtom
              placeholder="Thank you for your feedback..."
              value={replyText}
              onChangeText={setReplyText}
              style={{ minHeight: 120, alignItems: 'flex-start' }}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setReplyModal(null)}
                style={{ marginRight: 12, flex: 1 }}
              />
              <Button
                label="Post Reply"
                variant="primary"
                onPress={submitReply}
                loading={replying}
                disabled={replying}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.background },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:           { paddingBottom: 40 },
  greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginTop: 4 },

  // Summary
  summaryCard:    { backgroundColor: C.surface, margin: 20, borderRadius: SIZES.radius, padding: 24, ...SHADOWS.card, borderWidth: 1, borderColor: C.border },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  summaryItem:    { alignItems: 'center' },
  summaryValue:   { fontSize: 32, fontWeight: '900', color: C.textPrimary, letterSpacing: -1 },
  summaryLabel:   { fontSize: 12, color: C.textSecondary, fontWeight: '700', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryDivider: { width: 1, height: 40, backgroundColor: C.border },
  starRow:        { flexDirection: 'row', justifyContent: 'center', marginTop: 16, gap: 4 },

  // Filter Chips
  chipScroll:     { paddingLeft: 20, marginBottom: 12, overflow: 'visible' },

  sectionTitle:   { fontSize: 18, fontWeight: '900', color: C.textPrimary, paddingHorizontal: 20, marginTop: 12, marginBottom: 8, letterSpacing: -0.2 },

  // Empty
  emptyBox:       { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  emptyEmoji:     { fontSize: 50, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '900', color: C.textPrimary },
  emptySub:       { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontSize: 14, fontWeight: '500', lineHeight: 20 },

  // Card
  cardLow:        { borderColor: C.error, backgroundColor: C.error + '10' },
  cardHigh:       { borderColor: C.success, backgroundColor: C.success + '10' },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  starDisplay:    { flexDirection: 'row' },
  warningBadge:   { fontSize: 10, fontWeight: '800', color: C.error, backgroundColor: C.error + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusPill, letterSpacing: 0.5, textTransform: 'uppercase' },
  excellentBadge: { fontSize: 10, fontWeight: '800', color: C.success, backgroundColor: C.success + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radiusPill, letterSpacing: 0.5, textTransform: 'uppercase' },
  comment:        { fontSize: 15, color: C.textPrimary, fontStyle: 'italic', marginBottom: 16, lineHeight: 24, fontWeight: '500' },
  metaBox:        { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: C.background, padding: 12, borderRadius: SIZES.radius, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  metaText:       { fontSize: 12, color: C.textSecondary, fontWeight: '600', marginRight: 16, marginBottom: 4 },

  // Reply
  replyBox:       { backgroundColor: C.primary + '0A', padding: 16, borderRadius: SIZES.radius - 4, borderLeftWidth: 4, borderLeftColor: C.primary },
  replyLabel:     { fontSize: 12, fontWeight: '900', color: C.primary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  replyText:      { fontSize: 14, color: C.textPrimary, lineHeight: 22, fontWeight: '500' },
  replyDate:      { fontSize: 11, color: C.textSecondary, marginTop: 8, fontWeight: '600' },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', padding: 20 },
  modalBox:       { backgroundColor: C.surface, borderRadius: 24, padding: 24, ...SHADOWS.float },
  modalTitle:     { fontSize: 24, fontWeight: '900', color: C.textPrimary, marginBottom: 4, letterSpacing: -0.5 },
  modalSub:       { color: C.textSecondary, marginBottom: 20, fontWeight: '600', fontSize: 13 },
  originalReview: { backgroundColor: C.surfaceHighlight, padding: 16, borderRadius: SIZES.radius, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  originalComment:{ fontSize: 14, color: C.textPrimary, fontStyle: 'italic', marginTop: 10, lineHeight: 20, fontWeight: '500' },
  inputLabel:     { fontSize: 13, fontWeight: '800', color: C.textPrimary, marginBottom: 8, letterSpacing: -0.2 },
  modalActions:   { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
});
