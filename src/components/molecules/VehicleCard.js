// VehicleCard.js - Vehicle card component with image, rating, and price

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius, shadows } from '../theme';
import Badge from '../atoms/Badge';

/**
 * VehicleCard Component
 * 
 * @param {object} vehicle - Vehicle data { name, type, rating, reviews, price, image, isFavorited }
 * @param {function} onPress - Press handler
 * @param {function} onFavorite - Favorite toggle handler
 * @param {boolean} isFavorited - Is vehicle favorited
 * @param {object} style - Additional styles
 */
const VehicleCard = ({
  vehicle = {},
  onPress = null,
  onFavorite = null,
  isFavorited = false,
  style = {},
  testID = 'vehicle-card',
}) => {
  const { colors: themeColors, isDarkMode } = useTheme();

  const {
    name = 'Vehicle Name',
    type = 'SUV',
    rating = 4.5,
    reviews = 0,
    pricePerDay = 0,
    image = null,
    seats = 5,
    transmission = 'Auto',
    fuelType = 'Petrol',
  } = vehicle;

  const styles = StyleSheet.create({
    container: {
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
      backgroundColor: themeColors.background.main,
      ...shadows.md,
    },
    imageContainer: {
      height: 200,
      width: '100%',
      backgroundColor: themeColors.background.surface,
      position: 'relative',
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    imageBadge: {
      position: 'absolute',
      bottom: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
    },
    favoriteButton: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    titleColumn: {
      flex: 1,
    },
    title: {
      ...typography.h4,
      color: themeColors.text.primary,
      marginBottom: spacing.xs,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rating: {
      ...typography.bodySmall,
      color: themeColors.text.secondary,
      marginLeft: spacing.xs,
    },
    reviewCount: {
      ...typography.caption,
      color: themeColors.text.tertiary,
      marginLeft: spacing.xs,
    },
    price: {
      ...typography.h4,
      color: themeColors.primary.main,
      fontWeight: '700',
    },
    priceLabel: {
      ...typography.caption,
      color: themeColors.text.secondary,
      marginTop: spacing.xs,
    },
    specsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: themeColors.border.light,
    },
    specItem: {
      alignItems: 'center',
    },
    specIcon: {
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    specLabel: {
      ...typography.caption,
      color: themeColors.text.secondary,
      textAlign: 'center',
    },
    specValue: {
      ...typography.bodySmall,
      color: themeColors.text.primary,
      fontWeight: '600',
      marginTop: 2,
      textAlign: 'center',
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.9}
      testID={testID}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${name} - ${pricePerDay} per day`}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        {image ? (
          <ImageBackground source={{ uri: image }} style={styles.image}>
            <View style={styles.overlay} />
          </ImageBackground>
        ) : (
          <View style={[styles.image, { backgroundColor: themeColors.background.surface }]} />
        )}

        {/* Type Badge */}
        <View style={styles.imageBadge}>
          <Badge label={type} variant="primary" size="small" />
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => onFavorite && onFavorite(!isFavorited)}
          testID="vehicle-favorite-button"
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <MaterialCommunityIcons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavorited ? themeColors.semantic.danger : themeColors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Content Section */}
      <View style={styles.content}>
        {/* Title and Price Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.ratingRow}>
              <MaterialCommunityIcons
                name="star"
                size={16}
                color={themeColors.semantic.warning}
              />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({reviews})</Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.price}>
              {pricePerDay.toLocaleString()}
            </Text>
            <Text style={styles.priceLabel}>per day</Text>
          </View>
        </View>

        {/* Specs Grid */}
        <View style={styles.specsGrid}>
          <View style={styles.specItem}>
            <View style={styles.specIcon}>
              <MaterialCommunityIcons
                name="seat-individual"
                size={18}
                color={themeColors.text.secondary}
              />
            </View>
            <Text style={styles.specLabel}>Seats</Text>
            <Text style={styles.specValue}>{seats}</Text>
          </View>

          <View style={styles.specItem}>
            <View style={styles.specIcon}>
              <MaterialCommunityIcons
                name="transmission-box"
                size={18}
                color={themeColors.text.secondary}
              />
            </View>
            <Text style={styles.specLabel}>Transmission</Text>
            <Text style={styles.specValue}>{transmission}</Text>
          </View>

          <View style={styles.specItem}>
            <View style={styles.specIcon}>
              <MaterialCommunityIcons
                name="fuel"
                size={18}
                color={themeColors.text.secondary}
              />
            </View>
            <Text style={styles.specLabel}>Fuel</Text>
            <Text style={styles.specValue}>{fuelType}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default VehicleCard;
