import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, ScrollView, Platform, Switch, Image
} from 'react-native';
import api, { BASE_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const STATUS_TABS = ['all','accepted','pending','rejected'];
const STATUS_LABELS = { all:'All', accepted:'Accepted', pending:'Pending', rejected:'Rejected' };

export default function FleetManagementScreen() {
  const { colors, isDark } = useTheme();
  const S = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editFeatures, setEditFeatures] = useState('');
  const [editAvail, setEditAvail] = useState(true);

  const fetchFleet = useCallback(async (r = false) => {
    r ? setRefreshing(true) : setLoading(true);
    try { setVehicles((await api.get('/api/admin/vehicles')).data); }
    catch { Alert.alert('Error', 'Could not load fleet.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchFleet(); }, [fetchFleet]);

  const filtered = useMemo(() => {
    let d = vehicles;
    if (tab !== 'all') d = d.filter(v => v.validationStatus === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(v => (v.makeAndModel||'').toLowerCase().includes(q) || (v.licensePlate||'').toLowerCase().includes(q) || (v.owner?.name||'').toLowerCase().includes(q) || (v.type||'').toLowerCase().includes(q));
    }
    return d;
  }, [vehicles, tab, search]);

  const stats = useMemo(() => ({
    total: vehicles.length,
    accepted: vehicles.filter(v => v.validationStatus === 'accepted').length,
    pending: vehicles.filter(v => v.validationStatus === 'pending').length,
    rejected: vehicles.filter(v => v.validationStatus === 'rejected').length,
    avgPrice: vehicles.length ? Math.round(vehicles.filter(v=>v.validationStatus==='accepted').reduce((s,v) => s + (v.pricePerDay||0), 0) / Math.max(1, vehicles.filter(v=>v.validationStatus==='accepted').length)) : 0,
  }), [vehicles]);

  const SC = { accepted:{bg:colors.success+'20',tx:colors.success}, pending:{bg:colors.warning+'20',tx:colors.warning}, rejected:{bg:colors.error+'20',tx:colors.error} };

  const doToggleStatus = async (id, current) => {
    const next = current === 'accepted' ? 'rejected' : 'accepted';
    const label = next === 'accepted' ? 'Relist' : 'Delist';
    Alert.alert(label, `${label} this vehicle?`, [{text:'Cancel',style:'cancel'},{text:label,style:next==='rejected'?'destructive':'default',onPress:async()=>{
      setActionId(id);
      try { await api.patch(`/api/vehicles/${id}/status`, {validationStatus:next}); setVehicles(p=>p.map(v=>v._id===id?{...v,validationStatus:next}:v)); }
      catch { Alert.alert('Error','Failed.'); }
      finally { setActionId(null); }
    }}]);
  };

  const doEdit = async () => {
    if (!editItem) return;
    setActionId('edit');
    try {
      const body = { pricePerDay: parseFloat(editPrice) || editItem.pricePerDay, features: editFeatures, isAvailable: editAvail };
      const r = await api.patch(`/api/admin/vehicles/${editItem._id}`, body);
      setVehicles(p => p.map(v => v._id === editItem._id ? r.data.vehicle : v));
      Alert.alert('Success', r.data.message); setEditItem(null);
    } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Failed.'); }
    finally { setActionId(null); }
  };

  const doDelete = id => Alert.alert('Delete Vehicle','Permanently remove this vehicle and related records?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{
    setActionId(id);
    try { await api.delete(`/api/admin/vehicles/${id}`); setVehicles(p=>p.filter(v=>v._id!==id)); if(detailItem?._id===id)setDetailItem(null); }
    catch(e) { Alert.alert('Error',e.response?.data?.message||'Failed.'); }
    finally { setActionId(null); }
  }}]);

  const openEdit = v => { setEditItem(v); setEditPrice(String(v.pricePerDay||'')); setEditFeatures(v.features||''); setEditAvail(v.isAvailable!==false); };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;

  const StatBox = ({emoji,label,value,color}) => (
    <View style={S.statBox}><Text style={{fontSize:18}}>{emoji}</Text><Text style={[S.statVal,{color}]}>{value}</Text><Text style={S.statLbl}>{label}</Text></View>
  );

  const renderCard = ({item}) => {
    const sc = SC[item.validationStatus] || SC.pending;
    return (
      <TouchableOpacity style={S.card} activeOpacity={0.85} onPress={() => setDetailItem(item)}>
        <View style={S.cardHead}>
          <Text style={S.cardTitle} numberOfLines={1}>{item.makeAndModel}</Text>
          <View style={[S.badge,{backgroundColor:sc.bg}]}><Text style={[S.badgeTxt,{color:sc.tx}]}>{item.validationStatus.toUpperCase()}</Text></View>
        </View>
        <Text style={S.cardPrice}>Rs. {(item.pricePerDay||0).toLocaleString()} <Text style={{fontSize:12,color:colors.textSecondary}}>/ day</Text></Text>
        <Text style={S.cardDetail}>🔖 {item.licensePlate} • {item.year||'N/A'}</Text>
        <Text style={S.cardDetail}>{item.type||'Vehicle'} • {item.transmission||'N/A'} • {item.fuelType||'N/A'} • 💺 {item.seats||'N/A'}</Text>
        {item.owner && <Text style={S.cardDetail}>👤 {item.owner.name}</Text>}
        <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}>
          <View style={[S.availDot,{backgroundColor:item.isAvailable!==false?colors.success:colors.error}]}/>
          <Text style={[S.cardDetail,{marginBottom:0}]}>{item.isAvailable!==false?'Available':'Unavailable'}</Text>
        </View>
        <View style={S.cardActions}>
          <Text style={S.cardId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
          <View style={{flexDirection:'row',gap:8}}>
            {item.validationStatus !== 'pending' && (
              <TouchableOpacity style={S.actBtn} onPress={()=>doToggleStatus(item._id,item.validationStatus)} disabled={!!actionId}>
                <Text style={S.actBtnTxt}>{item.validationStatus==='accepted'?'Delist':'Relist'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={S.actBtn} onPress={()=>openEdit(item)}><Text style={S.actBtnTxt}>✏️</Text></TouchableOpacity>
            <TouchableOpacity style={[S.actBtn,{backgroundColor:colors.error+'10',borderColor:colors.error+'30'}]} onPress={()=>doDelete(item._id)} disabled={actionId===item._id}>
              <Text style={[S.actBtnTxt,{color:colors.error}]}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      <FlatList
        data={filtered} keyExtractor={i=>i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetchFleet(true)} tintColor={colors.primary}/>}
        contentContainerStyle={S.list}
        ListHeaderComponent={
          <View>
            <View style={S.header}>
              <Text style={S.title}>🚗 Fleet Manager</Text>
              <Text style={S.subtitle}>{stats.total} vehicles on platform</Text>
              <View style={S.statsRow}>
                <StatBox emoji="📊" label="Total" value={stats.total} color="#fff"/>
                <StatBox emoji="✅" label="Active" value={stats.accepted} color="#4ADE80"/>
                <StatBox emoji="⏳" label="Pending" value={stats.pending} color="#FBBF24"/>
                <StatBox emoji="💰" label="Avg Rate" value={`${(stats.avgPrice/1000).toFixed(1)}K`} color="#38BDF8"/>
              </View>
            </View>
            <TextInput style={S.searchBar} placeholder="🔍 Search by name, plate, owner..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={{gap:8,paddingHorizontal:4}}>
              {STATUS_TABS.map(t=>(
                <TouchableOpacity key={t} style={[S.tab,tab===t&&S.tabActive]} onPress={()=>setTab(t)}>
                  <Text style={[S.tabTxt,tab===t&&S.tabTxtActive]}>{STATUS_LABELS[t]} {t!=='all'?`(${stats[t]||0})`:''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={S.empty}><Text style={{fontSize:50}}>🛣️</Text><Text style={S.emptyTitle}>No Vehicles Found</Text><Text style={S.emptySub}>{search?'Try different search':'No vehicles match this filter'}</Text></View>}
        renderItem={renderCard}
      />

      {/* Detail Modal */}
      <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={()=>setDetailItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>🚗 Vehicle Details</Text>
              {detailItem && (<>
                <View style={[S.badge,{backgroundColor:(SC[detailItem.validationStatus]||SC.pending).bg,alignSelf:'flex-start',marginVertical:12}]}>
                  <Text style={[S.badgeTxt,{color:(SC[detailItem.validationStatus]||SC.pending).tx}]}>{detailItem.validationStatus.toUpperCase()}</Text>
                </View>
                {detailItem.imageUrl && <Image source={{uri:BASE_URL+detailItem.imageUrl}} style={{width:'100%',height:180,borderRadius:14,marginBottom:16}} resizeMode="cover"/>}
                <Text style={S.dlLabel}>Make & Model</Text>
                <Text style={[S.dlValue,{fontSize:20,fontWeight:'900'}]}>{detailItem.makeAndModel}</Text>
                <Text style={S.dlLabel}>License Plate</Text>
                <Text style={S.dlValue}>{detailItem.licensePlate}</Text>
                <Text style={S.dlLabel}>Specifications</Text>
                <Text style={S.dlValue}>{detailItem.type||'N/A'} • {detailItem.transmission||'N/A'} • {detailItem.fuelType||'N/A'} • {detailItem.seats||'N/A'} seats • {detailItem.year||'N/A'}</Text>
                <Text style={S.dlLabel}>Price Per Day</Text>
                <Text style={[S.dlValue,{color:colors.success,fontWeight:'900',fontSize:20}]}>Rs. {(detailItem.pricePerDay||0).toLocaleString()}</Text>
                <Text style={S.dlLabel}>Availability</Text>
                <Text style={[S.dlValue,{color:detailItem.isAvailable!==false?colors.success:colors.error,fontWeight:'800'}]}>{detailItem.isAvailable!==false?'✅ Available':'❌ Unavailable'}</Text>
                {detailItem.features && (<><Text style={S.dlLabel}>Features</Text><Text style={S.dlValue}>{detailItem.features}</Text></>)}
                {detailItem.owner && (<><Text style={S.dlLabel}>Owner</Text><Text style={S.dlValue}>{detailItem.owner.name} ({detailItem.owner.email})</Text></>)}
                {detailItem.documents?.length > 0 && (<><Text style={S.dlLabel}>Documents ({detailItem.documents.length})</Text>{detailItem.documents.map((d,i)=>(<Text key={i} style={S.dlValue}>📄 {d.docType}</Text>))}</>)}
                <Text style={S.dlLabel}>Vehicle ID</Text>
                <Text style={[S.dlValue,{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:11}]}>{detailItem._id}</Text>
                <Text style={S.dlLabel}>Added</Text>
                <Text style={S.dlValue}>{new Date(detailItem.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</Text>
              </>)}
            </ScrollView>
            <TouchableOpacity style={S.modalClose} onPress={()=>setDetailItem(null)}><Text style={S.modalCloseTxt}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={()=>setEditItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>✏️ Edit Vehicle</Text>
              <Text style={S.modalSub}>{editItem?.makeAndModel} — {editItem?.licensePlate}</Text>
              <Text style={S.dlLabel}>Price Per Day (Rs.)</Text>
              <TextInput style={S.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" placeholder="e.g. 5000" placeholderTextColor={colors.textMuted}/>
              <Text style={S.dlLabel}>Features</Text>
              <TextInput style={[S.input,{minHeight:70,textAlignVertical:'top'}]} value={editFeatures} onChangeText={setEditFeatures} multiline placeholder="e.g. Bluetooth, AC, Sunroof" placeholderTextColor={colors.textMuted}/>
              <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:16}}>
                <Text style={[S.dlLabel,{marginTop:0}]}>Available for Booking</Text>
                <Switch value={editAvail} onValueChange={setEditAvail} trackColor={{false:colors.border,true:colors.success+'60'}} thumbColor={editAvail?colors.success:'#ccc'}/>
              </View>
              <TouchableOpacity style={[S.saveBtn,actionId==='edit'&&{opacity:0.5}]} onPress={doEdit} disabled={actionId==='edit'}>
                {actionId==='edit'?<ActivityIndicator size="small" color="#fff"/>:<Text style={S.saveBtnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={S.modalClose} onPress={()=>setEditItem(null)}><Text style={S.modalCloseTxt}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (C, isDark) => StyleSheet.create({
  screen: { flex:1, backgroundColor:C.background },
  center: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:C.background },
  list: { paddingBottom:60 },
  header: { backgroundColor:C.headerGradientStart, paddingTop:50, paddingBottom:20, paddingHorizontal:20, borderBottomLeftRadius:24, borderBottomRightRadius:24 },
  title: { fontSize:26, fontWeight:'800', color:'#fff', letterSpacing:-0.5 },
  subtitle: { fontSize:14, color:'rgba(255,255,255,0.7)', fontWeight:'600', marginTop:4 },
  statsRow: { flexDirection:'row', marginTop:16, gap:8 },
  statBox: { flex:1, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:10, alignItems:'center' },
  statVal: { fontSize:18, fontWeight:'900', marginTop:4, color:'#fff' },
  statLbl: { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.6)', marginTop:2, textTransform:'uppercase', letterSpacing:0.5 },
  searchBar: { backgroundColor:C.surface, margin:16, marginBottom:8, padding:14, borderRadius:14, fontSize:15, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'600' },
  tabScroll: { marginBottom:8, paddingHorizontal:12 },
  tab: { paddingHorizontal:16, paddingVertical:8, borderRadius:20, backgroundColor:C.surfaceHighlight, borderWidth:1, borderColor:C.border },
  tabActive: { backgroundColor:C.primary, borderColor:C.primary },
  tabTxt: { fontSize:13, fontWeight:'700', color:C.textSecondary },
  tabTxtActive: { color:'#fff' },
  card: { backgroundColor:C.surface, padding:18, borderRadius:SIZES.radius, marginHorizontal:16, marginBottom:12, ...SHADOWS.card, borderWidth:1, borderColor:C.border },
  cardHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 },
  cardTitle: { fontSize:17, fontWeight:'900', color:C.textPrimary, flex:1, letterSpacing:-0.2 },
  cardPrice: { fontSize:18, fontWeight:'900', color:C.success, marginBottom:8, letterSpacing:-0.5 },
  badge: { paddingHorizontal:10, paddingVertical:5, borderRadius:SIZES.radiusPill, marginLeft:8 },
  badgeTxt: { fontWeight:'800', fontSize:10, letterSpacing:0.5 },
  cardDetail: { fontSize:12, color:C.textSecondary, fontWeight:'600', marginBottom:3 },
  availDot: { width:8, height:8, borderRadius:4 },
  cardActions: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth:1, borderTopColor:C.border, paddingTop:12, marginTop:10 },
  cardId: { color:C.textMuted, fontSize:11, fontWeight:'700', letterSpacing:1 },
  actBtn: { paddingHorizontal:12, paddingVertical:7, borderRadius:SIZES.radiusPill, backgroundColor:C.primary+'15', borderWidth:1, borderColor:C.primary+'30' },
  actBtnTxt: { fontWeight:'800', fontSize:12, color:C.primary },
  empty: { alignItems:'center', marginTop:60, paddingHorizontal:20 },
  emptyTitle: { fontSize:20, fontWeight:'900', color:C.textPrimary, marginTop:12 },
  emptySub: { color:C.textSecondary, marginTop:6, textAlign:'center', fontWeight:'500', fontSize:14 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:16 },
  modalContent: { backgroundColor:C.surface, borderRadius:20, padding:24, maxHeight:'85%' },
  modalTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5 },
  modalSub: { fontSize:14, fontWeight:'600', color:C.textSecondary, marginBottom:16 },
  modalClose: { marginTop:16, padding:14, borderRadius:12, backgroundColor:C.surfaceHighlight, alignItems:'center', borderWidth:1, borderColor:C.border },
  modalCloseTxt: { fontWeight:'800', color:C.textSecondary, fontSize:15 },
  dlLabel: { fontSize:11, fontWeight:'800', color:C.textMuted, marginTop:14, textTransform:'uppercase', letterSpacing:0.8 },
  dlValue: { fontSize:15, fontWeight:'600', color:C.textPrimary, marginTop:4 },
  input: { backgroundColor:C.surfaceHighlight, borderRadius:12, padding:14, fontSize:15, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'600', marginTop:8 },
  saveBtn: { backgroundColor:C.primary, padding:14, borderRadius:12, alignItems:'center', marginTop:20 },
  saveBtnTxt: { color:'#fff', fontWeight:'900', fontSize:15 },
});
