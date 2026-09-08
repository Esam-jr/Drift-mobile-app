import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Clock } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { Moment } from '@/types/moment';
import { DriftText } from '../ui/DriftText';
import { CategoryBadge } from '../ui/CategoryBadge';
import { AudioPlayer } from './AudioPlayer';

interface MomentCardProps {
  moment: Moment;
}

export const MomentCard: React.FC<MomentCardProps> = ({ moment }) => {
  const { theme } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: '/moment/[id]',
      params: { id: moment.id },
    });
  };

  const formattedTime = new Date(moment.createdAt).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  const hasText = !!moment.text && moment.text.trim().length > 0;
  const hasAudio = !!moment.audioUri;
  const hasImages = moment.images && moment.images.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handlePress}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      {/* Top Meta: Category & Timestamp */}
      <View style={styles.headerRow}>
        <View style={styles.leftMeta}>
          {moment.category && <CategoryBadge category={moment.category} size="sm" />}
          {moment.locationName && (
            <View style={styles.locationContainer}>
              <MapPin size={11} color={theme.textTertiary} />
              <DriftText variant="caption" color="tertiary" style={styles.locationText}>
                {moment.locationName}
              </DriftText>
            </View>
          )}
        </View>
        <DriftText variant="caption" color="tertiary">
          {formattedTime}
        </DriftText>
      </View>

      {/* Title if present */}
      {moment.title ? (
        <DriftText variant="headline" color="primary" style={styles.title}>
          {moment.title}
        </DriftText>
      ) : null}

      {/* Main Text Content */}
      {hasText && (
        <DriftText
          variant={hasImages || hasAudio ? 'body' : 'headline'}
          color="primary"
          numberOfLines={hasImages ? 3 : 6}
          style={[styles.bodyText, !hasImages && !hasAudio && styles.editorialText]}
        >
          {moment.text}
        </DriftText>
      )}

      {/* Inline Audio Player */}
      {hasAudio && moment.audioUri && (
        <View style={styles.audioWrapper}>
          <AudioPlayer uri={moment.audioUri} durationMs={moment.audioDuration} compact />
        </View>
      )}

      {/* Image Gallery Preview */}
      {hasImages && (
        <View style={styles.imagesContainer}>
          {moment.images.length === 1 ? (
            <Image
              source={{ uri: moment.images[0].uri }}
              style={styles.singleImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageGrid}>
              {moment.images.slice(0, 3).map((img, idx) => (
                <Image
                  key={img.id}
                  source={{ uri: img.uri }}
                  style={[
                    styles.gridImage,
                    idx === 0 && moment.images.length === 3 ? styles.featuredGridImage : null,
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: DriftTokens.radius.lg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leftMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  locationText: {
    marginLeft: 3,
  },
  title: {
    marginBottom: 6,
  },
  bodyText: {
    lineHeight: 22,
  },
  editorialText: {
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  audioWrapper: {
    marginTop: 8,
  },
  imagesContainer: {
    marginTop: 12,
    borderRadius: DriftTokens.radius.md,
    overflow: 'hidden',
  },
  singleImage: {
    width: '100%',
    height: 190,
    borderRadius: DriftTokens.radius.md,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gridImage: {
    flex: 1,
    height: 110,
    borderRadius: DriftTokens.radius.sm,
    minWidth: '30%',
  },
  featuredGridImage: {
    width: '100%',
    minWidth: '100%',
    height: 140,
  },
});
