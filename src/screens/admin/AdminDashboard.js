import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, TextInput,
  ActivityIndicator, Alert, RefreshControl, Modal, Dimensions, StatusBar, ScrollView
} from 'react-native';
import api, { BASE_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const { width: W, height: H } = Dimensions.get('window');
const TABS = ['pending','accepted','rejected'];
const TAB_LABELS = { pending:'⏳ Pending', accepted:'✅ Accepted', rejected:'❌ Rejected' };

const DOC_META = [
  { key: 'revenueLicense', label: '🪪 Revenue License' },
  { key: 'insurance',      label: '🛡️ Insurance Cert.' },
  { key: 'registration',   label: '📝 Registration' },
  { key: 'fitness',        label: '🔧 Fitness Cert.' },
];

// ── Full-Screen Image Viewer ──
function ImageViewer({ images, startIndex, onClose }) {
  const [current, setCurrent] = useState(startIndex);
  const flatRef = useRef(null);
  const onScroll = (e) => { setCurrent(Math.round(e.nativeEvent.contentOffset.x / W)); };
  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <StatusBar hidden />
      <View style={vs.overlay}>
        <View style={vs.topBar}>
          <Text style={vs.docLabel}>{images[current]?.label}</Text>
          <View style={vs.counter}><Text style={vs.counterText}>{current + 1} / {images.length}</Text></View>
          <TouchableOpacity style={vs.closeBtn} onPress={onClose} activeOpacity={0.8}><Text style={vs.closeText}>✕</Text></TouchableOpacity>
        </View>
        <FlatList ref={flatRef} data={images} horizontal pagingEnabled showsHorizontalScrollIndicator={false} initialScrollIndex={startIndex} getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })} keyExtractor={(_, i) => String(i)} onMomentumScrollEnd={onScroll}
          renderItem={({ item }) => (
            <ScrollView style={{ width: W, height: H }} contentContainerStyle={vs.imageContainer} maximumZoomScale={4} minimumZoomScale={1} bouncesZoom>
              <Image source={{ uri: item.uri }} style={vs.fullImage} resizeMode="contain" />
            </ScrollView>
          )}
        />
        {images.length > 1 && <View style={vs.dots}>{images.map((_, i) => <View key={i} style={[vs.dot, i === current && vs.dotActive]} />)}</View>}
        <Text style={vs.hint}>Pinch to zoom • Swipe to browse</Text>
      </View>
    </Modal>
  );
}

