import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, RefreshControl,
  Modal, Dimensions, StatusBar, ScrollView
} from 'react-native';
import api, { BASE_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

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
          <TouchableOpacity style={vs.closeBtn} onPress={onClose} activeOpacity={0.8}>
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPending(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.greenHeader}>
            <Text style={styles.headerIcon}>🛡️</Text>
            <Text style={styles.title}>Admin Approvals</Text>
            <Text style={styles.sub}>{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} awaiting review</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyTitle}>All Clear!</Text>
            <Text style={styles.emptySub}>No vehicles pending approval at the moment.</Text>
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
                  <Text style={{ fontSize: 40 }}>🚗</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8, fontWeight: '600' }}>No photo uploaded</Text>
                </View>
              )}

              {/* ── Details Body ─────────────────────────────── */}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.carName}>{item.makeAndModel}</Text>
                  <View style={styles.pendingBadge}><Text style={styles.pendingText}>⏳ PENDING</Text></View>
                </View>
                <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
                <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
                {item.features ? <Text style={[styles.detail, {fontStyle: 'italic', fontSize: 12}]}>{item.features}</Text> : null}
                <Text style={styles.priceRow}>💰 Rs. {item.pricePerDay} <Text style={{color: colors.textSecondary, fontSize: 12}}>/ day</Text></Text>

                {/* ── Document Vault ─────────────────────────── */}
                {item.documents && item.documents.length > 0 ? (
                  <View style={styles.docVault}>
                    <View style={styles.docVaultHeader}>
                      <Text style={styles.docVaultTitle}>📁 Submitted Documents</Text>
                      {gallery.length > 1 && (
                        <TouchableOpacity
                          style={styles.viewAllBtn}
                          onPress={() => openViewer(gallery, 1)}
                          activeOpacity={0.7}
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
                            <Text style={[styles.docCellLabel, !doc && { color: colors.error }]}>{label}</Text>
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
                    style={[styles.rejectBtn, actionId === item._id && styles.btnDisabled]}
                    onPress={() => confirmAction(item, 'rejected')}
                    disabled={actionId === item._id}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptBtn, actionId === item._id && styles.btnDisabled]}
                    onPress={() => confirmAction(item, 'accepted')}
                    disabled={actionId === item._id}
                    activeOpacity={0.8}
                  >
                    {actionId === item._id
                      ? <ActivityIndicator color={colors.surface} size="small" />
                      : <Text style={styles.acceptBtnText}>Accept Vehicle</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (C) => StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.background },
  list:            { paddingHorizontal: 20, paddingBottom: 60 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  
  greenHeader: { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 20 , marginHorizontal: -20, marginTop: -20},
  headerIcon:      { fontSize: 28, marginBottom: 8 },
  title:           { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  sub:             { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontWeight: '500', fontSize: 14 },
  loadingText:     { marginTop: 16, color: C.textSecondary, fontWeight: '600', fontSize: 15 },

  card:                 { backgroundColor: C.surface, borderRadius: SIZES.radius, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  cardImage:            { width: '100%', height: 220 },
  cardImagePlaceholder: { width: '100%', height: 160, backgroundColor: C.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  zoomHint:             { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(6, 95, 70, 0.8)', borderRadius: SIZES.radius, paddingHorizontal: 12, paddingVertical: 6 },
  zoomHintText:         { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardBody:        { padding: 20 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  carName:         { fontSize: 18, fontWeight: '800', color: C.textPrimary, flex: 1, letterSpacing: -0.2 },
  pendingBadge:    { backgroundColor: C.warningBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: SIZES.radius, marginLeft: 8 },
  pendingText:     { color: C.warning, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  detail:          { color: C.textSecondary, fontSize: 13, marginBottom: 4, fontWeight: '600' },
  priceRow:        { fontWeight: '900', color: C.success, fontSize: 18, marginTop: 8, letterSpacing: -0.2 },
  
  actionRow:       { flexDirection: 'row', gap: 12, marginTop: 20 },
  acceptBtn:       { flex: 2, backgroundColor: C.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', ...SHADOWS.float },
  acceptBtnText:   { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  rejectBtn:       { flex: 1, backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  rejectBtnText:   { color: C.error, fontWeight: '800', fontSize: 15 },
  btnDisabled:     { opacity: 0.6 },
  
  emptyBox:        { alignItems: 'center', marginTop: 80, paddingHorizontal: 20 },
  emptyEmoji:      { fontSize: 70, marginBottom: 16 },
  emptyTitle:      { fontSize: 24, fontWeight: '900', color: C.success, letterSpacing: -0.5 },
  emptySub:        { color: C.textSecondary, marginTop: 8, textAlign: 'center', fontWeight: '500', fontSize: 15, lineHeight: 22 },

  // Document vault
  docVault:        { marginTop: 20, backgroundColor: C.surfaceHighlight, borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: C.border },
  docVaultHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  docVaultTitle:   { fontSize: 14, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  viewAllBtn:      { backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.border },
  viewAllText:     { color: C.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  docGrid:         { flexDirection: 'row', justifyContent: 'space-between' },
  docCell:         { alignItems: 'center', width: '23%' },
  docThumb:        { width: '100%', aspectRatio: 1, borderRadius: SIZES.radius, marginBottom: 6, ...SHADOWS.light },
  docZoomOverlay:  { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(6, 95, 70, 0.6)', borderRadius: 20, padding: 4 },
  docThumbMissing: { width: '100%', aspectRatio: 1, borderRadius: SIZES.radius, backgroundColor: C.errorBg, alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 1, borderColor: C.error, borderStyle: 'dashed' },
  docCellLabel:    { fontSize: 9, color: C.textSecondary, fontWeight: '800', textAlign: 'center', textTransform: 'uppercase' },
  noDocsBanner:    { marginTop: 16, backgroundColor: C.warningBg, borderRadius: SIZES.radius, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.warning },
  noDocsText:      { color: C.warning, fontWeight: '800', fontSize: 13 },
});

const vs = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: '#0F172A' }, // Darker, premium slate
  topBar:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: 'rgba(15, 23, 42, 0.85)', zIndex: 10 },
  docLabel:       { flex: 1, color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: -0.2 },
  counter:        { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusPill, marginRight: 16 },
  counterText:    { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  closeBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeText:      { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  imageContainer: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  fullImage:      { width: W, height: H * 0.75 },
  dots:           { flexDirection: 'row', justifyContent: 'center', paddingVertical: 24, gap: 10 },
  dot:            { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive:      { backgroundColor: '#FFFFFF', width: 24 },
  hint:           { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 13, paddingBottom: 30, fontWeight: '600', letterSpacing: 0.5 },
});
