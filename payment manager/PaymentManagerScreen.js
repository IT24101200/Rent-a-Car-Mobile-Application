import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, ScrollView, Platform, Image, Linking
} from 'react-native';
import api, { API_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const TABS = ['all','paid','transfers','pending','refunded'];
const TAB_LABELS = { all:'All', paid:'💳 Paid', transfers:'🏦 Transfers', pending:'⏳ Pending Refund', refunded:'✅ Refunded' };

export default function PaymentManagerScreen() {
  const { colors, isDark } = useTheme();
  const S = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);

  const fetchPayments = useCallback(async (r = false) => {
    r ? setRefreshing(true) : setLoading(true);
    try { setBookings((await api.get('/api/admin/payments')).data); }
    catch { Alert.alert('Error', 'Could not load payments.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    let d = bookings;
    if (tab === 'paid') d = d.filter(b => b.paymentStatus === 'paid' && b.refundStatus === 'none' && b.status !== 'cancelled');
    else if (tab === 'transfers') d = d.filter(b => b.paymentMethod === 'bank_transfer' && b.paymentStatus === 'pending');
    else if (tab === 'pending') d = d.filter(b => b.refundStatus === 'pending');
    else if (tab === 'refunded') d = d.filter(b => b.refundStatus === 'issued');
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(b => (b.user?.name||'').toLowerCase().includes(q) || (b.vehicle?.makeAndModel||'').toLowerCase().includes(q) || b._id.slice(-6).toLowerCase().includes(q));
    }
    return d;
  }, [bookings, tab, search]);

  const stats = useMemo(() => {
    const paid = bookings.filter(b => b.status !== 'cancelled');
    const revenue = paid.reduce((s, b) => s + (b.totalPrice || 0), 0);
    const pendingRefunds = bookings.filter(b => b.refundStatus === 'pending').length;
    const issuedRefunds = bookings.filter(b => b.refundStatus === 'issued').length;
    const pendingTransfers = bookings.filter(b => b.paymentMethod === 'bank_transfer' && b.paymentStatus === 'pending').length;
    const avg = paid.length ? Math.round(revenue / paid.length) : 0;
    return { revenue, pendingRefunds, issuedRefunds, pendingTransfers, avg, total: bookings.length };
  }, [bookings]);

  const doRefund = async (id, newStatus) => {
    const label = newStatus === 'issued' ? 'Issue Refund' : newStatus === 'pending' ? 'Mark Pending' : 'Revoke Refund';
    Alert.alert(label, `${label} for this booking?`, [{text:'Cancel',style:'cancel'},{text:'Confirm',onPress:async()=>{
      setActionId(id);
      try {
        const r = await api.patch(`/api/admin/payments/${id}/refund`, { refundStatus: newStatus });
        setBookings(p => p.map(b => b._id === id ? r.data.booking : b));
        if (detailItem?._id === id) setDetailItem(r.data.booking);
      } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Failed.'); }
      finally { setActionId(null); }
    }}]);
  };

  const verifyBankTransfer = async (id, action) => {
    const label = action === 'approve' ? 'Approve Payment' : 'Reject Payment';
    Alert.alert(label, `Are you sure you want to ${action} this bank transfer?`, [{text:'Cancel',style:'cancel'},{text:'Confirm',onPress:async()=>{
      setActionId(id);
      try {
        const r = await api.patch(`/api/admin/payments/${id}/status`, { action });
        setBookings(p => p.map(b => b._id === id ? r.data.booking : b));
        if (detailItem?._id === id) setDetailItem(r.data.booking);
      } catch(e) { Alert.alert('Error', e.response?.data?.message || 'Failed.'); }
      finally { setActionId(null); }
    }}]);
  };

  const fmt = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  const fmtK = n => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : String(n);

  const getRefundColor = (rs) => ({ none: colors.success, pending: colors.warning, issued: colors.info }[rs] || colors.textMuted);
  const getRefundLabel = (rs) => ({ none: 'PAID', pending: 'REFUND PENDING', issued: 'REFUNDED' }[rs] || 'N/A');
  const getMethodBadge = (m) => ({ cash: '💵 Cash', card: '💳 Card', online: '🌐 Online', bank_transfer: '🏦 Transfer' }[m] || '💵 Cash');

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;

  const renderCard = ({item}) => (
    <TouchableOpacity style={S.card} activeOpacity={0.85} onPress={() => setDetailItem(item)}>
      <View style={S.cardHead}>
        <View style={{flex:1}}>
          <Text style={S.cardVehicle} numberOfLines={1}>{item.vehicle?.makeAndModel||'Unknown'}</Text>
          <Text style={S.cardCustomer}>👤 {item.user?.name||'N/A'}</Text>
        </View>
        <Text style={S.cardAmount}>Rs. {(item.totalPrice||0).toLocaleString()}</Text>
      </View>
      <Text style={S.cardDates}>📅 {fmt(item.startDate)} → {fmt(item.endDate)}</Text>
      <View style={S.cardMeta}>
        <View style={[S.methodBadge,{backgroundColor:colors.surfaceHighlight}]}><Text style={S.methodTxt}>{getMethodBadge(item.paymentMethod)}</Text></View>
        <View style={[S.refundBadge,{backgroundColor: item.paymentMethod==='bank_transfer'&&item.paymentStatus==='pending' ? colors.warning+'15' : getRefundColor(item.refundStatus)+'15'}]}>
          <Text style={[S.refundTxt,{color:item.paymentMethod==='bank_transfer'&&item.paymentStatus==='pending' ? colors.warning : getRefundColor(item.refundStatus)}]}>
            {item.paymentMethod==='bank_transfer'&&item.paymentStatus==='pending' ? 'PENDING VERIFICATION' : getRefundLabel(item.refundStatus)}
          </Text>
        </View>
        {item.status === 'cancelled' && <View style={[S.refundBadge,{backgroundColor:colors.error+'15'}]}><Text style={[S.refundTxt,{color:colors.error}]}>CANCELLED</Text></View>}
      </View>
      <View style={S.cardActions}>
        <Text style={S.cardId}>ID: {item._id.slice(-6).toUpperCase()}</Text>
        <View style={{flexDirection:'row',gap:8}}>
          {item.refundStatus === 'pending' && (
            <TouchableOpacity style={[S.actBtn,{backgroundColor:colors.success+'15',borderColor:colors.success+'30'}]} onPress={()=>doRefund(item._id,'issued')} disabled={!!actionId}>
              <Text style={[S.actBtnTxt,{color:colors.success}]}>✅ Issue</Text>
            </TouchableOpacity>
          )}
          {item.refundStatus === 'issued' && (
            <TouchableOpacity style={[S.actBtn,{backgroundColor:colors.warning+'15',borderColor:colors.warning+'30'}]} onPress={()=>doRefund(item._id,'none')} disabled={!!actionId}>
              <Text style={[S.actBtnTxt,{color:colors.warning}]}>↩️ Revoke</Text>
            </TouchableOpacity>
          )}
          {item.status === 'cancelled' && item.refundStatus === 'none' && (
            <TouchableOpacity style={[S.actBtn,{backgroundColor:colors.info+'15',borderColor:colors.info+'30'}]} onPress={()=>doRefund(item._id,'pending')} disabled={!!actionId}>
              <Text style={[S.actBtnTxt,{color:colors.info}]}>⏳ Pending</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      <FlatList
        data={filtered} keyExtractor={i=>i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetchPayments(true)} tintColor={colors.primary}/>}
        contentContainerStyle={S.list}
        ListHeaderComponent={
          <View>
            <View style={S.header}>
              <Text style={S.title}>💰 Payment Manager</Text>
              <Text style={S.subtitle}>{stats.total} transactions</Text>
              <View style={S.statsRow}>
                <View style={S.statBox}><Text style={{fontSize:18}}> 💰</Text><Text style={[S.statVal,{color:'#4ADE80'}]}>Rs.{fmtK(stats.revenue)}</Text><Text style={S.statLbl}>Revenue</Text></View>
                <View style={S.statBox}><Text style={{fontSize:18}}>🏦</Text><Text style={[S.statVal,{color:'#FB923C'}]}>{stats.pendingTransfers}</Text><Text style={S.statLbl}>Transfers</Text></View>
                <View style={S.statBox}><Text style={{fontSize:18}}>⏳</Text><Text style={[S.statVal,{color:'#FBBF24'}]}>{stats.pendingRefunds}</Text><Text style={S.statLbl}>Pending</Text></View>
                <View style={S.statBox}><Text style={{fontSize:18}}>✅</Text><Text style={[S.statVal,{color:'#38BDF8'}]}>{stats.issuedRefunds}</Text><Text style={S.statLbl}>Refunded</Text></View>
              </View>
            </View>
            <TextInput style={S.searchBar} placeholder="🔍 Search by name, vehicle, ID..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={{gap:8,paddingHorizontal:4}}>
              {TABS.map(t=>(
                <TouchableOpacity key={t} style={[S.tab,tab===t&&S.tabActive]} onPress={()=>setTab(t)}>
                  <Text style={[S.tabTxt,tab===t&&S.tabTxtActive]}>{TAB_LABELS[t]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={S.empty}><Text style={{fontSize:50}}>💳</Text><Text style={S.emptyTitle}>No Transactions</Text><Text style={S.emptySub}>{search?'Try different search':'No payments match this filter'}</Text></View>}
        renderItem={renderCard}
      />

      {/* Detail Modal */}
      <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={()=>setDetailItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>💰 Payment Details</Text>
              {detailItem && (<>
                <Text style={S.dlLabel}>Vehicle</Text>
                <Text style={S.dlValue}>{detailItem.vehicle?.makeAndModel||'Unknown'} {detailItem.vehicle?.licensePlate?`(${detailItem.vehicle.licensePlate})`:''}</Text>
                <Text style={S.dlLabel}>Customer</Text>
                <Text style={S.dlValue}>{detailItem.user?.name||'N/A'} — {detailItem.user?.email||''}</Text>
                <Text style={S.dlLabel}>Booking Period</Text>
                <Text style={S.dlValue}>{fmt(detailItem.startDate)} → {fmt(detailItem.endDate)}</Text>
                <Text style={S.dlLabel}>Total Amount</Text>
                <Text style={[S.dlValue,{color:colors.success,fontWeight:'900',fontSize:24}]}>Rs. {(detailItem.totalPrice||0).toLocaleString()}</Text>
                <Text style={S.dlLabel}>Payment Method</Text>
                <Text style={S.dlValue}>{getMethodBadge(detailItem.paymentMethod)}</Text>
                <Text style={S.dlLabel}>Payment Status</Text>
                <View style={[S.refundBadge,{backgroundColor: detailItem.paymentMethod==='bank_transfer'&&detailItem.paymentStatus==='pending' ? colors.warning+'15' : getRefundColor(detailItem.refundStatus)+'15',alignSelf:'flex-start',marginTop:6}]}>
                  <Text style={[S.refundTxt,{color:detailItem.paymentMethod==='bank_transfer'&&detailItem.paymentStatus==='pending' ? colors.warning : getRefundColor(detailItem.refundStatus)}]}>
                    {detailItem.paymentMethod==='bank_transfer'&&detailItem.paymentStatus==='pending' ? 'PENDING VERIFICATION' : getRefundLabel(detailItem.refundStatus)}
                  </Text>
                </View>
                {detailItem.paymentMethod === 'bank_transfer' && detailItem.paymentSlip && (
                  <>
                    <Text style={S.dlLabel}>Payment Slip</Text>
                    <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}${detailItem.paymentSlip}`)}>
                      <Image source={{ uri: `${API_URL}${detailItem.paymentSlip}` }} style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8 }} resizeMode="cover" />
                    </TouchableOpacity>
                  </>
                )}
                <Text style={S.dlLabel}>Booking Status</Text>
                <Text style={S.dlValue}>{detailItem.status?.toUpperCase()}</Text>
                {detailItem.cancellationReason && (<><Text style={S.dlLabel}>Cancellation Reason</Text><Text style={[S.dlValue,{color:colors.error}]}>{detailItem.cancellationReason}</Text></>)}
                <Text style={S.dlLabel}>Booking ID</Text>
                <Text style={[S.dlValue,{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:11}]}>{detailItem._id}</Text>
                <Text style={S.dlLabel}>Created</Text>
                <Text style={S.dlValue}>{new Date(detailItem.createdAt).toLocaleString()}</Text>

                <View style={{flexDirection:'row',gap:10,marginTop:20}}>
                  {detailItem.paymentMethod === 'bank_transfer' && detailItem.paymentStatus === 'pending' ? (
                    <>
                      <TouchableOpacity style={[S.saveBtn,{flex:1,backgroundColor:colors.success}]} onPress={()=>verifyBankTransfer(detailItem._id,'approve')}><Text style={S.saveBtnTxt}>✅ Approve</Text></TouchableOpacity>
                      <TouchableOpacity style={[S.saveBtn,{flex:1,backgroundColor:colors.error}]} onPress={()=>verifyBankTransfer(detailItem._id,'reject')}><Text style={S.saveBtnTxt}>❌ Reject</Text></TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {detailItem.refundStatus === 'pending' && (
                        <TouchableOpacity style={[S.saveBtn,{flex:1,backgroundColor:colors.success}]} onPress={()=>doRefund(detailItem._id,'issued')}><Text style={S.saveBtnTxt}>✅ Issue Refund</Text></TouchableOpacity>
                      )}
                      {detailItem.refundStatus === 'issued' && (
                        <TouchableOpacity style={[S.saveBtn,{flex:1,backgroundColor:colors.warning}]} onPress={()=>doRefund(detailItem._id,'none')}><Text style={S.saveBtnTxt}>↩️ Revoke Refund</Text></TouchableOpacity>
                      )}
                      {detailItem.status === 'cancelled' && detailItem.refundStatus === 'none' && (
                        <TouchableOpacity style={[S.saveBtn,{flex:1,backgroundColor:colors.info}]} onPress={()=>doRefund(detailItem._id,'pending')}><Text style={S.saveBtnTxt}>⏳ Mark Refund Pending</Text></TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </>)}
            </ScrollView>
            <TouchableOpacity style={S.modalClose} onPress={()=>setDetailItem(null)}><Text style={S.modalCloseTxt}>Close</Text></TouchableOpacity>
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
  statVal: { fontSize:16, fontWeight:'900', marginTop:4, color:'#fff' },
  statLbl: { fontSize:9, fontWeight:'700', color:'rgba(255,255,255,0.6)', marginTop:2, textTransform:'uppercase', letterSpacing:0.5 },
  searchBar: { backgroundColor:C.surface, margin:16, marginBottom:8, padding:14, borderRadius:14, fontSize:15, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'600' },
  tabScroll: { marginBottom:8, paddingHorizontal:12 },
  tab: { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.surfaceHighlight, borderWidth:1, borderColor:C.border },
  tabActive: { backgroundColor:C.primary, borderColor:C.primary },
  tabTxt: { fontSize:12, fontWeight:'700', color:C.textSecondary },
  tabTxtActive: { color:'#fff' },
  card: { backgroundColor:C.surface, padding:18, borderRadius:SIZES.radius, marginHorizontal:16, marginBottom:12, ...SHADOWS.card, borderWidth:1, borderColor:C.border },
  cardHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  cardVehicle: { fontSize:16, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.2 },
  cardCustomer: { fontSize:12, color:C.textSecondary, fontWeight:'600', marginTop:2 },
  cardAmount: { fontSize:20, fontWeight:'900', color:C.success, letterSpacing:-0.5 },
  cardDates: { fontSize:12, color:C.textSecondary, fontWeight:'600', marginBottom:10 },
  cardMeta: { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:10 },
  methodBadge: { paddingHorizontal:10, paddingVertical:5, borderRadius:SIZES.radiusPill, borderWidth:1, borderColor:C.border },
  methodTxt: { fontSize:11, fontWeight:'800', color:C.textPrimary },
  refundBadge: { paddingHorizontal:10, paddingVertical:5, borderRadius:SIZES.radiusPill },
  refundTxt: { fontSize:10, fontWeight:'900', letterSpacing:0.5 },
  cardActions: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', borderTopWidth:1, borderTopColor:C.border, paddingTop:12, marginTop:4 },
  cardId: { color:C.textMuted, fontSize:11, fontWeight:'700', letterSpacing:1 },
  actBtn: { paddingHorizontal:12, paddingVertical:7, borderRadius:SIZES.radiusPill, backgroundColor:C.primary+'15', borderWidth:1, borderColor:C.primary+'30' },
  actBtnTxt: { fontWeight:'800', fontSize:12, color:C.primary },
  empty: { alignItems:'center', marginTop:60, paddingHorizontal:20 },
  emptyTitle: { fontSize:20, fontWeight:'900', color:C.textPrimary, marginTop:12 },
  emptySub: { color:C.textSecondary, marginTop:6, textAlign:'center', fontWeight:'500', fontSize:14 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:16 },
  modalContent: { backgroundColor:C.surface, borderRadius:20, padding:24, maxHeight:'85%' },
  modalTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5, marginBottom:4 },
  modalClose: { marginTop:16, padding:14, borderRadius:12, backgroundColor:C.surfaceHighlight, alignItems:'center', borderWidth:1, borderColor:C.border },
  modalCloseTxt: { fontWeight:'800', color:C.textSecondary, fontSize:15 },
  dlLabel: { fontSize:11, fontWeight:'800', color:C.textMuted, marginTop:14, textTransform:'uppercase', letterSpacing:0.8 },
  dlValue: { fontSize:15, fontWeight:'600', color:C.textPrimary, marginTop:4 },
  saveBtn: { backgroundColor:C.primary, padding:14, borderRadius:12, alignItems:'center', marginTop:12 },
  saveBtnTxt: { color:'#fff', fontWeight:'900', fontSize:14 },
});
