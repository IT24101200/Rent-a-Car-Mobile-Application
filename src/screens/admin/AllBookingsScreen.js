import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, ScrollView, Platform, Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

import Card from '../../components/atoms/Card';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import TextInputAtom from '../../components/atoms/TextInput';
import Chip from '../../components/atoms/Chip';

const TABS = ['all','confirmed','active','returning','completed','cancelled'];
const TAB_LABELS = { all:'All', confirmed:'Confirmed', active:'Active', returning:'Returning', completed:'Done', cancelled:'Cancelled' };
const VALID_STATUSES = ['pending','confirmed','active','returning','completed','cancelled'];

export default function AllBookingsScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const canManage = user?.role === 'Admin' || user?.staffRole === 'Booking Manager';
  const S = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editStart, setEditStart] = useState(new Date());
  const [editEnd, setEditEnd] = useState(new Date());
  const [pickStart, setPickStart] = useState(false);
  const [pickEnd, setPickEnd] = useState(false);
  const [editStatus, setEditStatus] = useState('');

  const fetchBookings = useCallback(async (r = false) => {
    r ? setRefreshing(true) : setLoading(true);
    try { setBookings((await api.get('/api/admin/bookings')).data); }
    catch { Alert.alert('Error', 'Could not load bookings.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Memoized filtered data: 
  // 1. Filters by selected 'tab' status (e.g. 'all', 'confirmed')
  // 2. Filters by 'search' text (matching customer name, vehicle model, or booking ID)
  const filtered = useMemo(() => {
    let d = bookings;
    if (tab !== 'all') d = d.filter(b => b.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(b => (b.user?.name||'').toLowerCase().includes(q) || (b.vehicle?.makeAndModel||'').toLowerCase().includes(q) || b._id.slice(-6).toLowerCase().includes(q));
    }
    return d;
  }, [bookings, tab, search]);

  // Computed statistics for the top banner
  const stats = useMemo(() => ({
    total: bookings.length, // Total bookings in system
    active: bookings.filter(b => b.status === 'active').length, // Cars currently on the road
    revenue: bookings.filter(b => b.status !== 'cancelled').reduce((s, b) => s + (b.totalPrice || 0), 0), // Total non-cancelled revenue
    cancelRate: bookings.length ? Math.round(bookings.filter(b => b.status === 'cancelled').length / bookings.length * 100) : 0, // Percentage of cancelled bookings
  }), [bookings]);

  const SC = { confirmed:{bg:colors.info+'20',tx:colors.info}, active:{bg:colors.success+'20',tx:colors.success}, returning:{bg:colors.warning+'20',tx:colors.warning}, completed:{bg:colors.textSecondary+'20',tx:colors.textSecondary}, cancelled:{bg:colors.error+'20',tx:colors.error}, pending:{bg:colors.warning+'20',tx:colors.warning} };
  const fmt = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  // Force Cancellation: Allows Admin to bypass standard rules and unilaterally cancel any booking
  const doForceCancel = id => Alert.alert('Force Cancel','Cancel without user consent?',[{text:'Back',style:'cancel'},{text:'Confirm',style:'destructive',onPress:async()=>{setActionId(id);try{const r=await api.patch(`/api/admin/bookings/${id}/force-cancel`);setBookings(p=>p.map(b=>b._id===id?{...b,status:'cancelled',refundStatus:'pending'}:b));}catch{Alert.alert('Error','Failed.');}finally{setActionId(null);}}}]);

  // Change Status: Submits the updated status (e.g. from the Edit Modal) to the backend
  const doChangeStatus = async () => {
    if (!editItem||!editStatus) return;
    setActionId('edit');
    try { const r = await api.patch(`/api/admin/bookings/${editItem._id}/status`,{status:editStatus}); setBookings(p=>p.map(b=>b._id===editItem._id?r.data.booking:b)); Alert.alert('Success',r.data.message); setEditItem(null); }
    catch(e) { Alert.alert('Error',e.response?.data?.message||'Failed.'); }
    finally { setActionId(null); }
  };

  const doReschedule = async () => {
    if (!editItem) return;
    setActionId('edit');
    try { const r = await api.patch(`/api/admin/bookings/${editItem._id}/reschedule`,{startDate:editStart.toISOString(),endDate:editEnd.toISOString()}); setBookings(p=>p.map(b=>b._id===editItem._id?r.data.booking:b)); Alert.alert('Success',r.data.message); setEditItem(null); }
    catch(e) { Alert.alert('Error',e.response?.data?.message||'Failed.'); }
    finally { setActionId(null); }
  };

  const doRefund = async (id,cur) => {
    const nxt = cur==='issued'?'pending':'issued';
    setActionId(id);
    try { const r = await api.patch(`/api/admin/bookings/${id}/refund`,{refundStatus:nxt}); setBookings(p=>p.map(b=>b._id===id?r.data.booking:b)); }
    catch { Alert.alert('Error','Failed.'); }
    finally { setActionId(null); }
  };

  const doDelete = id => Alert.alert('Delete Record','Permanently remove this booking?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{setActionId(id);try{await api.delete(`/api/admin/bookings/${id}`);setBookings(p=>p.filter(b=>b._id!==id));}catch(e){Alert.alert('Error',e.response?.data?.message||'Failed.');}finally{setActionId(null);}}}]);

  const openEdit = b => { setEditItem(b); setEditStart(new Date(b.startDate)); setEditEnd(new Date(b.endDate)); setEditStatus(b.status); };

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;

  const StatBox = ({emoji,label,value,color}) => (
    <View style={S.statBox}>
      <Text style={{fontSize:20}}>{emoji}</Text>
      <Text style={[S.statVal,{color}]}>{value}</Text>
      <Text style={S.statLbl}>{label}</Text>
    </View>
  );

  const renderCard = ({item}) => {
    return (
      <Card pressable onPress={() => setDetailItem(item)} style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <View style={S.cardHead}>
          <Text style={S.cardVehicle} numberOfLines={1}>{item.vehicle?.makeAndModel||'Unknown'}</Text>
          <Badge 
            label={item.status.toUpperCase()}
            variant={
              item.status === 'completed' ? 'primary' : 
              item.status === 'cancelled' ? 'error' : 
              item.status === 'returning' ? 'warning' : 
              item.status === 'active' ? 'success' : 'primary'
            }
          />
        </View>
        {item.vehicle?.licensePlate && <Text style={S.plate}>🚘 {item.vehicle.licensePlate}</Text>}
        <Text style={S.cardDetail}>👤 {item.user?.name||'N/A'} ({item.user?.email||''})</Text>
        <Text style={S.cardDetail}>📅 {fmt(item.startDate)} → {fmt(item.endDate)}</Text>
        <Text style={S.cardPrice}>Rs. {(item.totalPrice||0).toLocaleString()}</Text>

        {item.status === 'cancelled' && item.refundStatus && (
          <View style={[S.refundBadge,{backgroundColor: item.refundStatus==='issued'?colors.success+'15':colors.warning+'15'}]}>
            <Text style={{color:item.refundStatus==='issued'?colors.success:colors.warning,fontWeight:'800',fontSize:12}}>
              💳 Refund: {item.refundStatus.toUpperCase()}
            </Text>
            {canManage && (
              <TouchableOpacity onPress={()=>doRefund(item._id,item.refundStatus)} disabled={!!actionId}>
                <Text style={{color:colors.primary,fontWeight:'800',fontSize:12,marginLeft:10}}>Toggle</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={S.cardActions}>
          <Text style={S.cardId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
          <View style={{flexDirection:'row',gap:8}}>
            {canManage && !['cancelled','completed'].includes(item.status) && (
              <Button label="✏️ Edit" size="compact" variant="ghost" onPress={()=>openEdit(item)} style={{borderWidth: 1, borderColor: colors.primary+'30'}} />
            )}
            {canManage && !['cancelled','completed'].includes(item.status) && (
              <Button label="Cancel" size="compact" variant="danger" onPress={()=>doForceCancel(item._id)} disabled={actionId===item._id} />
            )}
            {canManage && ['cancelled','completed'].includes(item.status) && (
              <Button label="🗑️" size="compact" variant="ghost" onPress={()=>doDelete(item._id)} disabled={actionId===item._id} textStyle={{color: colors.error}} style={{backgroundColor: colors.error+'15'}} />
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      <FlatList
        data={filtered}
        keyExtractor={i=>i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetchBookings(true)} tintColor={colors.primary}/>}
        contentContainerStyle={S.list}
        ListHeaderComponent={
          <View>
            <View style={S.header}>
              <Text style={S.title}>📋 Booking Manager</Text>
              <Text style={S.subtitle}>{stats.total} total bookings</Text>
              <View style={S.statsRow}>
                <StatBox emoji="📊" label="Total" value={stats.total} color="#fff"/>
                <StatBox emoji="✅" label="Active" value={stats.active} color="#4ADE80"/>
                <StatBox emoji="💰" label="Revenue" value={`${(stats.revenue/1000).toFixed(0)}K`} color="#FBBF24"/>
                <StatBox emoji="❌" label="Cancel" value={`${stats.cancelRate}%`} color="#F87171"/>
              </View>
            </View>
            <View style={{ paddingHorizontal: 16, marginBottom: 8, marginTop: 4 }}>
              <TextInputAtom placeholder="🔍 Search by name, vehicle, ID..." value={search} onChangeText={setSearch} />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={{gap:8,paddingHorizontal:16}}>
              {TABS.map(t=>(
                <Chip 
                  key={t}
                  label={`${TAB_LABELS[t]} ${t!=='all'?`(${bookings.filter(b=>b.status===t).length})`:''}`}
                  selected={tab === t}
                  onPress={()=>setTab(t)}
                />
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={S.empty}><Text style={{fontSize:50}}>📭</Text><Text style={S.emptyTitle}>No Bookings Found</Text><Text style={S.emptySub}>{search?'Try a different search term':'No bookings match this filter'}</Text></View>}
        renderItem={renderCard}
      />

      {/* ── Detail Modal ── */}
      <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={()=>setDetailItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>📋 Booking Details</Text>
              {detailItem && (<>
                <Badge 
                  label={detailItem.status.toUpperCase()}
                  variant={
                    detailItem.status === 'completed' ? 'primary' : 
                    detailItem.status === 'cancelled' ? 'error' : 
                    detailItem.status === 'returning' ? 'warning' : 
                    detailItem.status === 'active' ? 'success' : 'primary'
                  }
                  style={{ alignSelf: 'flex-start', marginBottom: 16 }}
                />
                <Text style={S.dlLabel}>Vehicle</Text>
                <Text style={S.dlValue}>{detailItem.vehicle?.makeAndModel||'Unknown'} {detailItem.vehicle?.licensePlate?`(${detailItem.vehicle.licensePlate})`:''}</Text>
                <Text style={S.dlLabel}>Customer</Text>
                <Text style={S.dlValue}>{detailItem.user?.name||'N/A'} — {detailItem.user?.email||''}</Text>
                <Text style={S.dlLabel}>Dates</Text>
                <Text style={S.dlValue}>{fmt(detailItem.startDate)} → {fmt(detailItem.endDate)}</Text>
                <Text style={S.dlLabel}>Total Price</Text>
                <Text style={[S.dlValue,{color:colors.success,fontWeight:'900',fontSize:20}]}>Rs. {(detailItem.totalPrice||0).toLocaleString()}</Text>
                {detailItem.cancellationReason && (<><Text style={S.dlLabel}>Cancellation Reason</Text><Text style={[S.dlValue,{color:colors.error}]}>{detailItem.cancellationReason}</Text></>)}
                {detailItem.refundStatus && detailItem.refundStatus !== 'none' && (<><Text style={S.dlLabel}>Refund Status</Text><Text style={[S.dlValue,{color:detailItem.refundStatus==='issued'?colors.success:colors.warning}]}>{detailItem.refundStatus.toUpperCase()}</Text></>)}
                {detailItem.checkInDetails?.time && (<><Text style={S.dlLabel}>Check-In</Text><Text style={S.dlValue}>🕐 {new Date(detailItem.checkInDetails.time).toLocaleString()}{detailItem.checkInDetails.odometer?` • Odometer: ${detailItem.checkInDetails.odometer} km`:''}</Text></>)}
                {detailItem.checkOutDetails?.time && (
                  <>
                    <Text style={S.dlLabel}>Check-Out</Text>
                    <Text style={S.dlValue}>🕐 {new Date(detailItem.checkOutDetails.time).toLocaleString()}{detailItem.checkOutDetails.odometer?` • Odometer: ${detailItem.checkOutDetails.odometer} km`:''}</Text>
                    {detailItem.checkOutDetails.conditionPhoto && (
                      <View style={{marginTop: 8}}>
                        <Text style={[S.dlLabel, {fontSize: 12}]}>Condition Photo</Text>
                        <Image source={{ uri: `${api.defaults.baseURL || 'http://localhost:5000'}${detailItem.checkOutDetails.conditionPhoto}` }} style={{width: 150, height: 100, borderRadius: 8, backgroundColor: colors.surfaceHighlight}} resizeMode="cover" />
                      </View>
                    )}
                  </>
                )}
                <Text style={S.dlLabel}>Booking ID</Text>
                <Text style={[S.dlValue,{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:12}]}>{detailItem._id}</Text>
                <Text style={S.dlLabel}>Created</Text>
                <Text style={S.dlValue}>{new Date(detailItem.createdAt).toLocaleString()}</Text>
              </>)}
            </ScrollView>
            <Button label="Close" variant="ghost" onPress={()=>setDetailItem(null)} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={()=>setEditItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>✏️ Edit Booking</Text>
              <Text style={S.modalSub}>{editItem?.vehicle?.makeAndModel} — {editItem?.user?.name}</Text>

              <Text style={S.dlLabel}>Change Status</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}}>
                {VALID_STATUSES.map(st=>(
                  <Chip key={st} label={st.charAt(0).toUpperCase() + st.slice(1)} selected={editStatus===st} onPress={()=>setEditStatus(st)} />
                ))}
              </View>
              <Button label="Update Status" onPress={doChangeStatus} loading={actionId==='edit'} disabled={actionId==='edit'} />

              <View style={S.divider}/>

              <Text style={S.dlLabel}>Reschedule Dates</Text>
              <TouchableOpacity style={S.dateBtn} onPress={()=>setPickStart(true)}>
                <Text style={S.dateBtnTxt}>📅 Start: {editStart.toLocaleDateString()}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.dateBtn} onPress={()=>setPickEnd(true)}>
                <Text style={S.dateBtnTxt}>📅 End: {editEnd.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {pickStart && <DateTimePicker value={editStart} mode="date" onChange={(e,d)=>{setPickStart(false);if(d)setEditStart(d);}}/>}
              {pickEnd && <DateTimePicker value={editEnd} mode="date" onChange={(e,d)=>{setPickEnd(false);if(d)setEditEnd(d);}}/>}
              <Button label="Reschedule & Recalculate" onPress={doReschedule} loading={actionId==='edit'} disabled={actionId==='edit'} style={{ backgroundColor: colors.success, marginTop: 12 }} />
            </ScrollView>
            <Button label="Cancel" variant="ghost" onPress={()=>setEditItem(null)} style={{ marginTop: 8 }} />
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
  tabScroll: { marginBottom:8, paddingHorizontal:12 },
  tabScroll: { marginBottom:8, paddingHorizontal:12 },
  cardHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  cardVehicle: { fontSize:17, fontWeight:'900', color:C.textPrimary, flex:1, letterSpacing:-0.2 },
  plate: { fontSize:12, fontWeight:'700', color:C.textMuted, marginBottom:6, letterSpacing:0.5 },
  cardDetail: { fontSize:13, color:C.textSecondary, marginBottom:4, fontWeight:'500' },
  cardPrice: { fontSize:18, fontWeight:'900', color:C.success, marginTop:6, letterSpacing:-0.5 },
  refundBadge: { flexDirection:'row', alignItems:'center', marginTop:10, padding:10, borderRadius:10 },
  cardActions: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth:1, borderTopColor:C.border, paddingTop:14, marginTop:12 },
  cardId: { color:C.textMuted, fontSize:12, fontWeight:'700', letterSpacing:1 },
  empty: { alignItems:'center', marginTop:60, paddingHorizontal:20 },
  emptyTitle: { fontSize:20, fontWeight:'900', color:C.textPrimary, marginTop:12 },
  emptySub: { color:C.textSecondary, marginTop:6, textAlign:'center', fontWeight:'500', fontSize:14 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:16 },
  modalContent: { backgroundColor:C.surface, borderRadius:20, padding:24, maxHeight:'85%' },
  modalTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5, marginBottom:4 },
  modalSub: { fontSize:14, fontWeight:'600', color:C.textSecondary, marginBottom:16 },
  dlLabel: { fontSize:11, fontWeight:'800', color:C.textMuted, marginTop:14, textTransform:'uppercase', letterSpacing:0.8 },
  dlValue: { fontSize:15, fontWeight:'600', color:C.textPrimary, marginTop:4 },
  divider: { height:1, backgroundColor:C.border, marginVertical:20 },
  dateBtn: { backgroundColor:C.surfaceHighlight, padding:14, borderRadius:12, marginTop:8, borderWidth:1, borderColor:C.border },
  dateBtnTxt: { fontSize:14, fontWeight:'700', color:C.textPrimary },
});
