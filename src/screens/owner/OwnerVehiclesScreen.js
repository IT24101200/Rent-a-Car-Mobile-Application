import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, StatusBar
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';
import { useTheme } from '../../context/ThemeContext';

import Card from '../../components/atoms/Card';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import TextInputAtom from '../../components/atoms/TextInput';
import Chip from '../../components/atoms/Chip';
export default function OwnerVehiclesScreen({ navigation }) {
  const { colors } = useTheme();
  const C = colors;
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [editForm, setEditForm] = useState({ makeAndModel: '', licensePlate: '', pricePerDay: '' });
  const [newImage, setNewImage] = useState(null); // photo replacement
  const [newDocs, setNewDocs]   = useState({});    // { revenueLicense: {uri,name,type}, ... }

  const fetchMyVehicles = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await api.get('/api/owner/vehicles');
      setVehicles(res.data);
    } catch {
      Alert.alert('Error', 'Could not load your vehicles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchMyVehicles(); }, [fetchMyVehicles]);

  const toggleAvailability = async (vehicle) => {
    const newStatus = !vehicle.isAvailable;
    setActionId(vehicle._id);
    try {
      const res = await api.patch(`/api/owner/vehicles/${vehicle._id}/availability`, { isAvailable: newStatus });
      setVehicles(prev => prev.map(v => v._id === vehicle._id ? { ...v, isAvailable: res.data.isAvailable } : v));
    } catch {
      Alert.alert('Error', 'Failed to toggle availability.');
    } finally {
      setActionId(null);
    }
  };

  const resolveProposal = async (id, action) => {
    setActionId('resolve');
    try {
      const res = await api.patch(`/api/owner/vehicles/${id}/price-proposal`, { action });
      setVehicles(prev => prev.map(v => v._id === id ? res.data.vehicle : v));
      Alert.alert('Success', res.data.message);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to resolve proposal.');
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = (vehicleId) => {
    Alert.alert(
      'Delete Vehicle',
      'Are you sure you want to permanently delete this vehicle?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            setActionId(vehicleId);
            try {
              await api.delete(`/api/owner/vehicles/${vehicleId}`);
              setVehicles(prev => prev.filter(v => v._id !== vehicleId));
            } catch {
              Alert.alert('Error', 'Failed to delete vehicle.');
            } finally {
              setActionId(null);
            }
          }
        }
      ]
    );
  };

// Constants for chip selections
  const TYPES = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Van'];
  const TRANSMISSIONS = ['Automatic', 'Manual'];
  const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'EV'];
  const SEATS = ['2', '4', '5', '7'];

  // Reusable component for selection chips in Edit Modal
  const SelectorSection = ({ title, options, selectedValue, onSelect }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { marginTop: 0 }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ overflow: 'visible' }}>
        <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
          {options.map(option => (
            <Chip 
              key={option}
              label={option}
              selected={selectedValue === option}
              onPress={() => onSelect(option)}
              style={{ marginRight: 10 }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setNewImage(null); // reset new image each time
    setEditForm({
      makeAndModel: vehicle.makeAndModel || '',
      licensePlate: vehicle.licensePlate || '',
      pricePerDay: vehicle.pricePerDay ? vehicle.pricePerDay.toString() : '',
      type: vehicle.type || 'Sedan',
      transmission: vehicle.transmission || 'Automatic',
      fuelType: vehicle.fuelType || 'Petrol',
      seats: vehicle.seats ? vehicle.seats.toString() : '5',
      year: vehicle.year ? vehicle.year.toString() : new Date().getFullYear().toString(),
      features: vehicle.features || ''
    });
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingVehicle(null);
    setNewImage(null);
    setNewDocs({});
  };

  const pickDoc = async (docKey) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Please grant photo library access.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [4, 3], quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop();
      setNewDocs(prev => ({ ...prev, [docKey]: { uri: asset.uri, name: `${docKey}.${ext}`, type: `image/${ext}` } }));
    }
  };

  const pickNewImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please grant photo library access.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop();
      setNewImage({ uri: asset.uri, name: `vehicle.${ext}`, type: `image/${ext}` });
    }
  };

  const saveEdit = async () => {
    if (!editForm.makeAndModel || !editForm.licensePlate || !editForm.pricePerDay || !editForm.year) {
      return Alert.alert('Error', 'Missing required fields.');
    }

    const isPriceIncrease = Number(editForm.pricePerDay) > editingVehicle.pricePerDay;
    if (isPriceIncrease && !newDocs.priceJustification && !editingVehicle.documents?.find(d => d.docType === 'priceJustification')) {
      return Alert.alert('Error', 'Price Justification document is required because you are increasing the daily price.');
    }

    setActionId(editingVehicle._id);
    try {
      const formData = new FormData();
      formData.append('makeAndModel', editForm.makeAndModel);
      formData.append('licensePlate', editForm.licensePlate);
      formData.append('pricePerDay', editForm.pricePerDay);
      formData.append('type', editForm.type);
      formData.append('transmission', editForm.transmission);
      formData.append('fuelType', editForm.fuelType);
      formData.append('seats', editForm.seats);
      formData.append('year', editForm.year);
      formData.append('features', editForm.features);
      if (newImage) {
        formData.append('image', { uri: newImage.uri, name: newImage.name, type: newImage.type });
      }
      // Append any newly replaced documents
      Object.entries(newDocs).forEach(([key, file]) => {
        formData.append(key, { uri: file.uri, name: file.name, type: file.type });
      });

      const res = await api.put(`/api/owner/vehicles/${editingVehicle._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVehicles(prev => prev.map(v => v._id === editingVehicle._id ? res.data : v));
      closeEditModal();
      const msg = res.data.validationStatus === 'pending'
        ? 'Vehicle updated. Critical fields changed \u2014 pending admin re-approval.'
        : 'Vehicle updated successfully!';
      Alert.alert('Success', msg);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update vehicle.');
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'accepted': return <Text style={[styles.badgeText, { color: C.success }]}>✅ Accepted</Text>;
      case 'rejected': return <Text style={[styles.badgeText, { color: C.error }]}>❌ Rejected</Text>;
      default:         return <Text style={[styles.badgeText, { color: C.warning }]}>⏳ Pending</Text>;
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.headerGradientStart} />
      <View style={styles.greenHeader}>
        <Text style={styles.title}>My Fleet</Text>
        <Text style={styles.subtitle}>Manage your vehicles</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMyVehicles(true)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{textAlign: 'center', color: C.textMuted, padding: 20}}>You haven't added any vehicles yet.</Text>}
        renderItem={({ item }) => {
          const isAccepted = item.validationStatus === 'accepted';
          const isRejected = item.validationStatus === 'rejected';
          return (
          <View style={styles.fleetCard}>
            {/* Vehicle Image with Status Overlay */}
            <View style={styles.fleetImageWrap}>
              {item.imageUrl ? (
                <Image source={{ uri: `${BASE_URL}${item.imageUrl}` }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={styles.cardImagePlaceholder}>
                  <MaterialCommunityIcons name="car-sports" size={40} color={C.textMuted} />
                  <Text style={styles.noImageText}>No image</Text>
                </View>
              )}
              {/* Availability dot */}
              {isAccepted && (
                <View style={[styles.availDot, { backgroundColor: item.isAvailable ? C.success : C.error }]} />
              )}
            </View>

            {/* Card Content */}
            <View style={styles.cardBody}>
              {/* Title Row */}
              <View style={styles.cardHeader}>
                <Text style={styles.makeModel} numberOfLines={1}>{item.makeAndModel}</Text>
                <View style={[styles.statusChip, { backgroundColor: isAccepted ? C.successBg : isRejected ? C.errorBg : C.warningBg, borderColor: isAccepted ? C.success : isRejected ? C.error : C.warning }]}>
                  <Text style={[styles.statusChipText, { color: isAccepted ? C.success : isRejected ? C.error : C.warning }]}>
                    {isAccepted ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Specs Row with Icons */}
              <View style={styles.specsRow}>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="card-text-outline" size={14} color={C.textMuted} />
                  <Text style={styles.specText}>{item.licensePlate}</Text>
                </View>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="car-cog" size={14} color={C.textMuted} />
                  <Text style={styles.specText}>{item.type || 'Car'}</Text>
                </View>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="gas-station" size={14} color={C.textMuted} />
                  <Text style={styles.specText}>{item.fuelType || 'N/A'}</Text>
                </View>
                <View style={styles.specItem}>
                  <MaterialCommunityIcons name="seat" size={14} color={C.textMuted} />
                  <Text style={styles.specText}>{item.seats || '4'}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceText, { color: C.primary }]}>Rs.{item.pricePerDay}<Text style={styles.priceUnit}>/day</Text></Text>
                {isAccepted && (
                  <Text style={[styles.availText, { color: item.isAvailable ? C.success : C.error }]}>
                    {item.isAvailable ? '● Listed' : '● Hidden'}
                  </Text>
                )}
              </View>

              {/* Price Proposal Alert */}
              {item.priceProposal && item.priceProposal.status === 'pending' && item.priceProposal.proposedBy === 'admin' && (
                <View style={styles.proposalBox}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.warning, marginBottom: 4 }}>Admin Price Proposal</Text>
                  <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>Proposed: <Text style={{ fontWeight: '800', color: C.textPrimary }}>Rs. {item.priceProposal.proposedPrice}</Text></Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.proposalBtn, { backgroundColor: C.success }]} onPress={() => resolveProposal(item._id, 'approve')}>
                      <MaterialCommunityIcons name="check" size={16} color={C.textOnPrimary} />
                      <Text style={{ color: C.textOnPrimary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.proposalBtn, { backgroundColor: C.error }]} onPress={() => resolveProposal(item._id, 'reject')}>
                      <MaterialCommunityIcons name="close" size={16} color={C.textOnPrimary} />
                      <Text style={{ color: C.textOnPrimary, fontWeight: '700', fontSize: 12, marginLeft: 4 }}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isAccepted && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: item.isAvailable ? C.warning : C.success }]} 
                    onPress={() => toggleAvailability(item)}
                    disabled={actionId === item._id}
                  >
                    <MaterialCommunityIcons name={item.isAvailable ? 'eye-off-outline' : 'eye-outline'} size={18} color={item.isAvailable ? C.warning : C.success} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, { borderColor: C.primary, flex: 1 }]} onPress={() => setDetailItem(item)}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={C.primary} />
                  <Text style={[styles.actionBtnText, { color: C.primary }]}>Details</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: C.textMuted, flex: 1 }]} onPress={() => openEditModal(item)}>
                  <MaterialCommunityIcons name="pencil-outline" size={18} color={C.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: C.error }]} onPress={() => confirmDelete(item._id)} disabled={actionId === item._id}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={C.error} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}}
      />

      {/* Edit Vehicle Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>✏️ Edit Vehicle</Text>
              {editingVehicle?.validationStatus === 'accepted' ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ Changing vehicle name, plate, photo, or documents will reset approval to <Text style={{fontWeight: '700'}}>Pending</Text>. Price and feature changes apply instantly.
                  </Text>
                </View>
              ) : (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    Edits will keep status as <Text style={{fontWeight: '700'}}>Pending</Text> and require Admin approval.
                  </Text>
                </View>
              )}

              {/* Image Section */}
              <Text style={styles.label}>Vehicle Photo</Text>
              <TouchableOpacity style={styles.imagePickerBox} onPress={pickNewImage} activeOpacity={0.8}>
                {newImage ? (
                  <Image source={{ uri: newImage.uri }} style={styles.editImagePreview} resizeMode="cover" />
                ) : editingVehicle?.imageUrl ? (
                  <Image source={{ uri: `${BASE_URL}${editingVehicle.imageUrl}` }} style={styles.editImagePreview} resizeMode="cover" />
                ) : (
                  <View style={styles.editImagePlaceholder}>
                    <Text style={{ fontSize: 28 }}>📷</Text>
                    <Text style={styles.editImagePlaceholderText}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {(newImage || editingVehicle?.imageUrl) && (
                <TouchableOpacity style={styles.changePhotoBtn} onPress={pickNewImage}>
                  <Text style={styles.changePhotoText}>{newImage ? '✅ New photo selected — tap to change' : '📸 Tap to replace current photo'}</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Make and Model</Text>
              <TextInputAtom
                value={editForm.makeAndModel}
                onChangeText={t => setEditForm(prev => ({...prev, makeAndModel: t}))}
                placeholder="e.g. Toyota Corolla"
              />

              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{flex: 1, marginRight: 10}}>
                  <Text style={styles.label}>License Plate</Text>
                  <TextInputAtom
                    value={editForm.licensePlate}
                    onChangeText={t => setEditForm(prev => ({...prev, licensePlate: t}))}
                    placeholder="ABC-1234"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Price per day (Rs.)</Text>
                  {editingVehicle?.priceProposal && editingVehicle.priceProposal.status === 'pending' && editingVehicle.priceProposal.proposedBy === 'owner' ? (
                    <View style={{ backgroundColor: C.surfaceHighlight, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                      <Text style={{ color: C.warning, fontWeight: 'bold', marginBottom: 4 }}>⏳ Price Increase Pending Admin Approval</Text>
                      <Text style={{ color: C.textSecondary, fontSize: 13 }}>Proposed Price: Rs. {editingVehicle.priceProposal.proposedPrice}</Text>
                    </View>
                  ) : (
                    <TextInputAtom
                      keyboardType="numeric"
                      value={String(editForm.pricePerDay)}
                      onChangeText={t => setEditForm(prev => ({...prev, pricePerDay: t}))}
                    />
                  )}
                </View>
              </View>

              <SelectorSection title="Vehicle Type" options={TYPES} selectedValue={editForm.type} onSelect={t => setEditForm(prev => ({...prev, type: t}))} />
              <SelectorSection title="Transmission" options={TRANSMISSIONS} selectedValue={editForm.transmission} onSelect={t => setEditForm(prev => ({...prev, transmission: t}))} />
              <SelectorSection title="Fuel Type" options={FUELS} selectedValue={editForm.fuelType} onSelect={t => setEditForm(prev => ({...prev, fuelType: t}))} />
              <SelectorSection title="Seats" options={SEATS} selectedValue={editForm.seats} onSelect={t => setEditForm(prev => ({...prev, seats: t}))} />

              <Text style={styles.label}>Year</Text>
              <TextInputAtom
                value={editForm.year}
                onChangeText={t => setEditForm(prev => ({...prev, year: t}))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Features</Text>
              <TextInputAtom
                style={{ minHeight: 60, textAlignVertical: 'top' }}
                value={editForm.features}
                onChangeText={t => setEditForm(prev => ({...prev, features: t}))}
                multiline
                numberOfLines={2}
              />

              {/* ── Document Vault ─────────────────────────────── */}
              <View style={styles.editDocVault}>
                <View style={styles.editDocVaultHeader}>
                  <Text style={styles.editDocVaultTitle}>📁 Document Vault</Text>
                  <Text style={styles.editDocVaultSub}>Tap any document to replace it</Text>
                </View>
                {(() => {
                  const isPriceIncrease = Number(editForm.pricePerDay) > editingVehicle?.pricePerDay;
                  const docsToRender = [
                    { key: 'revenueLicense', label: 'Revenue License', icon: '🪪', required: true },
                    { key: 'insurance',      label: 'Insurance Cert.',  icon: '🛡️', required: true },
                    { key: 'registration',   label: 'Registration',     icon: '📝', required: true },
                    { key: 'fitness',        label: 'Fitness Cert.',    icon: '🔧', required: false },
                  ];
                  if (isPriceIncrease) {
                    docsToRender.push({ key: 'priceJustification', label: 'Price Increase Justification', icon: '📈', required: true });
                  }
                  return docsToRender.map(doc => {
                    const existing = editingVehicle?.documents?.find(d => d.docType === doc.key);
                  const newFile  = newDocs[doc.key];
                  return (
                    <TouchableOpacity
                      key={doc.key}
                      style={[styles.editDocRow, (existing || newFile) && styles.editDocRowUploaded]}
                      onPress={() => pickDoc(doc.key)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.editDocLeft}>
                        <Text style={styles.editDocIcon}>{doc.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.editDocLabel}>{doc.label}</Text>
                            {doc.required
                              ? <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>Required</Text></View>
                              : <View style={styles.optBadge}><Text style={styles.optBadgeText}>Optional</Text></View>
                            }
                          </View>
                          {newFile
                            ? <Text style={styles.editDocStatus}>✅ New image selected</Text>
                            : existing
                              ? <Text style={styles.editDocStatus}>📎 Uploaded — tap to replace</Text>
                              : <Text style={[styles.editDocStatus, { color: C.error }]}>❌ Not uploaded — tap to add</Text>
                          }
                        </View>
                      </View>
                      {(newFile || existing) ? (
                        <Image
                          source={{ uri: newFile ? newFile.uri : `${BASE_URL}${existing.fileUrl}` }}
                          style={styles.editDocThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.editDocThumbEmpty}>
                          <Text style={{ fontSize: 16 }}>⬆️</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                  });
                })()}
              </View>

              <View style={[styles.modalActions, { gap: 12 }]}>
                <Button label="Cancel" variant="ghost" onPress={closeEditModal} />
                <Button 
                  label="Save & Request Approval" 
                  onPress={saveEdit} 
                  loading={actionId === editingVehicle?._id} 
                  disabled={actionId === editingVehicle?._id} 
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Detail Modal ─────────────────────────────── */}
      <Modal visible={!!detailItem} transparent animationType="slide" onRequestClose={() => setDetailItem(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>🚗 Vehicle Details</Text>
              {detailItem && (
                <>
                  <View style={[styles.statusBadge, detailItem.validationStatus === 'accepted' ? { backgroundColor: C.successBg } : detailItem.validationStatus === 'rejected' ? { backgroundColor: C.errorBg } : { backgroundColor: C.warningBg }, { alignSelf: 'flex-start', marginVertical: 12 }]}>
                    {getStatusBadge(detailItem.validationStatus)}
                  </View>
                  {detailItem.imageUrl && <Image source={{uri: BASE_URL + detailItem.imageUrl}} style={{width: '100%', height: 180, borderRadius: 14, marginBottom: 16}} resizeMode="cover" />}
                  
                  {detailItem.validationStatus === 'rejected' && detailItem.rejectionReason && (
                    <View style={{ backgroundColor: C.error+'15', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: C.error }}>
                      <Text style={{ fontWeight: 'bold', color: C.error, marginBottom: 4 }}>❌ Rejection Reason</Text>
                      <Text style={{ color: C.textPrimary }}>{detailItem.rejectionReason}</Text>
                    </View>
                  )}

                  {detailItem.validationNote && (
                    <View style={{ backgroundColor: C.primary+'15', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: C.primary }}>
                      <Text style={{ fontWeight: 'bold', color: C.primary, marginBottom: 4 }}>ℹ️ Admin Note</Text>
                      <Text style={{ color: C.textPrimary }}>{detailItem.validationNote}</Text>
                    </View>
                  )}

                  <Text style={styles.label}>Make & Model</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: C.textPrimary, marginBottom: 12 }}>{detailItem.makeAndModel}</Text>

                  <Text style={styles.label}>License Plate</Text>
                  <Text style={{ fontSize: 16, color: C.textPrimary, marginBottom: 12 }}>{detailItem.licensePlate}</Text>

                  <Text style={styles.label}>Specifications</Text>
                  <Text style={{ fontSize: 14, color: C.textPrimary, marginBottom: 12 }}>{detailItem.type||'N/A'} • {detailItem.transmission||'N/A'} • {detailItem.fuelType||'N/A'} • {detailItem.seats||'N/A'} seats • {detailItem.year||'N/A'}</Text>

                  <Text style={styles.label}>Price Per Day</Text>
                  <Text style={{ color: C.success, fontWeight: '900', fontSize: 20, marginBottom: 12 }}>Rs. {(detailItem.pricePerDay||0).toLocaleString()}</Text>

                  {detailItem.priceProposal && detailItem.priceProposal.status === 'pending' && (
                    <View style={{ backgroundColor: C.warning+'15', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: C.warning }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: C.warning, marginBottom: 4 }}>⚠️ Pending Price Proposal</Text>
                      <Text style={{ fontSize: 13, color: C.textPrimary }}>Proposed by: {detailItem.priceProposal.proposedBy === 'admin' ? 'Fleet Manager' : 'You'}</Text>
                      <Text style={{ fontSize: 13, color: C.textPrimary }}>Proposed Price: <Text style={{fontWeight:'bold'}}>Rs. {detailItem.priceProposal.proposedPrice}</Text></Text>
                    </View>
                  )}

                  <Text style={styles.label}>Availability</Text>
                  <Text style={{ color: detailItem.isAvailable!==false?C.success:C.error, fontWeight: '800', marginBottom: 12 }}>{detailItem.isAvailable!==false?'✅ Available':'❌ Unavailable'}</Text>

                  {detailItem.features && (
                    <>
                      <Text style={styles.label}>Features</Text>
                      <Text style={{ color: C.textPrimary, marginBottom: 12 }}>{detailItem.features}</Text>
                    </>
                  )}

                  {detailItem.documents?.length > 0 && (
                    <>
                      <Text style={styles.label}>Uploaded Documents ({detailItem.documents.length})</Text>
                      {detailItem.documents.map((d,i) => (
                        <Text key={i} style={{ color: C.textPrimary, marginBottom: 4 }}>📄 {d.docType === 'priceJustification' ? 'Price Justification' : d.docType}</Text>
                      ))}
                      <View style={{ marginBottom: 12 }} />
                    </>
                  )}
                  
                  <Text style={styles.label}>Added</Text>
                  <Text style={{ color: C.textPrimary, marginBottom: 20 }}>{new Date(detailItem.createdAt).toLocaleDateString()}</Text>
                </>
              )}
            </ScrollView>
            <Button 
              label="Close Details" 
              style={{ marginTop: 16 }} 
              onPress={() => setDetailItem(null)} 
            />
          </View>
        </View>
      </Modal>

      {/* ── FAB to Add Vehicle ── */}
      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8} 
        onPress={() => navigation.navigate('AddVehicle')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.background },

  // ── Dark Premium Header ──
  greenHeader:   { backgroundColor: C.surface, paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  title:         { fontSize: 26, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.5 },
  subtitle:      { fontSize: 14, color: C.textSecondary, fontWeight: '600', marginTop: 4 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  list:          { padding: 16, paddingBottom: 100 },

  // ── Fleet Vehicle Cards ──
  fleetCard:         { backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: C.border },
  fleetImageWrap:    { position: 'relative' },
  cardImage:         { width: '100%', height: 170 },
  cardImagePlaceholder: { width: '100%', height: 130, backgroundColor: C.surfaceHighlight, alignItems: 'center', justifyContent: 'center' },
  noImageText:       { fontSize: 11, color: C.textMuted, fontWeight: '600', marginTop: 6 },
  availDot:          { position: 'absolute', top: 12, right: 12, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: C.surface },
  
  cardBody:          { padding: 16 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  makeModel:         { fontSize: 17, fontWeight: '800', color: C.textPrimary, flex: 1, marginRight: 10 },
  statusChip:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusChipText:    { fontSize: 11, fontWeight: '800' },

  specsRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  specItem:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  specText:          { fontSize: 12, color: C.textSecondary, fontWeight: '600' },

  priceRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  priceText:         { fontSize: 18, fontWeight: '900' },
  priceUnit:         { fontSize: 12, fontWeight: '600', color: C.textMuted },
  availText:         { fontSize: 12, fontWeight: '800' },

  proposalBox:       { backgroundColor: C.warningBg, padding: 12, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: C.warning },
  proposalBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8 },

  actionRow:         { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 14, marginTop: 14 },
  actionBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  actionBtnText:     { fontSize: 12, fontWeight: '700' },
  
  detail:            { fontSize: 14, color: C.textSecondary, marginBottom: 5, fontWeight: '500' },
  badgeText:         { fontSize: 12, fontWeight: '800' },
  infoText:          { color: C.textMuted, fontSize: 12, fontStyle: 'italic', flex: 1 },

  // ── Modal Styles ──
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 15 },
  modalScroll:   { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  modalContent:  { backgroundColor: C.surface, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border },
  modalTitle:    { fontSize: 22, fontWeight: '800', color: C.textPrimary, marginBottom: 16 },
  warningBox:    { backgroundColor: C.warningBg, padding: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: C.warning, marginBottom: 20 },
  warningText:   { color: C.warning, fontSize: 14, lineHeight: 20 },
  label:         { fontSize: 14, fontWeight: '600', color: C.textPrimary, marginBottom: 6, marginTop: 8 },

  // ── Modal Image Picker ──
  imagePickerBox:     { width: '100%', height: 160, borderRadius: SIZES.radius, overflow: 'hidden', marginBottom: 6, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed' },
  editImagePreview:   { width: '100%', height: '100%' },
  editImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.background },
  editImagePlaceholderText: { fontSize: 13, color: C.textMuted, fontWeight: '600', marginTop: 6 },
  changePhotoBtn:     { alignItems: 'center', paddingVertical: 6, marginBottom: 10 },
  changePhotoText:    { color: C.primary, fontWeight: '700', fontSize: 13 },

  // ── Document Vault ──
  editDocVault:       { marginTop: 18, backgroundColor: C.background, borderRadius: SIZES.radius, padding: 14, borderWidth: 1, borderColor: C.border },
  editDocVaultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  editDocVaultTitle:  { fontSize: 15, fontWeight: '800', color: C.textPrimary },
  editDocVaultSub:    { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  editDocRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: C.border },
  editDocRowUploaded: { borderColor: C.success, backgroundColor: C.successBg },
  editDocLeft:        { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  editDocIcon:        { fontSize: 22, marginRight: 10 },
  editDocLabel:       { fontSize: 13, fontWeight: '800', color: C.textPrimary, marginRight: 6 },
  editDocStatus:      { fontSize: 11, color: C.success, fontWeight: '600', marginTop: 3 },
  editDocThumb:       { width: 52, height: 52, borderRadius: SIZES.radius },
  editDocThumbEmpty:  { width: 52, height: 52, borderRadius: SIZES.radius, backgroundColor: C.primaryLight, borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  reqBadge:           { backgroundColor: C.errorBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  reqBadgeText:       { color: C.error, fontSize: 9, fontWeight: '800' },
  optBadge:           { backgroundColor: C.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  optBadgeText:       { color: C.textMuted, fontSize: 9, fontWeight: '700' },

  // ── FAB ──
  fab: { position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, zIndex: 99, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  fabText: { fontSize: 32, color: C.textOnPrimary, fontWeight: '400', lineHeight: 34 },
});
