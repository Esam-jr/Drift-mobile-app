import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { type as typeTokens, radius } from '@/theme/tokens';

interface ThumbnailRowProps {
  photos: { thumbUri: string; width?: number; height?: number }[];
  photoCount: number;
}

/**
 * Shared ThumbnailRow component per DESIGN-home.md §2 & §3:
 * "Photos: up to 3 thumbnails, with '+N' over the third if there are more."
 * "Thumbnails: about 64 x 56pt, radius.md, 6pt gap."
 */
export const ThumbnailRow: React.FC<ThumbnailRowProps> = ({ photos, photoCount }) => {
  if (!photos || photos.length === 0) return null;

  const displayPhotos = photos.slice(0, 3);
  const remainingCount = photoCount - 2; // e.g. if 5 photos: 1st, 2nd, and 3rd shows "+3"

  return (
    <View style={styles.container}>
      {displayPhotos.map((photo, index) => {
        const isThird = index === 2;
        const showBadge = isThird && remainingCount > 0;

        return (
          <View key={`${photo.thumbUri}-${index}`} style={styles.thumbWrapper}>
            <Image
              source={{ uri: photo.thumbUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            {showBadge && (
              <View style={styles.badgeOverlay}>
                <Text style={[typeTokens.uiMedium, styles.badgeText]}>
                  +{remainingCount}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  thumbWrapper: {
    width: 64,
    height: 56,
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: 64,
    height: 56,
  },
  badgeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});
