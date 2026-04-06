import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, Alert, SafeAreaView, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import api, { BASE_URL } from '../../api/api';

const PRIMARY = '#1E3A8A';

export default function OwnerVehiclesScreen({ navigation }) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

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
          {options.map(option => {
            const isSelected = selectedValue === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => onSelect(option)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option}</Text>
              </TouchableOpacity>
            );
          })}
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
      Alert.alert('Success', 'Vehicle updated. Pending admin approval.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update vehicle.');
    } finally {
      setActionId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'accepted': return <Text style={[styles.badgeText, { color: '#16A34A' }]}>✅ Accepted</Text>;
      case 'rejected': return <Text style={[styles.badgeText, { color: '#DC2626' }]}>❌ Rejected</Text>;
      default:         return <Text style={[styles.badgeText, { color: '#D97706' }]}>⏳ Pending Review</Text>;
    }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></SafeAreaView>;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>My Fleet</Text>
        <Text style={styles.subtitle}>Manage your vehicles</Text>
      </View>
      <FlatList
        data={vehicles}
        keyExtractor={item => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchMyVehicles(true)} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{textAlign: 'center', color: '#666'}}>You haven't added any vehicles yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {/* Vehicle Image */}
            {item.imageUrl ? (
              <Image
                source={{ uri: `${BASE_URL}${item.imageUrl}` }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Text style={{ fontSize: 36 }}>🚗</Text>
                <Text style={styles.noImageText}>No image uploaded</Text>
              </View>
            )}

            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Text style={styles.makeModel}>{item.makeAndModel}</Text>
                <View style={[styles.statusBadge, item.validationStatus === 'accepted' ? { backgroundColor: '#DCFCE7' } : item.validationStatus === 'rejected' ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#FEF3C7' }]}>
                  {getStatusBadge(item.validationStatus)}
                </View>
              </View>

              <Text style={styles.detail}>🔖 {item.licensePlate} • {item.year || 'N/A'}</Text>
              <Text style={styles.detail}>{item.type || 'Vehicle'} • {item.transmission || 'N/A'} • {item.fuelType || 'N/A'} • 💺 {item.seats || 'N/A'}</Text>
              <Text style={[styles.detail, {fontWeight: '800', color: '#059669', fontSize: 16, marginTop: 4}]}>Rs. {item.pricePerDay} / day</Text>

              <View style={styles.actionRow}>
                {item.validationStatus === 'accepted' ? (
                  <TouchableOpacity
                    style={[styles.btn, item.isAvailable ? styles.btnSuspend : styles.btnActivate, actionId === item._id && { opacity: 0.5 }]}
                    onPress={() => toggleAvailability(item)}
                    disabled={actionId === item._id}
                  >
                    <Text style={styles.btnText}>{item.isAvailable ? 'Hide from Customers' : 'Make Available'}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.btnGroupRow}>
                    <TouchableOpacity
                      style={[styles.btn, styles.btnEdit, actionId === item._id && { opacity: 0.5 }]}
                      onPress={() => openEditModal(item)}
                      disabled={actionId === item._id}
                    >
                      <Text style={[styles.btnText, { color: '#334155' }]}>✏️ Edit Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity
                  style={[styles.btn, styles.btnDelete, actionId === item._id && { opacity: 0.5 }]}
                  onPress={() => confirmDelete(item._id)}
                  disabled={actionId === item._id}
                >
                  <Text style={styles.btnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  Edits will reset status to <Text style={{fontWeight: '700'}}>Pending</Text> and require Admin approval again.
                </Text>
              </View>

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
              <TextInput
                style={styles.input}
                value={editForm.makeAndModel}
                onChangeText={t => setEditForm(prev => ({...prev, makeAndModel: t}))}
                placeholder="e.g. Toyota Corolla"
              />

              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <View style={{flex: 1, marginRight: 10}}>
                  <Text style={styles.label}>License Plate</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.licensePlate}
                    onChangeText={t => setEditForm(prev => ({...prev, licensePlate: t}))}
                    placeholder="ABC-1234"
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.label}>Price / Day</Text>
                  <TextInput
                    style={styles.input}
                    value={editForm.pricePerDay}
                    onChangeText={t => setEditForm(prev => ({...prev, pricePerDay: t}))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <SelectorSection title="Vehicle Type" options={TYPES} selectedValue={editForm.type} onSelect={t => setEditForm(prev => ({...prev, type: t}))} />
              <SelectorSection title="Transmission" options={TRANSMISSIONS} selectedValue={editForm.transmission} onSelect={t => setEditForm(prev => ({...prev, transmission: t}))} />
              <SelectorSection title="Fuel Type" options={FUELS} selectedValue={editForm.fuelType} onSelect={t => setEditForm(prev => ({...prev, fuelType: t}))} />
              <SelectorSection title="Seats" options={SEATS} selectedValue={editForm.seats} onSelect={t => setEditForm(prev => ({...prev, seats: t}))} />

              <Text style={styles.label}>Year</Text>
              <TextInput
                style={styles.input}
                value={editForm.year}
                onChangeText={t => setEditForm(prev => ({...prev, year: t}))}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Features</Text>
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
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
                {[
                  { key: 'revenueLicense', label: 'Revenue License', icon: '🪪', required: true },
                  { key: 'insurance',      label: 'Insurance Cert.',  icon: '🛡️', required: true },
                  { key: 'registration',   label: 'Registration',     icon: '📝', required: true },
                  { key: 'fitness',        label: 'Fitness Cert.',    icon: '🔧', required: false },
                ].map(doc => {
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
                              : <Text style={[styles.editDocStatus, { color: '#DC2626' }]}>❌ Not uploaded — tap to add</Text>
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
                })}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={closeEditModal}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSave} onPress={saveEdit} disabled={actionId === editingVehicle?._id}>
                  {actionId === editingVehicle?._id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnSaveText}>Save & Request Approval</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#F8FAFC' },
  header:        { padding: 20, paddingBottom: 10 },
  title:         { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  subtitle:      { color: '#64748B', marginTop: 4, fontSize: 16 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 40 },
  card:              { backgroundColor: '#fff', borderRadius: 16, marginBottom: 14, elevation: 3, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  cardImage:         { width: '100%', height: 170 },
  cardImagePlaceholder: { width: '100%', height: 110, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  noImageText:       { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 6 },
  cardBody:          { padding: 14 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  makeModel:         { fontSize: 18, fontWeight: '800', color: '#0F172A', flex: 1 },
  statusBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText:         { fontWeight: '700', fontSize: 12 },
  detail:            { fontSize: 14, color: '#475569', marginBottom: 5, fontWeight: '500' },
  actionRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, marginTop: 10 },
  infoText:          { color: '#94A3B8', fontSize: 12, fontStyle: 'italic', flex: 1 },
  btnGroupRow:   { flex: 1, marginRight: 10 },
  btn:           { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnEdit:       { backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  btnActivate:   { backgroundColor: '#16A34A', flex: 1, marginRight: 10, alignItems: 'center' },
  btnSuspend:    { backgroundColor: '#D97706', flex: 1, marginRight: 10, alignItems: 'center' },
  btnDelete:     { backgroundColor: '#EF4444' },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 13 },
  
  // Chip Styles
  chip:           { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  chipSelected:   { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:       { color: '#475569', fontWeight: '600', fontSize: 14 },
  chipTextSelected:{ color: '#fff' },

  // Modal Styles
  modalOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 15 },
  modalScroll:   { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  modalContent:  { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 10 },
  modalTitle:    { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  warningBox:    { backgroundColor: '#FFFBEB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FEF3C7', marginBottom: 20 },
  warningText:   { color: '#B45309', fontSize: 14, lineHeight: 20 },
  label:         { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 8 },
  input:         { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  // Modal Image Picker
  imagePickerBox:     { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 6, borderWidth: 1.5, borderColor: '#CBD5E1', borderStyle: 'dashed' },
  editImagePreview:   { width: '100%', height: '100%' },
  editImagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  editImagePlaceholderText: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 6 },
  changePhotoBtn:     { alignItems: 'center', paddingVertical: 6, marginBottom: 10 },
  changePhotoText:    { color: PRIMARY, fontWeight: '700', fontSize: 13 },

  modalActions:  { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  modalBtnCancel:{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginRight: 12 },
  modalBtnCancelText: { color: '#64748B', fontWeight: '700', fontSize: 15 },
  modalBtnSave:  { backgroundColor: PRIMARY, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  modalBtnSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Document Vault — Edit Modal
  editDocVault:       { marginTop: 18, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  editDocVaultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  editDocVaultTitle:  { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  editDocVaultSub:    { fontSize: 11, color: '#64748B', fontWeight: '600' },
  editDocRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1.5, borderColor: '#E2E8F0' },
  editDocRowUploaded: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  editDocLeft:        { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  editDocIcon:        { fontSize: 22, marginRight: 10 },
  editDocLabel:       { fontSize: 13, fontWeight: '800', color: '#0F172A', marginRight: 6 },
  editDocStatus:      { fontSize: 11, color: '#16A34A', fontWeight: '600', marginTop: 3 },
  editDocThumb:       { width: 52, height: 52, borderRadius: 8 },
  editDocThumbEmpty:  { width: 52, height: 52, borderRadius: 8, backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#C7D2FE', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  reqBadge:           { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  reqBadgeText:       { color: '#DC2626', fontSize: 9, fontWeight: '800' },
  optBadge:           { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  optBadgeText:       { color: '#64748B', fontSize: 9, fontWeight: '700' },
});
