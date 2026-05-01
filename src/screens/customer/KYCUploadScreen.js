import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Image, ActivityIndicator, Platform, StatusBar
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SIZES, SHADOWS } from '../../theme/theme';

export default function KYCUploadScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
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
      mediaTypes: ['images'],
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isOptional && <Text style={styles.optionalBadge}>Optional</Text>}
            {isLocked && <Text style={{ fontSize: 16 }}>🔒</Text>}
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.uploadArea, isLocked && { borderStyle: 'solid', borderColor: colors.border }]} 
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
        <View style={[styles.statusBanner, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
          <Text style={[styles.statusBannerTitle, { color: colors.success }]}>Identity Verified</Text>
          <Text style={[styles.statusBannerText, { color: colors.success }]}>Your documents have been approved. You are fully authorized to book vehicles freely.</Text>
        </View>
      );
    }
    if (status === 'pending') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
          <Text style={[styles.statusBannerTitle, { color: colors.warning }]}>Pending Admin Review</Text>
          <Text style={[styles.statusBannerText, { color: colors.warning }]}>Your documents are securely locked and are currently being reviewed. Please check back later.</Text>
        </View>
      );
    }
    if (status === 'rejected') {
      return (
        <View style={[styles.statusBanner, { backgroundColor: colors.error + '15', borderColor: colors.error + '40' }]}>
          <Text style={[styles.statusBannerTitle, { color: colors.error }]}>Documents Rejected</Text>
          <Text style={[styles.statusBannerText, { color: colors.error }]}>Your previous submission was rejected. Please ensure photos are clear, glare-free, and re-upload them below.</Text>
        </View>
      );
    }

    // Default Unverified subtitle replaces banner
    return <Text style={styles.headerSubtitle}>Before booking your first vehicle, we require a quick verification of your identity to ensure safety for everyone.</Text>;
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.headerGradientStart} />
      <View style={styles.greenHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 16, padding: 4}} hitSlop={{top:10, bottom:10, left:10, right:10}}>
             <Text style={styles.backBtn}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Identity Center</Text>
        </View>
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
            activeOpacity={0.8}
          >
            {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.submitBtnText}>{isRejected ? 'Re-Submit Documents' : 'Submit Documents'}</Text>}
          </TouchableOpacity>
        )}
        <Text style={styles.securityNote}>🔒 Your documents are safely stored and encrypted.</Text>
      </ScrollView>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
  screen:             { flex: 1, backgroundColor: C.background },
  greenHeader:     { backgroundColor: C.headerGradientStart, paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, marginBottom: 16 },
  headerTop:          { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn:            { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerTitle:        { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  headerSubtitle:     { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 20, fontWeight: '500' },
  
  statusBanner:       { padding: 16, borderRadius: SIZES.radius, borderWidth: 1, marginTop: 4 },
  statusBannerTitle:  { fontSize: 15, fontWeight: '800', marginBottom: 6, letterSpacing: -0.2 },
  statusBannerText:   { fontSize: 13, lineHeight: 20, fontWeight: '600' },

  scrollArea:         { padding: 20, paddingBottom: 60 },
  
  uploadCard:         { backgroundColor: C.surface, borderRadius: SIZES.radius, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: C.border, ...SHADOWS.card },
  uploadCardLocked:   { opacity: 0.95, backgroundColor: C.background },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:          { fontSize: 14, fontWeight: '800', color: C.textPrimary, letterSpacing: -0.2 },
  optionalBadge:      { backgroundColor: C.surfaceHighlight, color: C.primary, fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: SIZES.radiusPill, fontWeight: '700', textTransform: 'uppercase' },
  
  uploadArea:         { height: 160, backgroundColor: C.background, borderRadius: SIZES.radius, borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', overflow: 'hidden' },
  placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderIcon:    { fontSize: 36, marginBottom: 12 },
  placeholderText:    { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  previewImage:       { width: '100%', height: '100%', resizeMode: 'cover' },
  
  submitBtn:          { backgroundColor: C.primary, borderRadius: SIZES.radius, paddingVertical: 18, alignItems: 'center', marginTop: 12, ...SHADOWS.float },
  btnDisabled:        { opacity: 0.7 },
  submitBtnText:      { color: '#FFFFFF', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  securityNote:       { color: C.textMuted, textAlign: 'center', marginTop: 24, fontSize: 13, fontWeight: '600' }
});
