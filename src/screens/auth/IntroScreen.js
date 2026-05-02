import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function IntroScreen({ navigation }) {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={[colors.headerGradientStart, colors.background]}
      style={styles.container}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />

      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="search" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="menu" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.contentContainer}>
          {/* Logo Section - Made Larger for Visibility */}
          <View style={styles.logoContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.iconCircleBg }]}>
              <MaterialCommunityIcons name="car-sports" size={80} color={colors.primary} />
            </View>
            <Text style={[styles.logoTitle, { color: colors.primary }]}>DRIVE EASE</Text>
            <Text style={[styles.logoSubtitle, { color: colors.primaryDark }]}>RENT A CAR</Text>
          </View>

          {/* Welcome Text Section (No Glass Blur Needed) */}
          <View style={styles.welcomeContainer}>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Welcome to</Text>
            <Text style={[styles.brandNameText, { color: colors.textPrimary }]}>DriveEase</Text>
            <Text style={[styles.taglineText, { color: colors.textPrimary }]}>Your Perfect Ride Awaits.</Text>
          </View>
        </View>

        {/* Bottom Action Area */}
        <View style={styles.actionContainer}>
          {/* Split Buttons */}
          <View style={styles.splitButtonRow}>
            <TouchableOpacity style={styles.flexHalf} onPress={() => navigation.navigate('Login')} activeOpacity={0.8}>
              <View style={[styles.halfWidthButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}>
                <Text style={[styles.buttonText, { color: colors.primary }]}>SIGN IN</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.flexHalf} onPress={() => navigation.navigate('Register')} activeOpacity={0.8}>
              <View style={[styles.halfWidthButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.buttonText, { color: colors.textOnPrimary }]}>REGISTER</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: 20, 
  },
  
  /* ── TOP BAR ── */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconButton: {
    padding: 8,
  },

  /* ── CONTENT CONTAINER ── */
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  /* ── LOGO SECTION ── */
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoTitle: {
    fontSize: 36, // Increased size
    fontWeight: '800',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 14, // Increased size
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 4,
  },

  /* ── WELCOME TEXT ── */
  welcomeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 4,
  },
  brandNameText: {
    fontSize: 48, // Increased size
    fontWeight: '800',
    marginBottom: 12,
  },
  taglineText: {
    fontSize: 18,
    fontWeight: '600',
  },

  /* ── ACTION AREA ── */
  actionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16, 
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  splitButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  flexHalf: {
    flex: 1,
  },
  halfWidthButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 30, // Pill shape
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});