// ── Main AdminDashboard ──
export default function AdminDashboard({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');

  // Image viewer
  const [viewerImages, setViewerImages] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const openViewer = (images, index) => { setViewerImages(images); setViewerIndex(index); setViewerOpen(true); };

  // Rejection modal
  const [rejectItem, setRejectItem] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');

  const fetchVehicles = useCallback(async (r = false) => {
    r ? setRefreshing(true) : setLoading(true);
    try { setVehicles((await api.get('/api/admin/vehicles')).data); }
    catch { Alert.alert('Error', 'Could not load vehicles.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const filtered = useMemo(() => {
    let d = vehicles.filter(v => v.validationStatus === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(v => (v.makeAndModel||'').toLowerCase().includes(q) || (v.licensePlate||'').toLowerCase().includes(q) || (v.owner?.name||'').toLowerCase().includes(q));
    }
    return d;
  }, [vehicles, tab, search]);

  const stats = useMemo(() => ({
    pending: vehicles.filter(v => v.validationStatus === 'pending').length,
    accepted: vehicles.filter(v => v.validationStatus === 'accepted').length,
    rejected: vehicles.filter(v => v.validationStatus === 'rejected').length,
    total: vehicles.length,
  }), [vehicles]);

  const buildGallery = (item) => {
    const imgs = [];
    if (item.imageUrl) imgs.push({ uri: `${BASE_URL}${item.imageUrl}`, label: `🚗 ${item.makeAndModel}` });
    if (item.documents) item.documents.forEach(doc => {
      const meta = DOC_META.find(d => d.key === doc.docType);
      imgs.push({ uri: `${BASE_URL}${doc.fileUrl}`, label: meta?.label || doc.docType });
    });
    return imgs;
  };

  const handleAccept = (vehicle) => {
    Alert.alert('✅ Accept Vehicle', `Accept "${vehicle.makeAndModel}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: async () => {
        setActionId(vehicle._id);
        try { const r = await api.patch(`/api/vehicles/${vehicle._id}/status`, { validationStatus: 'accepted' }); setVehicles(p => p.map(v => v._id === vehicle._id ? r.data : v)); Alert.alert('Done', 'Vehicle accepted.'); }
        catch { Alert.alert('Error', 'Failed.'); }
        finally { setActionId(null); }
      }}
    ]);
  };

  const openReject = (vehicle) => { setRejectItem(vehicle); setRejectReason(''); setRejectNote(''); };

  const handleReject = async () => {
    if (!rejectItem) return;
    if (!rejectReason.trim()) return Alert.alert('Required', 'Please provide a rejection reason.');
    setActionId(rejectItem._id);
    try {
      const r = await api.patch(`/api/vehicles/${rejectItem._id}/status`, { validationStatus: 'rejected', rejectionReason: rejectReason.trim(), validationNote: rejectNote.trim() || undefined });
      setVehicles(p => p.map(v => v._id === rejectItem._id ? r.data : v));
      Alert.alert('Done', 'Vehicle rejected.');
      setRejectItem(null);
    } catch { Alert.alert('Error', 'Failed.'); }
    finally { setActionId(null); }
  };

  const fmt = d => d ? new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary}/><Text style={styles.loadingText}>Loading vehicles...</Text></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      {viewerOpen && <ImageViewer images={viewerImages} startIndex={viewerIndex} onClose={() => setViewerOpen(false)}/>}

      <FlatList
        data={filtered} keyExtractor={i=>i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetchVehicles(true)} tintColor={colors.primary}/>}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.greenHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text style={styles.headerIcon}>🛡️</Text>
                  <Text style={styles.title}>Vehicle Validation</Text>
                  <Text style={styles.sub}>{stats.pending} awaiting review</Text>
                </View>
                <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('Notifications')}>
                  <Text style={styles.avatarText}>🔔</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}><Text style={{fontSize:22,fontWeight:'900',color:'#FBBF24'}}>{stats.pending}</Text><Text style={styles.statLbl}>Pending</Text></View>
                <View style={styles.statBox}><Text style={{fontSize:22,fontWeight:'900',color:'#4ADE80'}}>{stats.accepted}</Text><Text style={styles.statLbl}>Accepted</Text></View>
                <View style={styles.statBox}><Text style={{fontSize:22,fontWeight:'900',color:'#F87171'}}>{stats.rejected}</Text><Text style={styles.statLbl}>Rejected</Text></View>
                <View style={styles.statBox}><Text style={{fontSize:22,fontWeight:'900',color:'#fff'}}>{stats.total}</Text><Text style={styles.statLbl}>Total</Text></View>
              </View>
            </View>
            <TextInput style={styles.searchBar} placeholder="🔍 Search by name, plate, owner..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch}/>
            <View style={styles.tabRow}>
              {TABS.map(t => (
                <TouchableOpacity key={t} style={[styles.tabBtn, tab===t && styles.tabBtnActive]} onPress={()=>setTab(t)}>
                  <Text style={[styles.tabBtnTxt, tab===t && styles.tabBtnTxtActive]}>{TAB_LABELS[t]} ({stats[t]})</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>{tab==='pending'?'🎉':'📋'}</Text>
            <Text style={styles.emptyTitle}>{tab==='pending'?'All Clear!':'No Vehicles'}</Text>
            <Text style={styles.emptySub}>{tab==='pending'?'No vehicles pending review.':'No vehicles with this status.'}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const gallery = buildGallery(item);
          const sc = { accepted:{bg:colors.success+'20',tx:colors.success}, pending:{bg:colors.warning+'20',tx:colors.warning}, rejected:{bg:colors.error+'20',tx:colors.error} };
          const stc = sc[item.validationStatus] || sc.pending;
          return (
            <View style={styles.card}>
              {item.imageUrl ? (
                <TouchableOpacity activeOpacity={0.9} onPress={() => openViewer(gallery, 0)}>
                  <Image source={{ uri: `${BASE_URL}${item.imageUrl}` }} style={styles.cardImage} resizeMode="cover"/>
                  <View style={styles.zoomHint}><Text style={styles.zoomHintText}>🔍 Tap to view</Text></View>
                </TouchableOpacity>
              ) : (
                <View style={styles.cardImagePlaceholder}><Text style={{fontSize:40}}>🚗</Text><Text style={{color:colors.textMuted,fontSize:13,marginTop:8,fontWeight:'600'}}>No photo</Text></View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.carName}>{item.makeAndModel}</Text>
                  <View style={[styles.statusBadge,{backgroundColor:stc.bg}]}><Text style={[styles.statusBadgeText,{color:stc.tx}]}>{item.validationStatus.toUpperCase()}</Text></View>
                </View>
                <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year||'N/A'}</Text>
                <Text style={styles.detail}>{item.type||'Vehicle'} • {item.transmission||'N/A'} • {item.fuelType||'N/A'} • 💺 {item.seats||'N/A'}</Text>
                {item.features ? <Text style={[styles.detail,{fontStyle:'italic',fontSize:12}]}>{item.features}</Text> : null}
                <Text style={styles.priceRow}>💰 Rs. {item.pricePerDay} <Text style={{color:colors.textSecondary,fontSize:12}}>/ day</Text></Text>
                {item.owner && <Text style={[styles.detail,{marginTop:6}]}>👤 Owner: {item.owner.name} ({item.owner.email})</Text>}

                {/* Rejection Reason Banner */}
                {item.validationStatus === 'rejected' && item.rejectionReason ? (
                  <View style={styles.rejectBanner}><Text style={styles.rejectBannerLabel}>❌ Rejection Reason:</Text><Text style={styles.rejectBannerText}>{item.rejectionReason}</Text></View>
                ) : null}

                {/* Validation Note */}
                {item.validationNote ? (
                  <View style={styles.noteBanner}><Text style={styles.noteBannerLabel}>📝 Note:</Text><Text style={styles.noteBannerText}>{item.validationNote}</Text></View>
                ) : null}

                {/* Validated By/At */}
                {item.validatedAt && (
                  <Text style={[styles.detail,{marginTop:8,fontStyle:'italic'}]}>✅ Validated {fmt(item.validatedAt)} {item.validatedBy ? `by ${item.validatedBy.name||'Admin'}` : ''}</Text>
                )}

                {/* Document Vault */}
                {item.documents && item.documents.length > 0 ? (
                  <View style={styles.docVault}>
                    <View style={styles.docVaultHeader}>
                      <Text style={styles.docVaultTitle}>📁 Submitted Documents</Text>
                      {gallery.length > 1 && <TouchableOpacity style={styles.viewAllBtn} onPress={() => openViewer(gallery, 1)} activeOpacity={0.7}><Text style={styles.viewAllText}>View All →</Text></TouchableOpacity>}
                    </View>
                    <View style={styles.docGrid}>
                      {DOC_META.map(({ key, label }) => {
                        const doc = item.documents.find(d => d.docType === key);
                        const docIndex = gallery.findIndex(g => g.label === label);
                        return (
                          <View key={key} style={styles.docCell}>
                            {doc ? (
                              <TouchableOpacity activeOpacity={0.8} onPress={() => openViewer(gallery, docIndex >= 0 ? docIndex : 0)}>
                                <Image source={{ uri: `${BASE_URL}${doc.fileUrl}` }} style={styles.docThumb} resizeMode="cover"/>
                                <View style={styles.docZoomOverlay}><Text style={{fontSize:10}}>🔍</Text></View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.docThumbMissing}><Text style={{fontSize:18}}>❌</Text></View>
                            )}
                            <Text style={[styles.docCellLabel, !doc && {color:colors.error}]}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View style={styles.noDocsBanner}><Text style={styles.noDocsText}>⚠️ No documents uploaded</Text></View>
                )}

                {/* Actions */}
                {item.validationStatus === 'pending' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.rejectBtn, actionId===item._id && styles.btnDisabled]} onPress={() => openReject(item)} disabled={actionId===item._id} activeOpacity={0.8}>
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.acceptBtn, actionId===item._id && styles.btnDisabled]} onPress={() => handleAccept(item)} disabled={actionId===item._id} activeOpacity={0.8}>
                      {actionId===item._id ? <ActivityIndicator color="#fff" size="small"/> : <Text style={styles.acceptBtnText}>Accept Vehicle</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Rejection Modal */}
      <Modal visible={!!rejectItem} transparent animationType="slide" onRequestClose={()=>setRejectItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>❌ Reject Vehicle</Text>
            <Text style={styles.modalSub}>{rejectItem?.makeAndModel} — {rejectItem?.licensePlate}</Text>
            <Text style={styles.dlLabel}>Rejection Reason *</Text>
            <TextInput style={styles.modalInput} placeholder="e.g. Incomplete documents, expired insurance..." placeholderTextColor={colors.textMuted} value={rejectReason} onChangeText={setRejectReason} multiline numberOfLines={3}/>
            <Text style={styles.dlLabel}>Internal Note (optional)</Text>
            <TextInput style={styles.modalInput} placeholder="Private note for the validation team..." placeholderTextColor={colors.textMuted} value={rejectNote} onChangeText={setRejectNote} multiline numberOfLines={2}/>
            <TouchableOpacity style={[styles.rejectConfirmBtn, actionId&&{opacity:0.5}]} onPress={handleReject} disabled={!!actionId}>
              {actionId ? <ActivityIndicator size="small" color="#fff"/> : <Text style={styles.rejectConfirmTxt}>Reject Vehicle</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={()=>setRejectItem(null)}><Text style={styles.modalCancelTxt}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen: { flex:1, backgroundColor:C.background },
  list: { paddingBottom:60 },
  center: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:C.background },
  loadingText: { marginTop:16, color:C.textSecondary, fontWeight:'600', fontSize:15 },
  greenHeader: { backgroundColor:C.headerGradientStart, paddingTop:50, paddingBottom:20, paddingHorizontal:20, borderBottomLeftRadius:24, borderBottomRightRadius:24 },
  headerIcon: { fontSize:28, marginBottom:8 },
  title: { fontSize:26, fontWeight:'800', color:'#fff', letterSpacing:-0.5 },
  sub: { color:'rgba(255,255,255,0.7)', marginTop:4, fontWeight:'500', fontSize:14 },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  statsRow: { flexDirection:'row', marginTop:16, gap:8 },
  statBox: { flex:1, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:10, alignItems:'center' },
  statLbl: { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.6)', marginTop:4, textTransform:'uppercase', letterSpacing:0.5 },
  searchBar: { backgroundColor:C.surface, margin:16, marginBottom:8, padding:14, borderRadius:14, fontSize:15, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'600' },
  tabRow: { flexDirection:'row', gap:8, marginHorizontal:16, marginBottom:12 },
  tabBtn: { flex:1, paddingVertical:10, borderRadius:14, backgroundColor:C.surfaceHighlight, alignItems:'center', borderWidth:1, borderColor:C.border },
  tabBtnActive: { backgroundColor:C.primary, borderColor:C.primary },
  tabBtnTxt: { fontSize:12, fontWeight:'800', color:C.textSecondary },
  tabBtnTxtActive: { color:'#fff' },

  card: { backgroundColor:C.surface, borderRadius:SIZES.radius, marginHorizontal:16, marginBottom:20, overflow:'hidden', borderWidth:1, borderColor:C.border },
  cardImage: { width:'100%', height:200 },
  cardImagePlaceholder: { width:'100%', height:140, backgroundColor:C.surfaceHighlight, alignItems:'center', justifyContent:'center' },
  zoomHint: { position:'absolute', bottom:12, right:12, backgroundColor:'rgba(6,95,70,0.8)', borderRadius:SIZES.radius, paddingHorizontal:12, paddingVertical:6 },
  zoomHintText: { color:'#fff', fontSize:11, fontWeight:'800', letterSpacing:0.5, textTransform:'uppercase' },
  cardBody: { padding:20 },
  cardHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  carName: { fontSize:18, fontWeight:'800', color:C.textPrimary, flex:1, letterSpacing:-0.2 },
  statusBadge: { paddingHorizontal:10, paddingVertical:5, borderRadius:SIZES.radiusPill, marginLeft:8 },
  statusBadgeText: { fontSize:10, fontWeight:'900', letterSpacing:0.5 },
  detail: { color:C.textSecondary, fontSize:13, marginBottom:4, fontWeight:'600' },
  priceRow: { fontWeight:'900', color:C.success, fontSize:18, marginTop:8, letterSpacing:-0.2 },

  rejectBanner: { backgroundColor:C.error+'10', padding:12, borderRadius:12, marginTop:12, borderWidth:1, borderColor:C.error+'25' },
  rejectBannerLabel: { fontSize:11, fontWeight:'800', color:C.error, marginBottom:4 },
  rejectBannerText: { fontSize:13, fontWeight:'600', color:C.textPrimary, lineHeight:20 },
  noteBanner: { backgroundColor:'#7C3AED08', padding:12, borderRadius:12, marginTop:8, borderWidth:1, borderColor:'#7C3AED20' },
  noteBannerLabel: { fontSize:11, fontWeight:'800', color:'#7C3AED', marginBottom:4 },
  noteBannerText: { fontSize:13, fontWeight:'500', color:C.textPrimary },

  actionRow: { flexDirection:'row', gap:12, marginTop:20 },
  acceptBtn: { flex:2, backgroundColor:C.primary, borderRadius:SIZES.radius, paddingVertical:14, alignItems:'center', ...SHADOWS.float },
  acceptBtnText: { color:'#fff', fontWeight:'800', fontSize:15 },
  rejectBtn: { flex:1, backgroundColor:C.surfaceHighlight, borderRadius:SIZES.radius, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:C.border },
  rejectBtnText: { color:C.error, fontWeight:'800', fontSize:15 },
  btnDisabled: { opacity:0.6 },

  emptyBox: { alignItems:'center', marginTop:80, paddingHorizontal:20 },
  emptyEmoji: { fontSize:60, marginBottom:16 },
  emptyTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5 },
  emptySub: { color:C.textSecondary, marginTop:8, textAlign:'center', fontWeight:'500', fontSize:15, lineHeight:22 },

  docVault: { marginTop:20, backgroundColor:C.surfaceHighlight, borderRadius:SIZES.radius, padding:16, borderWidth:1, borderColor:C.border },
  docVaultHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  docVaultTitle: { fontSize:14, fontWeight:'800', color:C.textPrimary, letterSpacing:-0.2 },
  viewAllBtn: { backgroundColor:C.surface, paddingHorizontal:12, paddingVertical:6, borderRadius:SIZES.radius, borderWidth:1, borderColor:C.border },
  viewAllText: { color:C.primary, fontSize:11, fontWeight:'800', textTransform:'uppercase', letterSpacing:0.5 },
  docGrid: { flexDirection:'row', justifyContent:'space-between' },
  docCell: { alignItems:'center', width:'23%' },
  docThumb: { width:'100%', aspectRatio:1, borderRadius:SIZES.radius, marginBottom:6, ...SHADOWS.light },
  docZoomOverlay: { position:'absolute', top:6, right:6, backgroundColor:'rgba(6,95,70,0.6)', borderRadius:20, padding:4 },
  docThumbMissing: { width:'100%', aspectRatio:1, borderRadius:SIZES.radius, backgroundColor:C.errorBg, alignItems:'center', justifyContent:'center', marginBottom:6, borderWidth:1, borderColor:C.error, borderStyle:'dashed' },
  docCellLabel: { fontSize:9, color:C.textSecondary, fontWeight:'800', textAlign:'center', textTransform:'uppercase' },
  noDocsBanner: { marginTop:16, backgroundColor:C.warningBg, borderRadius:SIZES.radius, padding:12, alignItems:'center', borderWidth:1, borderColor:C.warning },
  noDocsText: { color:C.warning, fontWeight:'800', fontSize:13 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:16 },
  modalContent: { backgroundColor:C.surface, borderRadius:20, padding:24 },
  modalTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5 },
  modalSub: { fontSize:14, fontWeight:'600', color:C.textSecondary, marginBottom:16 },
  dlLabel: { fontSize:11, fontWeight:'800', color:C.textMuted, marginTop:14, textTransform:'uppercase', letterSpacing:0.8 },
  modalInput: { backgroundColor:C.surfaceHighlight, borderRadius:12, padding:14, fontSize:14, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'500', marginTop:8, textAlignVertical:'top', minHeight:70 },
  rejectConfirmBtn: { backgroundColor:C.error, padding:14, borderRadius:12, alignItems:'center', marginTop:20 },
  rejectConfirmTxt: { color:'#fff', fontWeight:'900', fontSize:15 },
  modalCancel: { marginTop:10, padding:14, borderRadius:12, backgroundColor:C.surfaceHighlight, alignItems:'center', borderWidth:1, borderColor:C.border },
  modalCancelTxt: { fontWeight:'800', color:C.textSecondary, fontSize:15 },
});

const vs = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'#0F172A' },
  topBar: { flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingTop:60, paddingBottom:16, backgroundColor:'rgba(15,23,42,0.85)', zIndex:10 },
  docLabel: { flex:1, color:'#fff', fontWeight:'800', fontSize:16, letterSpacing:-0.2 },
  counter: { backgroundColor:'rgba(255,255,255,0.15)', paddingHorizontal:12, paddingVertical:6, borderRadius:SIZES.radiusPill, marginRight:16 },
  counterText: { color:'#fff', fontSize:12, fontWeight:'800' },
  closeBtn: { width:40, height:40, borderRadius:20, backgroundColor:'rgba(255,255,255,0.2)', alignItems:'center', justifyContent:'center' },
  closeText: { color:'#fff', fontSize:18, fontWeight:'900' },
  imageContainer: { width:W, height:H, alignItems:'center', justifyContent:'center' },
  fullImage: { width:W, height:H*0.75 },
  dots: { flexDirection:'row', justifyContent:'center', paddingVertical:24, gap:10 },
  dot: { width:8, height:8, borderRadius:4, backgroundColor:'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor:'#fff', width:24 },
  hint: { textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:13, paddingBottom:30, fontWeight:'600', letterSpacing:0.5 },
});
