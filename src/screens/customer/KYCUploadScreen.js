import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Image, ActivityIndicator, SafeAreaView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../../api/api';
import { useAuth } from '../../context/AuthContext';

const PRIMARY = '#1E3A8A';

export default function KYCUploadScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Initialize state with backend images if they exist
  const [images, setImages] = useState({
    dlFront: user?.identity?.dlFront ? `${BASE_URL}${user.identity.dlFront}` : null,
    dlBack:  user?.identity?.dlBack  ? `${BASE_URL}${user.identity.dlBack}`  : null,
    nic:     user?.identity?.nic     ? `${BASE_URL}${user.identity.nic}`     : null,
    selfie:  user?.identity?.selfie  ? `${BASE_URL}${user.identity.selfie}`  : null
  });

  const status = user?.identity?.status || 'unverified';
  const isLocked = status === 'pending' || status === 'verified';
  const isRejected = status === 'rejected';

  const pickImage = async (field) => {
    if (isLocked) {
      return Alert.alert('Locked', 'Your documents are currently locked and cannot be changed.');
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImages(prev => ({ ...prev, [field]: result.assets[0].uri }));
    }
  };

  const submitKYC = async () => {
    if (isLocked) return;

    if (!images.dlFront || !images.dlBack || !images.nic) {
      return Alert.alert('Missing Documents', 'Please upload your Driving License (Front/Back) and NIC/Passport to proceed.');
    }

    setLoading(true);
    try {
      const formData = new FormData();

      Object.keys(images).forEach(key => {
        if (images[key] && !images[key].startsWith(BASE_URL)) {
          // Only append new local local images, not identical backend URLs
          const uri = images[key];
          const filename = uri.split('/').pop() || `${key}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : `image/jpeg`;

          formData.append(key, {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            name: filename,
            type
          });
        }
      });

      await api.post('/api/users/kyc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshUser();

      Alert.alert(
        'Submission Successful',
        'Your documents have been submitted and are pending Admin approval.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Upload Failed', err.response?.data?.message || 'We could not submit your documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderUploadBox = (field, label, icon, isOptional = false) => {
    const hasImage = !!images[field];

    return (
      <View style={[styles.uploadCard, isLocked && styles.uploadCardLocked]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isOptional && <Text style={styles.optionalBadge}>Optional</Text>}
            {isLocked && <Text style={{ fontSize: 16 }}>🔒</Text>}
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.uploadArea, isLocked && { borderStyle: 'solid', borderColor: '#CBD5E1' }]} 
          onPress={() => pickImage(field)}
          activeOpacity={isLocked ? 1 : 0.7}
        >
          {hasImage ? (
            <Image source={{ uri: images[field] }} style={styles.previewImage} />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderIcon}>{icon}</Text>
              <Text style={styles.placeholderText}>Tap to Upload</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStatusBanner = () => {
    if (status === 'verified') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
          <Text style={[styles.statusBannerTitle, { color: '#16A34A' }]}>✅ Identity Verified</Text>
          <Text style={[styles.statusBannerText, { color: '#15803D' }]}>Your documents have been approved. You are fully authorized to book vehicles freely.</Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FEF9C3', borderColor: '#FEF08A' }]}>
          <Text style={[styles.statusBannerTitle, { color: '#CA8A04' }]}>⏳ Pending Admin Review</Text>
          <Text style={[styles.statusBannerText, { color: '#A16207' }]}>Your documents are securely locked and are currently being reviewed. Please check back later.</Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
          <Text style={[styles.statusBannerTitle, { color: '#DC2626' }]}>❌ Documents Rejected</Text>
          <Text style={[styles.statusBannerText, { color: '#B91C1C' }]}>Your previous submission was rejected. Please ensure photos are clear, glare-free, and re-upload them below.</Text>
        </View>
      );
    }

    // Default Unverified subtitle replaces banner
    return <Text style={styles.headerSubtitle}>Before booking your first vehicle, we require a quick verification of your identity to ensure safety for everyone.</Text>;
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Identity Center</Text>
        {renderStatusBanner()}
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea}>
        {renderUploadBox('dlFront', 'Driving License (Front)', '🪪')}
        {renderUploadBox('dlBack',  'Driving License (Back)',  '🪪')}
        {renderUploadBox('nic',     'NIC / Passport',          '🛂')}
        {renderUploadBox('selfie',  'Selfie with ID',          '🤳', true)}

        {!isLocked && (
          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.btnDisabled]} 
            onPress={submitKYC}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Submit Documents' : 'Submit Documents'}</Text>}
          </TouchableOpacity>
        )}
        <Text style={styles.securityNote}>🔒 Your documents are safely stored and encrypted.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: '#F8FAFC' },
  header:             { padding: 24, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E2E8F0' },
  headerTitle:        { fontSize: 24, fontWeight: '800', color: PRIMARY, marginBottom: 12 },
  headerSubtitle:     { color: '#64748B', fontSize: 14, lineHeight: 20 },
  
  statusBanner:       { padding: 16, borderRadius: 12, borderWidth: 1 },
  statusBannerTitle:  { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  statusBannerText:   { fontSize: 13, lineHeight: 18, fontWeight: '500' },

  scrollArea:         { padding: 20, paddingBottom: 60 },
  
  uploadCard:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  uploadCardLocked:   { opacity: 0.9, backgroundColor: '#F8FAFC' },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:          { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  optionalBadge:      { backgroundColor: '#EFF6FF', color: '#3B82F6', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, fontWeight: '600' },
  
  uploadArea:         { height: 160, backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', overflow: 'hidden' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon:    { fontSize: 32, marginBottom: 8 },
  placeholderText:    { color: '#64748B', fontWeight: '500' },
  previewImage:       { width: '100%', height: '100%', resizeMode: 'cover' },
  
  submitBtn:          { backgroundColor: PRIMARY, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 12 },
  btnDisabled:        { opacity: 0.7 },
  submitBtnText:      { color: '#fff', fontWeight: '700', fontSize: 17 },
  securityNote:       { color: '#94A3B8', textAlign: 'center', marginTop: 16, fontSize: 12 }
});
