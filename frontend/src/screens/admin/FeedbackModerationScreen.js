import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, RefreshControl, StatusBar, Modal, ScrollView, Platform, Image, Linking
} from 'react-native';
import api, { API_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const TABS = ['all','5','4','3','2','1','flagged'];
const TAB_LABELS = { all:'All', '5':'⭐5', '4':'⭐4', '3':'⭐3', '2':'⭐2', '1':'⭐1', flagged:'🚩Flagged' };

export default function FeedbackModerationScreen() {
  const { colors, isDark } = useTheme();
  const S = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [detailItem, setDetailItem] = useState(null);
  const [noteText, setNoteText] = useState('');

  const fetchFeedbacks = useCallback(async (r = false) => {
    r ? setRefreshing(true) : setLoading(true);
    try { setFeedbacks((await api.get('/api/admin/feedback')).data); }
    catch { Alert.alert('Error', 'Could not load feedback.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const filtered = useMemo(() => {
    let d = feedbacks;
    if (tab === 'flagged') d = d.filter(f => f.flagged);
    else if (tab !== 'all') d = d.filter(f => f.rating === parseInt(tab));
    if (search.trim()) {
      const q = search.toLowerCase();
      d = d.filter(f => (f.user?.name||'').toLowerCase().includes(q) || (f.comment||'').toLowerCase().includes(q) || (f.vehicle?.makeAndModel||f.booking?.vehicle?.makeAndModel||'').toLowerCase().includes(q));
    }
    return d;
  }, [feedbacks, tab, search]);

  const stats = useMemo(() => {
    const t = feedbacks.length;
    const avg = t ? (feedbacks.reduce((s,f) => s + f.rating, 0) / t).toFixed(1) : '0.0';
    const dist = [0,0,0,0,0];
    feedbacks.forEach(f => { if (f.rating >= 1 && f.rating <= 5) dist[f.rating-1]++; });
    const flagged = feedbacks.filter(f => f.flagged).length;
    const maxDist = Math.max(...dist, 1);
    return { total: t, avg, dist, flagged, maxDist };
  }, [feedbacks]);

  const getVehicleName = (item) => item.vehicle?.makeAndModel || item.booking?.vehicle?.makeAndModel || 'Unknown';

  const doDelete = id => Alert.alert('Delete Review','Permanently remove this feedback?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{setActionId(id);try{await api.delete(`/api/admin/feedback/${id}`);setFeedbacks(p=>p.filter(f=>f._id!==id));if(detailItem?._id===id)setDetailItem(null);}catch{Alert.alert('Error','Failed.');}finally{setActionId(null);}}}]);

  const doFlag = async (id) => {
    setActionId(id);
    try { const r = await api.patch(`/api/admin/feedback/${id}/flag`); setFeedbacks(p => p.map(f => f._id === id ? r.data.feedback : f)); if(detailItem?._id===id) setDetailItem(r.data.feedback); }
    catch { Alert.alert('Error', 'Failed to toggle flag.'); }
    finally { setActionId(null); }
  };

  const doNote = async () => {
    if (!detailItem) return;
    setActionId('note');
    try { const r = await api.patch(`/api/admin/feedback/${detailItem._id}/note`, { adminNote: noteText }); setFeedbacks(p => p.map(f => f._id === detailItem._id ? r.data.feedback : f)); setDetailItem(r.data.feedback); Alert.alert('Saved', 'Admin note updated.'); }
    catch { Alert.alert('Error', 'Failed.'); }
    finally { setActionId(null); }
  };

  const openDetail = (item) => { setDetailItem(item); setNoteText(item.adminNote || ''); };
  const fmt = d => new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  if (loading) return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;

  const StarRow = ({rating, size=18}) => (<View style={{flexDirection:'row',gap:2}}>{[...Array(5)].map((_,i) => <Text key={i} style={{fontSize:size}}>{i < rating ? '⭐' : '☆'}</Text>)}</View>);

  const renderCard = ({item}) => (
    <TouchableOpacity style={[S.card, item.flagged && S.cardFlagged, item.rating <= 2 && !item.flagged && S.cardLow]} activeOpacity={0.85} onPress={() => openDetail(item)}>
      <View style={S.cardHead}>
        <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
          <StarRow rating={item.rating}/>
          <Text style={S.ratingNum}>{item.rating}.0</Text>
        </View>
        <View style={{flexDirection:'row',gap:6}}>
          {item.flagged && <Text style={S.flagBadge}>🚩</Text>}
          {item.rating <= 2 && <Text style={S.warnBadge}>Needs Review</Text>}
        </View>
      </View>
      <Text style={S.comment} numberOfLines={3}>"{item.comment || 'No comment provided.'}"</Text>
      <View style={S.metaBox}>
        <Text style={S.metaText}>👤 {item.user?.name||'N/A'}</Text>
        <Text style={S.metaText}>🚘 {getVehicleName(item)}</Text>
        <Text style={S.metaText}>📅 {fmt(item.createdAt)}</Text>
        {item.photos && item.photos.length > 0 && <Text style={S.metaText}>📷 {item.photos.length} photo{item.photos.length > 1 ? 's' : ''}</Text>}
      </View>
      {item.ownerReply?.text && <View style={S.replyBox}><Text style={S.replyLabel}>Owner Reply:</Text><Text style={S.replyText}>{item.ownerReply.text}</Text></View>}
      {item.adminNote && <View style={S.noteBox}><Text style={S.noteLabel}>📝 Admin Note:</Text><Text style={S.noteText}>{item.adminNote}</Text></View>}
      <View style={S.cardActions}>
        <TouchableOpacity style={S.actBtn} onPress={() => openDetail(item)}><Text style={S.actBtnTxt}>👁️ View</Text></TouchableOpacity>
        <TouchableOpacity style={[S.actBtn,{backgroundColor:item.flagged?colors.warning+'15':colors.surfaceHighlight}]} onPress={()=>doFlag(item._id)} disabled={!!actionId}><Text style={[S.actBtnTxt,{color:item.flagged?colors.warning:colors.textSecondary}]}>{item.flagged?'🚩 Unflag':'🚩 Flag'}</Text></TouchableOpacity>
        <TouchableOpacity style={[S.actBtn,{backgroundColor:colors.error+'10',borderColor:colors.error+'30'}]} onPress={()=>doDelete(item._id)} disabled={actionId===item._id}>
          {actionId===item._id?<ActivityIndicator size="small" color={colors.error}/>:<Text style={[S.actBtnTxt,{color:colors.error}]}>🗑️</Text>}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      <FlatList
        data={filtered}
        keyExtractor={i=>i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetchFeedbacks(true)} tintColor={colors.primary}/>}
        contentContainerStyle={S.list}
        ListHeaderComponent={
          <View>
            <View style={S.header}>
              <Text style={S.title}>⭐ Feedback Manager</Text>
              <Text style={S.subtitle}>{stats.total} reviews submitted</Text>
              <View style={S.statsRow}>
                <View style={S.statCard}>
                  <Text style={{fontSize:28,fontWeight:'900',color:'#fff'}}>{stats.avg}</Text>
                  <Text style={S.statLbl}>Avg Rating</Text>
                </View>
                <View style={S.statCard}>
                  <Text style={{fontSize:28,fontWeight:'900',color:'#F87171'}}>{stats.flagged}</Text>
                  <Text style={S.statLbl}>Flagged</Text>
                </View>
                <View style={[S.statCard,{flex:2}]}>
                  {[5,4,3,2,1].map(r => (
                    <View key={r} style={{flexDirection:'row',alignItems:'center',gap:4,marginBottom:2}}>
                      <Text style={{color:'rgba(255,255,255,0.7)',fontSize:10,fontWeight:'800',width:16}}>★{r}</Text>
                      <View style={{flex:1,height:6,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:3}}>
                        <View style={{width:`${(stats.dist[r-1]/stats.maxDist)*100}%`,height:6,backgroundColor:r>=4?'#4ADE80':r===3?'#FBBF24':'#F87171',borderRadius:3}}/>
                      </View>
                      <Text style={{color:'rgba(255,255,255,0.5)',fontSize:9,fontWeight:'700',width:20,textAlign:'right'}}>{stats.dist[r-1]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            <TextInput style={S.searchBar} placeholder="🔍 Search by name, vehicle, comment..." placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch}/>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={{gap:8,paddingHorizontal:4}}>
              {TABS.map(t=>(
                <TouchableOpacity key={t} style={[S.tab,tab===t&&S.tabActive]} onPress={()=>setTab(t)}>
                  <Text style={[S.tabTxt,tab===t&&S.tabTxtActive]}>{TAB_LABELS[t]} {t!=='all'&&t!=='flagged'?`(${stats.dist[parseInt(t)-1]})`:t==='flagged'?`(${stats.flagged})`:''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={<View style={S.empty}><Text style={{fontSize:50}}>💬</Text><Text style={S.emptyTitle}>No Reviews Found</Text><Text style={S.emptySub}>{search?'Try a different search':'No reviews match this filter'}</Text></View>}
        renderItem={renderCard}
      />

      {/* Detail Modal */}
      <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={()=>setDetailItem(null)}>
        <View style={S.modalOverlay}>
          <View style={S.modalContent}>
            <ScrollView>
              <Text style={S.modalTitle}>⭐ Review Details</Text>
              {detailItem && (<>
                <View style={{alignItems:'center',marginVertical:16}}>
                  <StarRow rating={detailItem.rating} size={28}/>
                  <Text style={{fontSize:32,fontWeight:'900',color:colors.textPrimary,marginTop:8}}>{detailItem.rating}.0</Text>
                  {detailItem.flagged && <Text style={[S.flagBadge,{marginTop:8}]}>🚩 Flagged for Review</Text>}
                </View>
                <Text style={[S.comment,{fontSize:17,marginBottom:20,textAlign:'center'}]}>"{detailItem.comment || 'No comment'}"</Text>

                {detailItem.photos && detailItem.photos.length > 0 && (
                  <View style={{marginBottom:16}}>
                    <Text style={S.dlLabel}>📷 Customer Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:8}} contentContainerStyle={{gap:10}}>
                      {detailItem.photos.map((p, i) => (
                        <TouchableOpacity key={i} onPress={() => Linking.openURL(`${API_URL}${p}`)}>
                          <Image source={{uri: `${API_URL}${p}`}} style={{width:120,height:90,borderRadius:12,backgroundColor:colors.surfaceHighlight}} resizeMode="cover"/>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Text style={S.dlLabel}>Customer</Text>
                <Text style={S.dlValue}>{detailItem.user?.name||'N/A'} ({detailItem.user?.email||''})</Text>
                <Text style={S.dlLabel}>Vehicle</Text>
                <Text style={S.dlValue}>{getVehicleName(detailItem)}</Text>
                <Text style={S.dlLabel}>Submitted</Text>
                <Text style={S.dlValue}>{fmt(detailItem.createdAt)}</Text>
                <Text style={S.dlLabel}>Review ID</Text>
                <Text style={[S.dlValue,{fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:11}]}>{detailItem._id}</Text>

                {detailItem.ownerReply?.text && (
                  <View style={[S.replyBox,{marginTop:16}]}>
                    <Text style={S.replyLabel}>💬 Owner Reply ({fmt(detailItem.ownerReply.repliedAt)})</Text>
                    <Text style={S.replyText}>{detailItem.ownerReply.text}</Text>
                  </View>
                )}

                <View style={{marginTop:20}}>
                  <Text style={S.dlLabel}>📝 Admin Note</Text>
                  <TextInput style={S.noteInput} placeholder="Add moderator note..." placeholderTextColor={colors.textMuted} value={noteText} onChangeText={setNoteText} multiline numberOfLines={3}/>
                  <TouchableOpacity style={[S.saveBtn,actionId==='note'&&{opacity:0.5}]} onPress={doNote} disabled={actionId==='note'}>
                    {actionId==='note'?<ActivityIndicator size="small" color="#fff"/>:<Text style={S.saveBtnTxt}>Save Note</Text>}
                  </TouchableOpacity>
                </View>

                <View style={{flexDirection:'row',gap:10,marginTop:16}}>
                  <TouchableOpacity style={[S.actBtn,{flex:1,alignItems:'center',backgroundColor:detailItem.flagged?colors.warning+'15':colors.surfaceHighlight}]} onPress={()=>doFlag(detailItem._id)}>
                    <Text style={[S.actBtnTxt,{color:detailItem.flagged?colors.warning:colors.textSecondary}]}>{detailItem.flagged?'🚩 Unflag':'🚩 Flag'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.actBtn,{flex:1,alignItems:'center',backgroundColor:colors.error+'10',borderColor:colors.error+'30'}]} onPress={()=>doDelete(detailItem._id)}>
                    <Text style={[S.actBtnTxt,{color:colors.error}]}>🗑️ Delete</Text>
                  </TouchableOpacity>
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
  statsRow: { flexDirection:'row', marginTop:16, gap:10 },
  statCard: { flex:1, backgroundColor:'rgba(255,255,255,0.15)', borderRadius:14, padding:12, alignItems:'center', justifyContent:'center' },
  statLbl: { fontSize:10, fontWeight:'700', color:'rgba(255,255,255,0.6)', marginTop:4, textTransform:'uppercase', letterSpacing:0.5 },
  searchBar: { backgroundColor:C.surface, margin:16, marginBottom:8, padding:14, borderRadius:14, fontSize:15, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'600' },
  tabScroll: { marginBottom:8, paddingHorizontal:12 },
  tab: { paddingHorizontal:14, paddingVertical:8, borderRadius:20, backgroundColor:C.surfaceHighlight, borderWidth:1, borderColor:C.border },
  tabActive: { backgroundColor:C.primary, borderColor:C.primary },
  tabTxt: { fontSize:13, fontWeight:'700', color:C.textSecondary },
  tabTxtActive: { color:'#fff' },
  card: { backgroundColor:C.surface, padding:18, borderRadius:SIZES.radius, marginHorizontal:16, marginBottom:12, ...SHADOWS.card, borderWidth:1, borderColor:C.border },
  cardFlagged: { borderColor:C.error, borderWidth:2, backgroundColor:C.error+'05' },
  cardLow: { borderColor:C.warning+'50' },
  cardHead: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  ratingNum: { fontSize:16, fontWeight:'900', color:C.textPrimary },
  flagBadge: { backgroundColor:C.error+'15', color:C.error, fontWeight:'800', fontSize:11, paddingHorizontal:8, paddingVertical:4, borderRadius:SIZES.radiusPill, overflow:'hidden' },
  warnBadge: { backgroundColor:C.warning+'15', color:C.warning, fontWeight:'800', fontSize:10, paddingHorizontal:8, paddingVertical:4, borderRadius:SIZES.radiusPill, overflow:'hidden', textTransform:'uppercase', letterSpacing:0.5 },
  comment: { fontSize:15, color:C.textPrimary, fontStyle:'italic', marginBottom:12, lineHeight:22 },
  metaBox: { backgroundColor:C.surfaceHighlight, padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:C.border },
  metaText: { fontSize:12, color:C.textSecondary, fontWeight:'600', marginBottom:3 },
  replyBox: { backgroundColor:C.info+'08', padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:C.info+'20' },
  replyLabel: { fontSize:11, fontWeight:'800', color:C.info, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 },
  replyText: { fontSize:13, color:C.textPrimary, fontWeight:'500', lineHeight:20 },
  noteBox: { backgroundColor:'#7C3AED08', padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:'#7C3AED20' },
  noteLabel: { fontSize:11, fontWeight:'800', color:'#7C3AED', marginBottom:4 },
  noteText: { fontSize:13, color:C.textPrimary, fontWeight:'500' },
  cardActions: { flexDirection:'row', justifyContent:'flex-end', gap:8, borderTopWidth:1, borderTopColor:C.border, paddingTop:12, marginTop:4 },
  actBtn: { paddingHorizontal:12, paddingVertical:7, borderRadius:SIZES.radiusPill, backgroundColor:C.primary+'15', borderWidth:1, borderColor:C.primary+'30' },
  actBtnTxt: { fontWeight:'800', fontSize:12, color:C.primary },
  empty: { alignItems:'center', marginTop:60, paddingHorizontal:20 },
  emptyTitle: { fontSize:20, fontWeight:'900', color:C.textPrimary, marginTop:12 },
  emptySub: { color:C.textSecondary, marginTop:6, textAlign:'center', fontWeight:'500', fontSize:14 },
  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', padding:16 },
  modalContent: { backgroundColor:C.surface, borderRadius:20, padding:24, maxHeight:'85%' },
  modalTitle: { fontSize:22, fontWeight:'900', color:C.textPrimary, letterSpacing:-0.5 },
  modalClose: { marginTop:16, padding:14, borderRadius:12, backgroundColor:C.surfaceHighlight, alignItems:'center', borderWidth:1, borderColor:C.border },
  modalCloseTxt: { fontWeight:'800', color:C.textSecondary, fontSize:15 },
  dlLabel: { fontSize:11, fontWeight:'800', color:C.textMuted, marginTop:14, textTransform:'uppercase', letterSpacing:0.8 },
  dlValue: { fontSize:15, fontWeight:'600', color:C.textPrimary, marginTop:4 },
  noteInput: { backgroundColor:C.surfaceHighlight, borderRadius:12, padding:14, fontSize:14, color:C.textPrimary, borderWidth:1.5, borderColor:C.border, fontWeight:'500', marginTop:8, textAlignVertical:'top', minHeight:80 },
  saveBtn: { backgroundColor:C.primary, padding:12, borderRadius:12, alignItems:'center', marginTop:10 },
  saveBtnTxt: { color:'#fff', fontWeight:'900', fontSize:14 },
});
