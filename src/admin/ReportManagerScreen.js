import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, RefreshControl, StatusBar, Dimensions, TouchableOpacity, Modal, TextInput, Alert, Share, Platform, Image, Linking } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';
import api, { API_URL } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

const W = Dimensions.get('window').width;
const TABS = ['overview','revenue','bookings','vehicles','owners','saved'];
const TAB_L = {overview:'📊 Overview',revenue:'💰 Revenue',bookings:'📋 Bookings',vehicles:'🚗 Vehicles',owners:'👥 Owners',saved:'📁 Saved'};
const TYPES = ['full','revenue','bookings','vehicles'];
const TYPE_L = {full:'Full Platform',revenue:'Revenue',bookings:'Bookings',vehicles:'Vehicles'};

export default function ReportManagerScreen(){
  const {colors,isDark}=useTheme();
  const S=useMemo(()=>gs(colors,isDark),[colors,isDark]);
  const [report,setReport]=useState(null);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [tab,setTab]=useState('overview');
  const [saved,setSaved]=useState([]);
  const [createOpen,setCreateOpen]=useState(false);
  const [cTitle,setCTitle]=useState('');
  const [cType,setCType]=useState('full');
  const [cNotes,setCNotes]=useState('');
  const [creating,setCreating]=useState(false);
  const [viewItem,setViewItem]=useState(null);
  const [editOpen,setEditOpen]=useState(false);
  const [eTitle,setETitle]=useState('');
  const [eNotes,setENotes]=useState('');
  const [actionId,setActionId]=useState(null);

  const fetch=async(r=false)=>{
    r?setRefreshing(true):setLoading(true);
    try{
      const [rp,sv]=await Promise.all([api.get('/api/admin/analytics/report'),api.get('/api/admin/reports')]);
      setReport(rp.data);setSaved(sv.data);
    }catch{setReport(null);}
    finally{setLoading(false);setRefreshing(false);}
  };
  useEffect(()=>{fetch();},[]);

  const doCreate=async()=>{
    if(!cTitle.trim())return Alert.alert('Required','Title is required.');
    setCreating(true);
    try{const r=await api.post('/api/admin/reports',{title:cTitle.trim(),type:cType,notes:cNotes.trim()});
    setSaved(p=>[r.data,...p]);setCreateOpen(false);setCTitle('');setCNotes('');
    Alert.alert('Success','Report created with live snapshot.');}
    catch(e){Alert.alert('Error',e.response?.data?.message||'Failed.');}
    finally{setCreating(false);}
  };

  const doEdit=async()=>{
    if(!viewItem)return;setActionId('edit');
    try{const r=await api.patch(`/api/admin/reports/${viewItem._id}`,{title:eTitle,notes:eNotes});
    setSaved(p=>p.map(s=>s._id===viewItem._id?r.data.report:s));setViewItem(r.data.report);setEditOpen(false);}
    catch{Alert.alert('Error','Failed.');}finally{setActionId(null);}
  };

  const doDelete=id=>Alert.alert('Delete','Remove this saved report?',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{
    setActionId(id);try{await api.delete(`/api/admin/reports/${id}`);setSaved(p=>p.filter(s=>s._id!==id));if(viewItem?._id===id)setViewItem(null);}
    catch{Alert.alert('Error','Failed.');}finally{setActionId(null);}}}]);

  const doUploadAttachment = async (reportId) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    setActionId('upload');
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop().toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
      const formData = new FormData();
      formData.append('attachment', { uri, name: `attachment_${Date.now()}.${ext}`, type: mime });
      const r = await api.post(`/api/admin/reports/${reportId}/upload-attachment`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSaved(p => p.map(s => s._id === reportId ? r.data.report : s));
      if (viewItem?._id === reportId) setViewItem(r.data.report);
      Alert.alert('Success', 'Attachment uploaded.');
    } catch { Alert.alert('Error', 'Failed to upload attachment.'); }
    finally { setActionId(null); }
  };

  const doRemoveAttachment = async (reportId, idx) => {
    Alert.alert('Remove', 'Delete this attachment?', [{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:async()=>{
      setActionId('rm-att');
      try {
        const r = await api.delete(`/api/admin/reports/${reportId}/attachments/${idx}`);
        setSaved(p => p.map(s => s._id === reportId ? r.data.report : s));
        if (viewItem?._id === reportId) setViewItem(r.data.report);
      } catch { Alert.alert('Error', 'Failed.'); }
      finally { setActionId(null); }
    }}]);
  };

  const doExport=(item)=>{
    const s=item.snapshot||{};const sb=s.statusBreakdown||{};
    const txt=`═══ PLATFORM REPORT ═══\nTitle: ${item.title}\nType: ${TYPE_L[item.type]||item.type}\nGenerated: ${fmt(item.createdAt)}\n\n💰 Revenue: Rs. ${(s.totalRevenue||0).toLocaleString()}\n📋 Bookings: ${s.totalBookings||0}\n🚗 Vehicles: ${s.totalVehicles||0}\n👥 Users: ${s.totalUsers||0}\n⭐ Rating: ${s.platformAvgRating||'N/A'}\n\n📊 Booking Breakdown:\n  Confirmed: ${sb.confirmed||0} | Active: ${sb.active||0} | Completed: ${sb.completed||0}\n  Cancelled: ${sb.cancelled||0} | Returning: ${sb.returning||0}\n\n🏆 Top Earners:\n${(s.topEarners||[]).map((v,i)=>`  #${i+1} ${v.name} — Rs. ${(v.income||0).toLocaleString()}`).join('\n')||'  N/A'}\n\n⭐ Top Rated:\n${(s.topRated||[]).map((v,i)=>`  #${i+1} ${v.name} — ${v.avg}⭐ (${v.count})`).join('\n')||'  N/A'}\n\n${item.notes?`Notes: ${item.notes}\n`:''}═══════════════════════`;
    Share.share({message:txt,title:item.title});
  };

  const fmt=d=>d?new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
  const fmtK=n=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${(n/1e3).toFixed(0)}K`:String(n);

  if(loading)return <View style={S.center}><ActivityIndicator size="large" color={colors.primary}/></View>;
  if(!report)return <View style={S.center}><Text style={{color:colors.textSecondary}}>Could not load report.</Text></View>;

  const tb=report.totalBookings||1;const cl=report.monthlyRevenue?.map(m=>m.label)||['—'];
  const cd=report.monthlyRevenue?.map(m=>m.amount)||[0];const hc=cd.some(d=>d>0);
  const show=s=>tab==='overview'||tab===s;

  const Bar=({label,count,total,color})=>(<View style={S.barRow}><Text style={S.barLbl}>{label}</Text><View style={S.barBg}><View style={[S.barFill,{width:`${total>0?(count/total)*100:0}%`,backgroundColor:color}]}/></View><Text style={S.barCt}>{count}</Text></View>);
  const LR=({rank,name,value,color})=>(<View style={S.lRow}><Text style={S.lRank}>{rank}</Text><Text style={S.lName} numberOfLines={1}>{name}</Text><Text style={[S.lVal,{color}]}>{value}</Text></View>);

  return(
    <View style={S.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart}/>
      <ScrollView contentContainerStyle={S.cont} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>fetch(true)} tintColor={colors.primary}/>}>
        <View style={S.hdr}>
          <Text style={S.title}>📊 Report Manager</Text>
          <Text style={S.sub}>Platform analytics & insights</Text>
          <View style={S.sRow}>
            <View style={S.sBox}><Text style={[S.sVal,{color:'#4ADE80'}]}>Rs.{fmtK(report.totalRevenue||0)}</Text><Text style={S.sLbl}>Revenue</Text></View>
            <View style={S.sBox}><Text style={[S.sVal,{color:'#38BDF8'}]}>{report.totalBookings||0}</Text><Text style={S.sLbl}>Bookings</Text></View>
            <View style={S.sBox}><Text style={[S.sVal,{color:'#A78BFA'}]}>{report.totalVehicles||0}</Text><Text style={S.sLbl}>Vehicles</Text></View>
            <View style={S.sBox}><Text style={[S.sVal,{color:'#FBBF24'}]}>{report.platformAvgRating||'—'}</Text><Text style={S.sLbl}>Rating</Text></View>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tScr} contentContainerStyle={{gap:8,paddingHorizontal:4}}>
          {TABS.map(t=>(<TouchableOpacity key={t} style={[S.tBtn,tab===t&&S.tBtnA]} onPress={()=>setTab(t)}><Text style={[S.tTxt,tab===t&&S.tTxtA]}>{TAB_L[t]}</Text></TouchableOpacity>))}
        </ScrollView>

        {show('revenue')&&<><Text style={S.secT}>💰 Revenue</Text><View style={S.fCard}><Text style={{fontSize:32}}>💰</Text><Text style={[S.fVal,{color:colors.success}]}>Rs. {(report.totalRevenue||0).toLocaleString()}</Text><Text style={S.fLbl}>Total Platform Revenue</Text></View>
        {hc&&<><Text style={S.secT}>📈 Monthly Trend</Text><View style={S.chWrap}><BarChart data={{labels:cl,datasets:[{data:cd}]}} width={W-40} height={220} yAxisLabel="Rs " chartConfig={{backgroundColor:colors.surfaceHighlight,backgroundGradientFrom:colors.primary,backgroundGradientTo:isDark?colors.surfaceHighlight:'#0284C7',decimalPlaces:0,color:(o=1)=>`rgba(255,255,255,${o})`,labelColor:(o=1)=>`rgba(255,255,255,${o})`,style:{borderRadius:SIZES.radius}}} style={{borderRadius:SIZES.radius}} showValuesOnTopOfBars/></View></>}</>}

        {show('bookings')&&<><Text style={S.secT}>📋 Booking Breakdown</Text><View style={S.sec}><Bar label="✅ Confirmed" count={report.statusBreakdown?.confirmed||0} total={tb} color={colors.primary}/><Bar label="🚗 Active" count={report.statusBreakdown?.active||0} total={tb} color={colors.success}/><Bar label="🔒 Completed" count={report.statusBreakdown?.completed||0} total={tb} color={colors.textSecondary}/><Bar label="❌ Cancelled" count={report.statusBreakdown?.cancelled||0} total={tb} color={colors.error}/><Bar label="⏳ Returning" count={report.statusBreakdown?.returning||0} total={tb} color={colors.warning}/></View></>}

        {show('vehicles')&&<><Text style={S.secT}>🏆 Top Earners</Text><View style={S.sec}>{report.topEarners?.length>0?report.topEarners.map((v,i)=><LR key={i} rank={`#${i+1}`} name={v.name} value={`Rs. ${(v.income||0).toLocaleString()}`} color={colors.success}/>):<Text style={S.noD}>No data</Text>}</View>
        <Text style={S.secT}>⭐ Top Rated</Text><View style={S.sec}>{report.topRated?.length>0?report.topRated.map((v,i)=><LR key={i} rank={`#${i+1}`} name={v.name} value={`${v.avg}⭐ (${v.count})`} color={colors.warning}/>):<Text style={S.noD}>No reviews</Text>}</View>
        <Text style={S.secT}>📊 Rating Distribution</Text><View style={S.sec}>{[5,4,3,2,1].map(n=><Bar key={n} label={'★'.repeat(n)} count={report.ratingDist?.[n-1]||0} total={report.totalReviews||1} color={n>=4?colors.success:n===3?colors.warning:colors.error}/>)}</View></>}

        {show('owners')&&<><Text style={S.secT}>👥 Owner Performance</Text>{report.ownerPerformance?.length>0?report.ownerPerformance.map((o,i)=><View key={i} style={S.oCard}><Text style={S.oName}>{o.name}</Text><Text style={S.oEmail}>{o.email}</Text><View style={S.oSRow}><View style={S.oStat}><Text style={S.oSV}>{o.vehicleCount}</Text><Text style={S.oSL}>Cars</Text></View><View style={S.oStat}><Text style={[S.oSV,{color:colors.success}]}>Rs.{(o.totalIncome||0).toLocaleString()}</Text><Text style={S.oSL}>Income</Text></View><View style={S.oStat}><Text style={[S.oSV,{color:colors.warning}]}>{o.avgRating??'—'}⭐</Text><Text style={S.oSL}>Rating</Text></View></View></View>):<Text style={S.noD}>No owners yet.</Text>}</>}

        {tab==='saved'&&<>
          <TouchableOpacity style={S.createBtn} onPress={()=>setCreateOpen(true)}><Text style={S.createTxt}>+ Generate New Report</Text></TouchableOpacity>
          {saved.length===0?<View style={{alignItems:'center',marginTop:40}}><Text style={{fontSize:50}}>📁</Text><Text style={S.emT}>No Saved Reports</Text><Text style={S.emS}>Generate your first report above</Text></View>
          :saved.map(s=>(
            <TouchableOpacity key={s._id} style={S.rCard} onPress={()=>{setViewItem(s);setETitle(s.title);setENotes(s.notes||'');}}>
              <View style={S.rHead}><Text style={S.rTitle} numberOfLines={1}>{s.title}</Text><View style={[S.badge,{backgroundColor:colors.primary+'15'}]}><Text style={[S.badgeTxt,{color:colors.primary}]}>{TYPE_L[s.type]||s.type}</Text></View></View>
              <Text style={S.rMeta}>📅 {fmt(s.createdAt)} {s.createdBy?`• By ${s.createdBy.name}`:''}</Text>
              {s.notes?<Text style={S.rNotes} numberOfLines={2}>{s.notes}</Text>:null}
              <View style={S.rStats}><Text style={S.rStat}>💰 Rs.{fmtK(s.snapshot?.totalRevenue||0)}</Text><Text style={S.rStat}>📋 {s.snapshot?.totalBookings||0}</Text><Text style={S.rStat}>🚗 {s.snapshot?.totalVehicles||0}</Text><Text style={S.rStat}>⭐ {s.snapshot?.platformAvgRating||'—'}</Text></View>
              <View style={S.rActs}><TouchableOpacity style={S.aBtn} onPress={()=>doExport(s)}><Text style={S.aBTxt}>📤 Export</Text></TouchableOpacity><TouchableOpacity style={[S.aBtn,{backgroundColor:colors.error+'10',borderColor:colors.error+'30'}]} onPress={()=>doDelete(s._id)}><Text style={[S.aBTxt,{color:colors.error}]}>🗑️</Text></TouchableOpacity></View>
            </TouchableOpacity>
          ))}
        </>}
      </ScrollView>

      {/* Create Modal */}
      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={()=>setCreateOpen(false)}>
        <View style={S.mOvr}><View style={S.mCnt}><ScrollView>
          <Text style={S.mTitle}>📝 Generate Report</Text><Text style={S.mSub}>Captures a snapshot of current platform data</Text>
          <Text style={S.dlL}>Report Title *</Text><TextInput style={S.mIn} placeholder="e.g. April Revenue Summary" placeholderTextColor={colors.textMuted} value={cTitle} onChangeText={setCTitle}/>
          <Text style={S.dlL}>Report Type</Text><View style={{flexDirection:'row',gap:8,marginTop:8,flexWrap:'wrap'}}>{TYPES.map(t=>(<TouchableOpacity key={t} style={[S.tBtn,cType===t&&S.tBtnA,{paddingVertical:10}]} onPress={()=>setCType(t)}><Text style={[S.tTxt,cType===t&&S.tTxtA]}>{TYPE_L[t]}</Text></TouchableOpacity>))}</View>
          <Text style={S.dlL}>Notes (optional)</Text><TextInput style={[S.mIn,{minHeight:70,textAlignVertical:'top'}]} placeholder="Add context..." placeholderTextColor={colors.textMuted} value={cNotes} onChangeText={setCNotes} multiline/>
          <Text style={S.mSub}>Tip: You can attach files after creating the report.</Text>
          <TouchableOpacity style={[S.saveBtn,creating&&{opacity:0.5}]} onPress={doCreate} disabled={creating}>{creating?<ActivityIndicator size="small" color="#fff"/>:<Text style={S.saveTxt}>Generate Report</Text>}</TouchableOpacity>
        </ScrollView><TouchableOpacity style={S.mClose} onPress={()=>setCreateOpen(false)}><Text style={S.mCloseTxt}>Cancel</Text></TouchableOpacity></View></View>
      </Modal>

      {/* View/Edit Modal */}
      <Modal visible={!!viewItem} transparent animationType="slide" onRequestClose={()=>setViewItem(null)}>
        <View style={S.mOvr}><View style={S.mCnt}><ScrollView>
          {viewItem&&<>{editOpen?<>
            <Text style={S.mTitle}>✏️ Edit Report</Text>
            <Text style={S.dlL}>Title</Text><TextInput style={S.mIn} value={eTitle} onChangeText={setETitle}/>
            <Text style={S.dlL}>Notes</Text><TextInput style={[S.mIn,{minHeight:70,textAlignVertical:'top'}]} value={eNotes} onChangeText={setENotes} multiline/>
            <TouchableOpacity style={[S.saveBtn,actionId==='edit'&&{opacity:0.5}]} onPress={doEdit} disabled={actionId==='edit'}>{actionId==='edit'?<ActivityIndicator size="small" color="#fff"/>:<Text style={S.saveTxt}>Save Changes</Text>}</TouchableOpacity>
            <TouchableOpacity style={S.mClose} onPress={()=>setEditOpen(false)}><Text style={S.mCloseTxt}>Cancel Edit</Text></TouchableOpacity>
          </>:<>
            <Text style={S.mTitle}>📄 {viewItem.title}</Text>
            <View style={[S.badge,{backgroundColor:colors.primary+'15',alignSelf:'flex-start',marginVertical:8}]}><Text style={[S.badgeTxt,{color:colors.primary}]}>{TYPE_L[viewItem.type]||viewItem.type}</Text></View>
            <Text style={S.rMeta}>📅 {fmt(viewItem.createdAt)} {viewItem.createdBy?`• ${viewItem.createdBy.name}`:''}</Text>
            {viewItem.notes?<View style={{backgroundColor:colors.surfaceHighlight,padding:12,borderRadius:12,marginTop:12,borderWidth:1,borderColor:colors.border}}><Text style={{color:colors.textPrimary,fontWeight:'500',fontSize:13}}>{viewItem.notes}</Text></View>:null}
            <Text style={S.dlL}>Snapshot Data</Text>
            <View style={[S.sRow,{marginTop:8,paddingHorizontal:0}]}>
              <View style={S.sBox}><Text style={[S.sVal,{color:'#4ADE80'}]}>Rs.{fmtK(viewItem.snapshot?.totalRevenue||0)}</Text><Text style={S.sLbl}>Revenue</Text></View>
              <View style={S.sBox}><Text style={[S.sVal,{color:'#38BDF8'}]}>{viewItem.snapshot?.totalBookings||0}</Text><Text style={S.sLbl}>Bookings</Text></View>
              <View style={S.sBox}><Text style={[S.sVal,{color:'#A78BFA'}]}>{viewItem.snapshot?.totalVehicles||0}</Text><Text style={S.sLbl}>Vehicles</Text></View>
            </View>
            <View style={{flexDirection:'row',gap:10,marginTop:16}}>
              <TouchableOpacity style={[S.aBtn,{flex:1,alignItems:'center'}]} onPress={()=>doExport(viewItem)}><Text style={S.aBTxt}>📤 Export</Text></TouchableOpacity>
              <TouchableOpacity style={[S.aBtn,{flex:1,alignItems:'center'}]} onPress={()=>{setEditOpen(true);setETitle(viewItem.title);setENotes(viewItem.notes||'');}}><Text style={S.aBTxt}>✏️ Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[S.aBtn,{flex:1,alignItems:'center',backgroundColor:colors.error+'10',borderColor:colors.error+'30'}]} onPress={()=>doDelete(viewItem._id)}><Text style={[S.aBTxt,{color:colors.error}]}>🗑️</Text></TouchableOpacity>
            </View>

            <View style={{marginTop:20}}>
              <Text style={S.dlL}>📎 Attachments</Text>
              <TouchableOpacity style={[S.aBtn,{marginTop:8,alignItems:'center',paddingVertical:12}]} onPress={() => doUploadAttachment(viewItem._id)} disabled={actionId==='upload'}>
                {actionId==='upload'?<ActivityIndicator size="small" color={colors.primary}/>:<Text style={S.aBTxt}>📎 Upload Attachment</Text>}
              </TouchableOpacity>
              {(viewItem.attachments && viewItem.attachments.length > 0) ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop:10}} contentContainerStyle={{gap:10}}>
                  {viewItem.attachments.map((att, i) => (
                    <View key={i} style={{position:'relative'}}>
                      <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}${att.fileUrl}`)}>
                        <Image source={{uri: `${API_URL}${att.fileUrl}`}} style={{width:100,height:80,borderRadius:10,backgroundColor:colors.surfaceHighlight}} resizeMode="cover"/>
                      </TouchableOpacity>
                      <TouchableOpacity style={{position:'absolute',top:-6,right:-6,backgroundColor:colors.error,borderRadius:10,width:20,height:20,alignItems:'center',justifyContent:'center'}} onPress={()=>doRemoveAttachment(viewItem._id, i)}>
                        <Text style={{color:'#fff',fontSize:12,fontWeight:'900'}}>×</Text>
                      </TouchableOpacity>
                      <Text style={{fontSize:9,color:colors.textMuted,textAlign:'center',marginTop:2}} numberOfLines={1}>{att.filename}</Text>
                    </View>
                  ))}
                </ScrollView>
              ) : <Text style={{color:colors.textMuted,fontSize:12,marginTop:8}}>No attachments yet</Text>}
            </View>
          </>}</>}
        </ScrollView>{!editOpen&&<TouchableOpacity style={S.mClose} onPress={()=>{setViewItem(null);setEditOpen(false);}}><Text style={S.mCloseTxt}>Close</Text></TouchableOpacity>}</View></View>
      </Modal>
    </View>
  );
}

const gs=(C,isDark)=>StyleSheet.create({
  screen:{flex:1,backgroundColor:C.background},center:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:C.background},cont:{paddingBottom:60},
  hdr:{backgroundColor:C.headerGradientStart,paddingTop:50,paddingBottom:20,paddingHorizontal:20,borderBottomLeftRadius:24,borderBottomRightRadius:24},
  title:{fontSize:26,fontWeight:'800',color:'#fff',letterSpacing:-0.5},sub:{fontSize:14,color:'rgba(255,255,255,0.7)',fontWeight:'600',marginTop:4},
  sRow:{flexDirection:'row',marginTop:16,gap:8,paddingHorizontal:16},sBox:{flex:1,backgroundColor:'rgba(255,255,255,0.15)',borderRadius:14,padding:10,alignItems:'center'},
  sVal:{fontSize:15,fontWeight:'900',color:'#fff'},sLbl:{fontSize:9,fontWeight:'700',color:'rgba(255,255,255,0.6)',marginTop:2,textTransform:'uppercase',letterSpacing:0.5},
  tScr:{marginVertical:12,paddingHorizontal:12},tBtn:{paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:C.surfaceHighlight,borderWidth:1,borderColor:C.border},
  tBtnA:{backgroundColor:C.primary,borderColor:C.primary},tTxt:{fontSize:11,fontWeight:'700',color:C.textSecondary},tTxtA:{color:'#fff'},
  secT:{fontSize:17,fontWeight:'800',color:C.textPrimary,marginTop:20,marginBottom:10,paddingHorizontal:20,letterSpacing:-0.3},
  sec:{backgroundColor:C.surface,marginHorizontal:16,borderRadius:SIZES.radius,padding:18,...SHADOWS.card,borderWidth:1,borderColor:C.border},
  fCard:{backgroundColor:C.surface,marginHorizontal:16,borderRadius:SIZES.radius,padding:24,alignItems:'center',...SHADOWS.card,borderWidth:1,borderColor:C.border},
  fVal:{fontSize:28,fontWeight:'900',marginTop:8},fLbl:{fontSize:12,color:C.textSecondary,fontWeight:'700',marginTop:4,textTransform:'uppercase'},
  chWrap:{alignItems:'center',marginHorizontal:16,...SHADOWS.card,backgroundColor:C.surface,borderRadius:SIZES.radius,borderWidth:1,borderColor:C.border,overflow:'hidden'},
  barRow:{flexDirection:'row',alignItems:'center',marginBottom:10},barLbl:{width:100,fontSize:12,fontWeight:'700',color:C.textSecondary},
  barBg:{flex:1,height:10,backgroundColor:C.surfaceHighlight,borderRadius:5,overflow:'hidden',marginHorizontal:8},barFill:{height:10,borderRadius:5},barCt:{width:30,textAlign:'right',fontSize:13,fontWeight:'800',color:C.textPrimary},
  lRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:C.border},lRank:{width:36,fontSize:14,fontWeight:'900',color:C.textMuted},lName:{flex:1,fontSize:14,fontWeight:'700',color:C.textPrimary},lVal:{fontSize:14,fontWeight:'800'},
  oCard:{backgroundColor:C.surface,marginHorizontal:16,marginBottom:12,borderRadius:SIZES.radius,padding:18,...SHADOWS.card,borderWidth:1,borderColor:C.border},
  oName:{fontSize:16,fontWeight:'800',color:C.textPrimary},oEmail:{fontSize:12,color:C.textSecondary,fontWeight:'500',marginTop:2},
  oSRow:{flexDirection:'row',gap:10,borderTopWidth:1,borderTopColor:C.border,paddingTop:12,marginTop:12},oStat:{flex:1,alignItems:'center'},oSV:{fontSize:14,fontWeight:'900',color:C.textPrimary},oSL:{fontSize:10,color:C.textSecondary,fontWeight:'700',marginTop:2,textTransform:'uppercase'},
  noD:{color:C.textSecondary,fontWeight:'600',textAlign:'center',padding:16},
  createBtn:{backgroundColor:C.primary,marginHorizontal:16,marginTop:8,marginBottom:16,padding:16,borderRadius:14,alignItems:'center',...SHADOWS.float},createTxt:{color:'#fff',fontWeight:'900',fontSize:16},
  rCard:{backgroundColor:C.surface,marginHorizontal:16,marginBottom:12,borderRadius:SIZES.radius,padding:18,...SHADOWS.card,borderWidth:1,borderColor:C.border},
  rHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6},rTitle:{fontSize:16,fontWeight:'900',color:C.textPrimary,flex:1},
  badge:{paddingHorizontal:10,paddingVertical:5,borderRadius:SIZES.radiusPill,marginLeft:8},badgeTxt:{fontSize:10,fontWeight:'900',letterSpacing:0.5},
  rMeta:{fontSize:12,color:C.textSecondary,fontWeight:'600',marginBottom:6},rNotes:{fontSize:13,color:C.textPrimary,fontWeight:'500',fontStyle:'italic',marginBottom:8},
  rStats:{flexDirection:'row',gap:12,marginBottom:10,flexWrap:'wrap'},rStat:{fontSize:12,fontWeight:'700',color:C.textSecondary},
  rActs:{flexDirection:'row',justifyContent:'flex-end',gap:8,borderTopWidth:1,borderTopColor:C.border,paddingTop:12},
  aBtn:{paddingHorizontal:12,paddingVertical:7,borderRadius:SIZES.radiusPill,backgroundColor:C.primary+'15',borderWidth:1,borderColor:C.primary+'30'},aBTxt:{fontWeight:'800',fontSize:12,color:C.primary},
  emT:{fontSize:20,fontWeight:'900',color:C.textPrimary,marginTop:12},emS:{color:C.textSecondary,marginTop:6,fontWeight:'500',fontSize:14},
  mOvr:{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'center',padding:16},mCnt:{backgroundColor:C.surface,borderRadius:20,padding:24,maxHeight:'85%'},
  mTitle:{fontSize:22,fontWeight:'900',color:C.textPrimary,letterSpacing:-0.5},mSub:{fontSize:14,fontWeight:'600',color:C.textSecondary,marginBottom:8},
  mClose:{marginTop:16,padding:14,borderRadius:12,backgroundColor:C.surfaceHighlight,alignItems:'center',borderWidth:1,borderColor:C.border},mCloseTxt:{fontWeight:'800',color:C.textSecondary,fontSize:15},
  dlL:{fontSize:11,fontWeight:'800',color:C.textMuted,marginTop:14,textTransform:'uppercase',letterSpacing:0.8},
  mIn:{backgroundColor:C.surfaceHighlight,borderRadius:12,padding:14,fontSize:15,color:C.textPrimary,borderWidth:1.5,borderColor:C.border,fontWeight:'600',marginTop:8},
  saveBtn:{backgroundColor:C.primary,padding:14,borderRadius:12,alignItems:'center',marginTop:20},saveTxt:{color:'#fff',fontWeight:'900',fontSize:15},
});