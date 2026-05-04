// adds a vehicle - this is also where validation of the form happens
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/api';
import { SIZES, SHADOWS } from '../../theme/theme';

//mx no of images that can be uploaded
const MAX_IMAGES = 5;

// Document definitions
const DOCUMENTS = [
  { key: 'revenueLicense', label: 'Revenue License',      icon: '🪪', required: true,  hint: 'Government issued vehicle permit' },
  { key: 'insurance',      label: 'Insurance Certificate', icon: '🛡️', required: true,  hint: 'Proof of active vehicle insurance' },
  { key: 'registration',   label: 'Vehicle Registration',  icon: '📝', required: true,  hint: 'Official ownership certificate' },
  { key: 'fitness',        label: 'Fitness Certificate',   icon: '🔧', required: false, hint: 'Roadworthiness inspection pass' },
];

export default function AddVehicleScreen({ navigation }) {
  const { colors, isDark } = useTheme(); // Get theme colors and dark mode state
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  const [form, setForm] = useState({ // Store all text form fields
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
  const [images, setImages] = useState([]);   // array of {uri,name,type}
  const [docs, setDocs] = useState({});           // { revenueLicense: {uri,name,type}, ... }
  const [loading, setLoading] = useState(false);

  // Dropdown / selection options
  const TYPES         = ['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Van'];
  const TRANSMISSIONS = ['Automatic', 'Manual'];
  const FUELS         = ['Petrol', 'Diesel', 'Hybrid', 'EV'];
  const SEATS         = ['2', '4', '5', '7'];

   // Function to pick image from gallery
  const pickImage = async (fieldKey = null) => {
    // Ask permission to access gallery
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission needed', 'Please grant photo library access.');
    }
    // Prevent adding more than max vehicle photos
    if (!fieldKey && images.length >= MAX_IMAGES) {
      return Alert.alert('Limit Reached', `Maximum ${MAX_IMAGES} vehicle photos allowed.`);
    }
    //open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: fieldKey ? [4, 3] : [16, 9],
      quality: 0.8,
    });
    // If user selected image
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop();
      // Create file object for upload
      const file  = { uri: asset.uri, name: `${fieldKey || 'vehicle_' + Date.now()}.${ext}`, type: `image/${ext}` };
      if (fieldKey) {
         // Save selected document image
        setDocs(prev => ({ ...prev, [fieldKey]: file }));
      } else {
         // Save selected vehicle image
        setImages(prev => [...prev, file]);
      }
    }
  };

  //remove selected vehicle image
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Validate form before submit
  const validate = () => {
    if (!form.makeAndModel.trim())   return 'Make and Model is required.';
    if (!form.licensePlate.trim())   return 'License Plate is required.';
    if (!form.pricePerDay || isNaN(form.pricePerDay) || Number(form.pricePerDay) <= 0)
      return 'Valid Price Per Day is required.';
    if (!form.year || isNaN(form.year) || Number(form.year) < 1990 || Number(form.year) > new Date().getFullYear() + 1)
      return 'Please enter a valid Year.';
    if (images.length === 0) return 'At least one vehicle photo is required.';
    if (images.length > MAX_IMAGES) return `Maximum ${MAX_IMAGES} vehicle photos allowed.`;
    // Check required documents uploaded
    const missingDocs = DOCUMENTS.filter(d => d.required && !docs[d.key]);
    if (missingDocs.length > 0)
      return `Missing required documents: ${missingDocs.map(d => d.label).join(', ')}`;
    return null;
  };

  // Submit vehicle to backend
  const handleCreate = async () => {
    const errorMsg = validate();
    if (errorMsg) return Alert.alert('Validation Error', errorMsg);

    setLoading(true);
    try {
       // Create multipart form data
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

      // Append all vehicle images
      images.forEach((img) => {
        formData.append('image', { uri: img.uri, name: img.name, type: img.type });
      });

      // Append each document
      Object.entries(docs).forEach(([key, file]) => {
        formData.append(key, { uri: file.uri, name: file.name, type: file.type });
      });

      // Send POST request to backend
      await api.post('/api/vehicles', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('🎉 Success!', 'Vehicle submitted for admin approval!', [
        { text: 'Go to My Fleet', onPress: () => navigation.goBack() }
      ]);

      setForm({
        makeAndModel: '', licensePlate: '', pricePerDay: '',
        type: 'Sedan', transmission: 'Automatic', fuelType: 'Petrol',
        seats: '5', year: new Date().getFullYear().toString(), features: ''
      });
      setImages([]);
      setDocs({});
    } catch (err) {
      // Show backend error
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
                activeOpacity={0.8}
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.greenHeader}>
          <Text style={styles.title}>List Your Vehicle</Text>
          <Text style={styles.subtitle}>Fill in details and upload required documents.</Text>
        </View>

        {/* ── Vehicle Photos ─────────────────────────────────────────── */}
        <View style={styles.photoSection}>
          <View style={styles.photoHeader}>
            <Text style={styles.sectionHeaderText}>Vehicle Photos</Text>
            <View style={styles.photoCountPill}>
              <Text style={styles.photoCountText}>{images.length}/{MAX_IMAGES}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
            {images.map((img, idx) => (
              <View key={idx} style={styles.photoThumbWrap}>
                <Image source={{ uri: img.uri }} style={styles.photoThumb} resizeMode="cover" />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => removeImage(idx)}>
                  <MaterialCommunityIcons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
                {idx === 0 && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>COVER</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.photoAddBtn} onPress={() => pickImage(null)} activeOpacity={0.8}>
                <MaterialCommunityIcons name="camera-plus-outline" size={32} color={colors.primary} />
                <Text style={styles.photoAddText}>Add Photo</Text>
                <Text style={styles.photoAddSub}>{images.length === 0 ? 'Required' : 'Optional'}</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* ── Basic Information ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Basic Information</Text>
          <Text style={styles.label}>Make and Model</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Toyota Aqua"
            value={form.makeAndModel}
            onChangeText={t => setForm({...form, makeAndModel: t})}
            placeholderTextColor={colors.textMuted}
          />
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 16}}>
              <Text style={styles.label}>License Plate</Text>
              <TextInput
                style={styles.input}
                placeholder="ABC-1234"
                autoCapitalize="characters"
                value={form.licensePlate}
                onChangeText={t => setForm({...form, licensePlate: t})}
                placeholderTextColor={colors.textMuted}
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
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* ── Specifications ─────────────────────────────────────────── */}
        <View style={[styles.card, { marginTop: 16 }]}>
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
            placeholderTextColor={colors.textMuted}
            maxLength={4}
          />
          <Text style={styles.label}>Extra Features</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Bluetooth, Sunroof, AC..."
            multiline
            numberOfLines={3}
            value={form.features}
            onChangeText={t => setForm({...form, features: t})}
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* ── Document Vault ─────────────────────────────────────────── */}
        <View style={[styles.card, { marginTop: 16 }]}>
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
                        ? <View style={styles.requiredBadge}><Text style={styles.requiredBadgeText}>REQUIRED</Text></View>
                        : <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>OPTIONAL</Text></View>
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
                      <Image source={{ uri: uploaded.uri }} style={styles.docThumb} resizeMode="cover" />
                      <Text style={styles.docChangeText}>Change</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.docUploadBtn} onPress={() => pickImage(doc.key)} activeOpacity={0.8}>
                      <Text style={styles.docUploadIcon}>⬆️</Text>
                      <Text style={styles.docUploadText}>UPLOAD</Text>
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
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.surface} />
            : <Text style={styles.btnText}>Submit for Approval 🚀</Text>
          }
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles for UI components
const getStyles = (COLORS) => StyleSheet.create({
  container:       { flexGrow: 1, backgroundColor: COLORS.background, padding: 20, paddingBottom: 60 },
  greenHeader: { backgroundColor: COLORS.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 , marginHorizontal: -20, marginTop: -20},
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle:        { color: 'rgba(255,255,255,0.7)', marginTop: 4, fontSize: 14, fontWeight: '600' },

  imagePicker:     { borderRadius: 16, overflow: 'hidden', marginBottom: 8, height: 220, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', backgroundColor: COLORS.surface },
  previewImage:    { width: '100%', height: '100%' },
  imagePlaceholder:{ flex: 1, alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderIcon: { fontSize: 44, marginBottom: 12 },
  imagePlaceholderText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  imagePlaceholderSub:  { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, fontWeight: '600' },
  changeImageBtn:  { alignItems: 'flex-start', marginBottom: 20, paddingVertical: 8 },
  changeImageText: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  // Multi-image photo strip
  photoSection:    { marginBottom: 20 },
  photoHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderText: { fontSize: 18, fontWeight: '900', color: COLORS.primary, letterSpacing: -0.2 },
  photoCountPill:  { backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  photoCountText:  { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  photoScroll:     { gap: 12, paddingVertical: 4 },
  photoThumbWrap:  { width: 130, height: 100, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, position: 'relative' },
  photoThumb:      { width: '100%', height: '100%' },
  photoRemoveBtn:  { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  primaryBadge:    { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(52,211,153,0.85)', paddingVertical: 3, alignItems: 'center' },
  primaryBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  photoAddBtn:     { width: 130, height: 100, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  photoAddText:    { color: COLORS.primary, fontWeight: '800', fontSize: 12, marginTop: 4 },
  photoAddSub:     { color: COLORS.textMuted, fontWeight: '600', fontSize: 10, marginTop: 2 },

  card:            { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.border },
  sectionHeader:   { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, letterSpacing: -0.2 },

  row:             { flexDirection: 'row', justifyContent: 'space-between' },
  label:           { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8, letterSpacing: -0.2 },
  input:           { borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius, padding: 16, fontSize: 15, color: COLORS.textPrimary, marginBottom: 20, backgroundColor: COLORS.background, fontWeight: '500' },
  textArea:        { minHeight: 100, textAlignVertical: 'top', paddingTop: 16 },
  sectionLayout:   { marginBottom: 20 },
  chipScroll:      { overflow: 'visible' },
  chipContainer:   { flexDirection: 'row', paddingVertical: 4 },
  chip:            { backgroundColor: COLORS.background, paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radiusPill, marginRight: 10, borderWidth: 1, borderColor: COLORS.border },
  chipSelected:    { backgroundColor: COLORS.primary, borderColor: COLORS.primary, ...SHADOWS.float },
  chipText:        { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },
  chipTextSelected:{ color: COLORS.surface },

  // Document Vault
  vaultHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  progressPill:    { backgroundColor: COLORS.primary + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: SIZES.radiusPill },
  progressText:    { color: COLORS.primary, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
  vaultSubtitle:   { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20, lineHeight: 20, fontWeight: '500' },

  docCard:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surfaceHighlight, borderRadius: SIZES.radius, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  docCardUploaded: { borderColor: COLORS.success + '80', backgroundColor: COLORS.success + '05' },
  docLeft:         { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 12 },
  docIcon:         { fontSize: 28, marginRight: 12, marginTop: 0 },
  docTitleRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' },
  docLabel:        { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginRight: 8 },
  requiredBadge:   { backgroundColor: COLORS.error + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.radiusPill, marginBottom: 4 },
  requiredBadgeText:{ color: COLORS.error, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  optionalBadge:   { backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 3, borderRadius: SIZES.radiusPill, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  optionalBadgeText:{ color: COLORS.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  docHint:         { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, fontWeight: '500' },
  docUploaded:     { fontSize: 12, color: COLORS.success, fontWeight: '800', marginTop: 6 },

  docRight:        { alignItems: 'center', justifyContent: 'center' },
  docThumb:        { width: 64, height: 64, borderRadius: SIZES.radius, marginBottom: 6 },
  docChangeText:   { fontSize: 11, color: COLORS.primary, fontWeight: '800', textAlign: 'center' },
  docUploadBtn:    { width: 64, height: 64, borderRadius: SIZES.radius, backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  docUploadIcon:   { fontSize: 20 },
  docUploadText:   { fontSize: 10, color: COLORS.primary, fontWeight: '900', marginTop: 4 },

  btn:             { backgroundColor: COLORS.success, borderRadius: SIZES.radius, padding: 18, alignItems: 'center', marginTop: 24, ...SHADOWS.float },
  btnDisabled:     { opacity: 0.7 },
  btnText:         { color: COLORS.surface, fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
});
