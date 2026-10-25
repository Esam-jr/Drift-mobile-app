import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';
import { Moment } from '@/types/moment';

/**
 * A single moment entry on the Home timeline.
 * DESIGN.md §6.3: not a card. Text-only = serif on page bg, no border.
 * Moments separated by space, not borders or cards.
 */
interface Props {
  moment: Moment;
}

const WAVEFORM_HEIGHTS = [6, 11, 16, 9, 14, 18, 12, 7, 15, 10, 14, 8];

export function MomentRow({ moment }: Props) {
  const { colors } = useTheme();
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

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '0:00';
    const total = Math.floor(ms / 1000);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={styles.container}
    >
      {/* Metadata: time + glow dot + category */}
      <View style={styles.metaRow}>
        <Text style={[typeTokens.meta, { color: colors.muted }]}>
          {formattedTime}
        </Text>
        {moment.category && (
          <View style={styles.categoryMeta}>
            <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
            <Text style={[typeTokens.meta, { color: colors.muted }]}>
              {moment.category.name}
            </Text>
          </View>
        )}
      </View>

      {/* Text content — serif on page bg, clamped to 3 lines */}
      {hasText && (
        <Text
          numberOfLines={3}
          style={[typeTokens.momentBody, { color: colors.text, marginTop: spacing.xs }]}
        >
          {moment.text}
        </Text>
      )}

      {/* Voice pill */}
      {hasAudio && (
        <View style={[styles.voicePill, { backgroundColor: colors.surface }]}>
          <View style={[styles.playCircle, { backgroundColor: colors.accent }]}>
            <Play size={10} color={colors.onAccent} fill={colors.onAccent} style={{ marginLeft: 1 }} />
          </View>
          <View style={styles.waveformRow}>
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <View
                key={i}
                style={[styles.waveBar, { height: h, backgroundColor: colors.muted }]}
              />
            ))}
          </View>
          <Text style={[typeTokens.meta, { color: colors.muted }]}>
            {formatDuration(moment.audioDuration)}
          </Text>
        </View>
      )}

      {/* Photo thumbnails */}
      {hasImages && (
        <View style={styles.photoRow}>
          {moment.images.slice(0, 3).map((img) => (
            <Image
              key={img.id}
              source={{ uri: img.uri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  voicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  playCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    gap: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  photoRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
});
