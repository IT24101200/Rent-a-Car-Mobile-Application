import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api from '../../api/api';

const PRIMARY = '#1E3A8A';

// Document definitions
const DOCUMENTS = [
  { key: 'revenueLicense', label: 'Revenue License',      icon: '🪪', required: true,  hint: 'Government issued vehicle permit' },
  { key: 'insurance',      label: 'Insurance Certificate', icon: '🛡️', required: true,  hint: 'Proof of active vehicle insurance' },
  { key: 'registration',   label: 'Vehicle Registration',  icon: '📝', required: true,  hint: 'Official ownership certificate' },
  { key: 'fitness',        label: 'Fitness Certificate',   icon: '🔧', required: false, hint: 'Roadworthiness inspection pass' },
];

export default function AddVehicleScreen({ navigation }) {
  const [form, setForm] = useState({
    makeAndModel: '',
    licensePlate: '',
    pricePerDay: '',
    type: 'Sedan',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    seats: '5',
    year: new Date().getFullYear().toString(),
    features: ''
  });
  const [image, setImage] = useState(null);      // vehicle photo
  const [docs, setDocs] = useState({});           // { revenueLicense: {uri,name,type}, ... }
  const [loading, setLoading] = useState(false);

  const TYPES         = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Van'];
  const TRANSMISSIONS = ['Automatic', 'Manual'];
  const FUELS         = ['Petrol', 'Diesel', 'Hybrid', 'EV'];
  const SEATS         = ['2', '4', '5', '7'];

  const pickImage = async (fieldKey = null) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please grant photo library access.');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: fieldKey ? [4, 3] : [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop();
      const file  = { uri: asset.uri, name: `${fieldKey || 'vehicle'}.${ext}`, type: `image/${ext}` };
      if (fieldKey) {
        setDocs(prev => ({ ...prev, [fieldKey]: file }));
      } else {
        setImage(file);
      }
    }
  };

  const validate = () => {
    if (!form.makeAndModel.trim())   return 'Make and Model is required.';
    if (!form.licensePlate.trim())   return 'License Plate is required.';
    if (!form.pricePerDay || isNaN(form.pricePerDay) || Number(form.pricePerDay) <= 0)
      return 'Valid Price Per Day is required.';
    if (!form.year || isNaN(form.year) || Number(form.year) < 1990 || Number(form.year) > new Date().getFullYear() + 1)
      return 'Please enter a valid Year.';
    if (!image) return 'A vehicle photo is required.';
    const missingDocs = DOCUMENTS.filter(d => d.required && !docs[d.key]);
    if (missingDocs.length > 0)
      return `Missing required documents: ${missingDocs.map(d => d.label).join(', ')}`;
    return null;
  };

  const handleCreate = async () => {
    const errorMsg = validate();
    if (errorMsg) return Alert.alert('Validation Error', errorMsg);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('makeAndModel',  form.makeAndModel);
      formData.append('licensePlate',  form.licensePlate);
      formData.append('pricePerDay',   form.pricePerDay);
      formData.append('type',          form.type);
      formData.append('transmission',  form.transmission);
      formData.append('fuelType',      form.fuelType);
      formData.append('seats',         form.seats);
      formData.append('year',          form.year);
      formData.append('features',      form.features);
      formData.append('image', { uri: image.uri, name: image.name, type: image.type });

      // Append each document
      Object.entries(docs).forEach(([key, file]) => {
        formData.append(key, { uri: file.uri, name: file.name, type: file.type });
      });

      await api.post('/api/vehicles', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('🎉 Success!', 'Vehicle submitted for admin approval!', [
        { text: 'Go to My Fleet', onPress: () => navigation.navigate('MyFleet') }
      ]);

      setForm({
        makeAndModel: '', licensePlate: '', pricePerDay: '',
        type: 'Sedan', transmission: 'Automatic', fuelType: 'Petrol',
        seats: '5', year: new Date().getFullYear().toString(), features: ''
      });
      setImage(null);
      setDocs({});
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add vehicle.');
    } finally {
      setLoading(false);
    }
  };

  const SelectorSection = ({ title, options, selectedValue, onSelect }) => (
    <View style={styles.sectionLayout}>
      <Text style={styles.label}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        <View style={styles.chipContainer}>
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

  // Progress tracker for document vault
  const uploadedRequired = DOCUMENTS.filter(d => d.required && docs[d.key]).length;
  const totalRequired    = DOCUMENTS.filter(d => d.required).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>List Your Vehicle</Text>
          <Text style={styles.subtitle}>Fill in details and upload required documents.</Text>
        </View>

        {/* ── Vehicle Photo ─────────────────────────────────────────── */}
        <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage(null)} activeOpacity={0.8}>
          {image ? (
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>📷</Text>
              <Text style={styles.imagePlaceholderText}>Tap to Upload Vehicle Photo</Text>
              <Text style={styles.imagePlaceholderSub}>Required • Max 5MB • JPG / PNG</Text>
            </View>
          )}
        </TouchableOpacity>
        {image && (
          <TouchableOpacity style={styles.changeImageBtn} onPress={() => pickImage(null)}>
            <Text style={styles.changeImageText}>📸 Change Photo</Text>
          </TouchableOpacity>
        )}

        {/* ── Basic Information ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Basic Information</Text>
          <Text style={styles.label}>Make and Model</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Toyota Aqua"
            value={form.makeAndModel}
            onChangeText={t => setForm({...form, makeAndModel: t})}
          />
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>
              <Text style={styles.label}>License Plate</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                value={form.licensePlate}
                onChangeText={t => setForm({...form, licensePlate: t})}
              />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.label}>Price / Day (Rs.)</Text>
              <TextInput
                style={styles.input}
                placeholder="4000"
                keyboardType="numeric"
                value={form.pricePerDay}
                onChangeText={t => setForm({...form, pricePerDay: t})}
              />
            </View>
          </View>
        </View>

        {/* ── Specifications ─────────────────────────────────────────── */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <Text style={styles.sectionHeader}>Specifications</Text>
          <SelectorSection title="Vehicle Type"  options={TYPES}         selectedValue={form.type}         onSelect={t => setForm({...form, type: t})} />
          <SelectorSection title="Transmission"  options={TRANSMISSIONS} selectedValue={form.transmission} onSelect={t => setForm({...form, transmission: t})} />
          <SelectorSection title="Fuel Type"     options={FUELS}         selectedValue={form.fuelType}     onSelect={t => setForm({...form, fuelType: t})} />
          <SelectorSection title="Seats"         options={SEATS}         selectedValue={form.seats}        onSelect={t => setForm({...form, seats: t})} />
          <Text style={styles.label}>Manufacture Year</Text>
          <TextInput
            style={styles.input}
            placeholder="2020"
            keyboardType="numeric"
            value={form.year}
            onChangeText={t => setForm({...form, year: t})}
          />
          <Text style={styles.label}>Extra Features</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Bluetooth, Sunroof, AC..."
            multiline
            numberOfLines={3}
            value={form.features}
            onChangeText={t => setForm({...form, features: t})}
          />
        </View>

        {/* ── Document Vault ─────────────────────────────────────────── */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <View style={styles.vaultHeader}>
            <Text style={styles.sectionHeader}>📁 Document Vault</Text>
            <View style={styles.progressPill}>
              <Text style={styles.progressText}>{uploadedRequired}/{totalRequired} Required</Text>
            </View>
          </View>
          <Text style={styles.vaultSubtitle}>
            Upload clear photos of your vehicle documents. Required docs must be submitted for approval.
          </Text>

          {DOCUMENTS.map(doc => {
            const uploaded = docs[doc.key];
            return (
              <View key={doc.key} style={[styles.docCard, uploaded && styles.docCardUploaded]}>
                <View style={styles.docLeft}>
                  <Text style={styles.docIcon}>{doc.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.docTitleRow}>
                      <Text style={styles.docLabel}>{doc.label}</Text>
                      {doc.required
                        ? <View style={styles.requiredBadge}><Text style={styles.requiredBadgeText}>Required</Text></View>
                        : <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>Optional</Text></View>
                      }
                    </View>
                    <Text style={styles.docHint}>{doc.hint}</Text>
                    {uploaded && (
                      <Text style={styles.docUploaded}>✅ Photo selected</Text>
                    )}
                  </View>
                </View>

                <View style={styles.docRight}>
                  {uploaded ? (
                    <TouchableOpacity onPress={() => pickImage(doc.key)} activeOpacity={0.8}>
                      <Image source={{ uri: uploaded.uri }} style={styles.docThumb} />
                      <Text style={styles.docChangeText}>Change</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.docUploadBtn} onPress={() => pickImage(doc.key)}>
                      <Text style={styles.docUploadIcon}>⬆️</Text>
                      <Text style={styles.docUploadText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Submit ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Submit for Approval 🚀</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:       { flexGrow: 1, backgroundColor: '#F8FAFC', padding: 20, paddingBottom: 50 },
  header:          { marginBottom: 20, marginTop: 10 },
  title:           { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  subtitle:        { color: '#64748B', marginTop: 4, fontSize: 15, fontWeight: '500' },

  imagePicker:     { borderRadius: 20, overflow: 'hidden', marginBottom: 8, height: 200 },
  previewImage:    { width: '100%', height: '100%' },
  imagePlaceholder:{ flex: 1, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C7D2FE', borderStyle: 'dashed', borderRadius: 20 },
  imagePlaceholderIcon: { fontSize: 40, marginBottom: 8 },
  imagePlaceholderText: { fontSize: 16, fontWeight: '800', color: PRIMARY },
  imagePlaceholderSub:  { fontSize: 12, color: '#64748B', marginTop: 4, fontWeight: '500' },
  changeImageBtn:  { alignItems: 'center', marginBottom: 16, padding: 8 },
  changeImageText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },

  card:            { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionHeader:   { fontSize: 18, fontWeight: '800', color: PRIMARY, marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },

  row:             { flexDirection: 'row', justifyContent: 'space-between' },
  label:           { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  input:           { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 14, fontSize: 15, color: '#0F172A', marginBottom: 16, backgroundColor: '#F8FAFC' },
  textArea:        { minHeight: 80, textAlignVertical: 'top' },
  sectionLayout:   { marginBottom: 16 },
  chipScroll:      { overflow: 'visible' },
  chipContainer:   { flexDirection: 'row', paddingVertical: 4 },
  chip:            { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#CBD5E1' },
  chipSelected:    { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:        { color: '#475569', fontWeight: '600', fontSize: 14 },
  chipTextSelected:{ color: '#fff' },

  // Document Vault
  vaultHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  progressPill:    { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  progressText:    { color: PRIMARY, fontWeight: '800', fontSize: 12 },
  vaultSubtitle:   { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 18 },

  docCard:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  docCardUploaded: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  docLeft:         { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 10 },
  docIcon:         { fontSize: 26, marginRight: 12, marginTop: 2 },
  docTitleRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 3, flexWrap: 'wrap' },
  docLabel:        { fontSize: 14, fontWeight: '800', color: '#0F172A', marginRight: 6 },
  requiredBadge:   { backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  requiredBadgeText:{ color: '#DC2626', fontSize: 10, fontWeight: '800' },
  optionalBadge:   { backgroundColor: '#F1F5F9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  optionalBadgeText:{ color: '#64748B', fontSize: 10, fontWeight: '700' },
  docHint:         { fontSize: 12, color: '#64748B', lineHeight: 16 },
  docUploaded:     { fontSize: 12, color: '#16A34A', fontWeight: '700', marginTop: 4 },

  docRight:        { alignItems: 'center' },
  docThumb:        { width: 60, height: 60, borderRadius: 10, marginBottom: 4 },
  docChangeText:   { fontSize: 11, color: PRIMARY, fontWeight: '700', textAlign: 'center' },
  docUploadBtn:    { width: 60, height: 60, borderRadius: 10, backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#C7D2FE', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  docUploadIcon:   { fontSize: 20 },
  docUploadText:   { fontSize: 10, color: PRIMARY, fontWeight: '800', marginTop: 2 },

  btn:             { backgroundColor: PRIMARY, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  btnDisabled:     { opacity: 0.7 },
  btnText:         { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
});
