import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl
} from 'react-native';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function FeedbackModerationScreen() {
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

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={feedbacks}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchFeedbacks(true)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20, color: '#666'}}>No feedback available.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.rating <= 2 && styles.cardLowRating]}>
            <View style={styles.headerRow}>
              <View style={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Text key={i} style={{ fontSize: 16 }}>{i < item.rating ? '⭐' : '☆'}</Text>
                ))}
              </View>
              {item.rating <= 2 && <Text style={styles.warningText}>Needs Review</Text>}
            </View>
            
            <Text style={styles.comment}>"{item.comment || 'No comment provided.'}"</Text>
            
            <View style={styles.metaBox}>
              <Text style={styles.detail}>By: {item.user?.name} ({item.user?.email})</Text>
              <Text style={styles.detail}>Vehicle: {item.booking?.vehicle?.makeAndModel || 'Unknown'}</Text>
              <Text style={styles.detail}>Date: {new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.btn, actionId === item._id && { opacity: 0.5 }]}
                onPress={() => deleteFeedback(item._id)}
                disabled={actionId === item._id}
              >
                {actionId === item._id 
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnText}>🗑️ Delete Review</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F8FAFC' },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 40 },
  card:          { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#E2E8F0' },
  cardLowRating: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stars:         { flexDirection: 'row', gap: 2 },
  warningText:   { color: '#DC2626', fontWeight: '700', fontSize: 12, backgroundColor: '#FDE8E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  comment:       { fontSize: 16, color: '#334155', fontStyle: 'italic', marginBottom: 16 },
  metaBox:       { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginBottom: 16 },
  detail:        { fontSize: 13, color: '#475569', marginBottom: 4 },
  actionRow:     { alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
  btn:           { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 13 }
});
