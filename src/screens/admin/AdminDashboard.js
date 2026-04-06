import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl,
  Modal, Dimensions, StatusBar, ScrollView
} from 'react-native';
import api, { BASE_URL } from '../../api/api';

const PRIMARY  = '#1E3A8A';
const { width: W, height: H } = Dimensions.get('window');

const DOC_META = [
  { key: 'revenueLicense', label: '🪪 Revenue License' },
  { key: 'insurance',      label: '🛡️ Insurance Cert.' },
  { key: 'registration',   label: '📝 Registration' },
  { key: 'fitness',        label: '🔧 Fitness Cert.' },
];

// ── Full-Screen Image Viewer ──────────────────────────────────────────────────
function ImageViewer({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const flatRef = useRef(null);

  const onScroll = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setCurrent(idx);
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <StatusBar hidden />
      <View style={vs.overlay}>

        {/* Top bar */}
        <View style={vs.topBar}>
          <Text style={vs.docLabel}>{images[current]?.label}</Text>
          <View style={vs.counter}>
            <Text style={vs.counterText}>{current + 1} / {images.length}</Text>
          </View>
          <TouchableOpacity style={vs.closeBtn} onPress={onClose}>
            <Text style={vs.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable image list */}
        <FlatList
          ref={flatRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          keyExtractor={(_, i) => String(i)}
          onMomentumScrollEnd={onScroll}
          renderItem={({ item }) => (
            <ScrollView
              style={{ width: W, height: H }}
              contentContainerStyle={vs.imageContainer}
              maximumZoomScale={4}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              bouncesZoom
            >
              <Image
                source={{ uri: item.uri }}
                style={vs.fullImage}
                resizeMode="contain"
              />
            </ScrollView>
          )}
        />

        {/* Bottom dot indicators */}
        {images.length > 1 && (
          <View style={vs.dots}>
            {images.map((_, i) => (
              <View key={i} style={[vs.dot, i === current && vs.dotActive]} />
            ))}
          </View>
        )}

        {/* Hint */}
        <Text style={vs.hint}>Pinch to zoom • Swipe to browse</Text>
      </View>
    </Modal>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [vehicles,   setVehicles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId,   setActionId]   = useState(null);

  // Image viewer state
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex,  setViewerIndex]  = useState(0);
  const [viewerOpen,   setViewerOpen]   = useState(false);

  const openViewer = (images, index) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const fetchPending = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/vehicles?status=pending');
      setVehicles(res.data.filter(v => v.validationStatus === 'pending'));
    } catch {
      Alert.alert('Error', 'Could not load pending vehicles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAction = async (vehicleId, action) => {
    setActionId(vehicleId);
    try {
      await api.patch(`/api/vehicles/${vehicleId}/status`, { validationStatus: action });
      setVehicles(prev => prev.filter(v => v._id !== vehicleId));
      Alert.alert('Done', `Vehicle has been ${action}.`);
    } catch {
      Alert.alert('Error', `Failed to ${action} vehicle.`);
    } finally {
      setActionId(null);
    }
  };

  const confirmAction = (vehicle, action) => {
    Alert.alert(
      action === 'accepted' ? '✅ Accept Vehicle' : '❌ Reject Vehicle',
      `Are you sure you want to ${action === 'accepted' ? 'accept' : 'reject'} "${vehicle.makeAndModel}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: action === 'rejected' ? 'destructive' : 'default',
          onPress: () => handleAction(vehicle._id, action) },
      ]
    );
  };

  // Build gallery images for a vehicle: photo first, then uploaded docs
  const buildGallery = (item) => {
    const imgs = [];
    if (item.imageUrl)
      imgs.push({ uri: `${BASE_URL}${item.imageUrl}`, label: `🚗 ${item.makeAndModel}` });
    if (item.documents) {
      item.documents.forEach(doc => {
        const meta = DOC_META.find(d => d.key === doc.docType);
        imgs.push({ uri: `${BASE_URL}${doc.fileUrl}`, label: meta?.label || doc.docType });
      });
    }
    return imgs;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading pending vehicles...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      {viewerOpen && (
        <ImageViewer
          images={viewerImages}
          startIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPending(true)} colors={[PRIMARY]} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>🛡️ Admin Approvals</Text>
            <Text style={styles.sub}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} awaiting review</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySub}>No vehicles pending approval.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const gallery = buildGallery(item);
          return (
            <View style={styles.card}>

              {/* ── Vehicle Photo (tappable) ─────────────────── */}
              {item.imageUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => openViewer(gallery, 0)}
                >
                  <Image
                    source={{ uri: `${BASE_URL}${item.imageUrl}` }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <View style={styles.zoomHint}>
                    <Text style={styles.zoomHintText}>🔍 Tap to view full screen</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <Text style={{ fontSize: 30 }}>🚗</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>No photo uploaded</Text>
                </View>
              )}

              {/* ── Details Body ─────────────────────────────── */}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.carName}>{item.makeAndModel}</Text>
                  <View style={styles.pendingBadge}><Text style={styles.pendingText}>⏳ Pending</Text></View>
                </View>
                <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
                <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
                {item.features ? <Text style={[styles.detail, {fontStyle: 'italic', fontSize: 12}]}>{item.features}</Text> : null}
                <Text style={[styles.detail, {fontWeight: '800', color: '#059669', fontSize: 15, marginTop: 4}]}>💰 Rs. {item.pricePerDay}/day</Text>

                {/* ── Document Vault ─────────────────────────── */}
                {item.documents && item.documents.length > 0 ? (
                  <View style={styles.docVault}>
                    <View style={styles.docVaultHeader}>
                      <Text style={styles.docVaultTitle}>📁 Submitted Documents</Text>
                      {gallery.length > 1 && (
                        <TouchableOpacity
                          style={styles.viewAllBtn}
                          onPress={() => openViewer(gallery, 1)}
                        >
                          <Text style={styles.viewAllText}>View All →</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.docGrid}>
                      {DOC_META.map(({ key, label }) => {
                        const doc = item.documents.find(d => d.docType === key);
                        const docIndex = gallery.findIndex(g => g.label === label);
                        return (
                          <View key={key} style={styles.docCell}>
                            {doc ? (
                              <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => openViewer(gallery, docIndex >= 0 ? docIndex : 0)}
                              >
                                <Image
                                  source={{ uri: `${BASE_URL}${doc.fileUrl}` }}
                                  style={styles.docThumb}
                                  resizeMode="cover"
                                />
                                <View style={styles.docZoomOverlay}>
                                  <Text style={{ fontSize: 10 }}>🔍</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.docThumbMissing}>
                                <Text style={{ fontSize: 18 }}>❌</Text>
                              </View>
                            )}
                            <Text style={[styles.docCellLabel, !doc && { color: '#DC2626' }]}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDocsBanner}>
                    <Text style={styles.noDocsText}>⚠️ No documents uploaded</Text>
                  </View>
                )}

                {/* ── Action Buttons ──────────────────────────── */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.acceptBtn, actionId === item._id && styles.btnDisabled]}
                    onPress={() => confirmAction(item, 'accepted')}
                    disabled={actionId === item._id}
                  >
                    {actionId === item._id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.acceptBtnText}>✅ Accept</Text>
                    }
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, actionId === item._id && styles.btnDisabled]}
                    onPress={() => confirmAction(item, 'rejected')}
                    disabled={actionId === item._id}
                  >
                    <Text style={styles.rejectBtnText}>❌ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: '#F8FAFC' },
  list:            { padding: 16, paddingBottom: 40 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:          { marginBottom: 20 },
  title:           { fontSize: 26, fontWeight: '900', color: PRIMARY },
  sub:             { color: '#64748B', marginTop: 4, fontWeight: '500' },
  loadingText:     { marginTop: 12, color: '#64748B' },

  card:                 { backgroundColor: '#fff', borderRadius: 18, marginBottom: 18, elevation: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  cardImage:            { width: '100%', height: 200 },
  cardImagePlaceholder: { width: '100%', height: 120, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  zoomHint:             { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  zoomHintText:         { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody:        { padding: 16 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  carName:         { fontSize: 18, fontWeight: '900', color: '#0F172A', flex: 1 },
  pendingBadge:    { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  pendingText:     { color: '#92400E', fontSize: 12, fontWeight: '800' },
  detail:          { color: '#64748B', fontSize: 14, marginBottom: 4, fontWeight: '500' },
  actionRow:       { flexDirection: 'row', gap: 10, marginTop: 16 },
  acceptBtn:       { flex: 1, backgroundColor: '#16A34A', borderRadius: 12, padding: 14, alignItems: 'center' },
  acceptBtnText:   { color: '#fff', fontWeight: '800', fontSize: 15 },
  rejectBtn:       { flex: 1, backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, alignItems: 'center' },
  rejectBtnText:   { color: '#DC2626', fontWeight: '800', fontSize: 15 },
  btnDisabled:     { opacity: 0.6 },
  emptyBox:        { alignItems: 'center', marginTop: 60 },
  emptyEmoji:      { fontSize: 60 },
  emptyTitle:      { fontSize: 22, fontWeight: '700', color: '#15803D', marginTop: 12 },
  emptySub:        { color: '#777', marginTop: 6 },

  // Document vault
  docVault:        { marginTop: 16, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  docVaultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  docVaultTitle:   { fontSize: 13, fontWeight: '800', color: '#334155' },
  viewAllBtn:      { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  viewAllText:     { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  docGrid:         { flexDirection: 'row', justifyContent: 'space-between' },
  docCell:         { alignItems: 'center', width: '23%' },
  docThumb:        { width: '100%', aspectRatio: 1, borderRadius: 10, marginBottom: 4 },
  docZoomOverlay:  { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 3 },
  docThumbMissing: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  docCellLabel:    { fontSize: 9, color: '#334155', fontWeight: '700', textAlign: 'center' },
  noDocsBanner:    { marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, alignItems: 'center' },
  noDocsText:      { color: '#92400E', fontWeight: '700', fontSize: 13 },
});

// ── Image Viewer Styles ───────────────────────────────────────────────────────
const vs = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: '#000' },
  topBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 14, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10 },
  docLabel:       { flex: 1, color: '#fff', fontWeight: '800', fontSize: 15 },
  counter:        { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginRight: 12 },
  counterText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeText:      { color: '#fff', fontSize: 18, fontWeight: '800' },
  imageContainer: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  fullImage:      { width: W, height: H * 0.75 },
  dots:           { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  dot:            { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:      { backgroundColor: '#fff', width: 20 },
  hint:           { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 12, paddingBottom: 20, fontWeight: '600' },
});
