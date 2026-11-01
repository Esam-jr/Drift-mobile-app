import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Play, Mic, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, fonts } from '@/theme/tokens';
import { MomentPreview } from '@/types/moment';

interface GalleryTileProps {
  moment: MomentPreview;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const STATIC_WAVE_HEIGHTS = [6, 12, 16, 10, 14, 8, 12, 6];

/**
 * GalleryTile component per DESIGN-home.md §5:
 * - Photo tile: first photo (aspect ratio clamped 3:4 to 4:3), date chip on 55% scrim, corner icon if voice/text.
 * - Quote tile: text only, surface background, serif 17/24 up to 6 lines, small muted date.
 * - Voice tile: voice only, accent at 14% opacity, play button, waveform, duration, small date.
 */
export const GalleryTile: React.FC<GalleryTileProps> = React.memo(({
  moment,
  onPress,
  onEdit,
  onDelete,
}) => {
  const { colors } = useTheme();

  const hasPhotos = moment.photos && moment.photos.length > 0;
  const hasVoice = !!moment.voice;
  const hasText = !!moment.text && moment.text.trim().length > 0;

  const dateObj = new Date(moment.createdAt);
  const formattedDate = dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const fullDateLabel = dateObj.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const accessibilityParts = [
    `${fullDateLabel}`,
    moment.text ? moment.text : null,
    hasVoice ? `Voice note, ${Math.round((moment.voice?.durationMs || 0) / 1000)} seconds` : null,
    hasPhotos ? `${moment.photoCount} photo${moment.photoCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join('. ');

  const handlePromptDelete = () => {
    Alert.alert(
      'Delete this moment?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_) {}
            onDelete();
          },
        },
      ]
    );
  };

  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Edit', 'Delete'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) onEdit();
          else if (index === 2) handlePromptDelete();
        }
      );
    } else {
      Alert.alert('Moment', undefined, [
        { text: 'Edit', onPress: onEdit },
        { text: 'Delete', style: 'destructive', onPress: handlePromptDelete },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const formatVoiceDuration = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // ── 1. Photo Tile ─────────────────────────────────────────────────
  if (hasPhotos) {
    const firstPhoto = moment.photos[0];
    // Natural aspect ratio clamped between 3:4 (0.75) and 4:3 (1.33) per DESIGN-home.md §5
    let aspectRatio = 1;
    if (firstPhoto.width && firstPhoto.height) {
      aspectRatio = Math.max(0.75, Math.min(1.33, firstPhoto.width / firstPhoto.height));
    } else {
      // Deterministic pleasant variation based on ID for dynamic masonry
      const hash = moment.id.charCodeAt(moment.id.length - 1) % 3;
      aspectRatio = hash === 0 ? 0.8 : hash === 1 ? 1 : 1.25;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityLabel={accessibilityParts}
        accessibilityActions={[
          { name: 'activate', label: 'Open' },
          { name: 'edit', label: 'Edit' },
          { name: 'delete', label: 'Delete' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') onPress();
          else if (event.nativeEvent.actionName === 'edit') onEdit();
          else if (event.nativeEvent.actionName === 'delete') handlePromptDelete();
        }}
        style={[styles.tileBase, { aspectRatio }]}
      >
        <ExpoImage
          source={{ uri: firstPhoto.thumbUri }}
          style={styles.fullImage}
          contentFit="cover"
          transition={200}
        />

        {/* Date chip at bottom-left on 55% dark scrim per DESIGN-home.md §5 */}
        <View style={styles.photoDateScrim}>
          <Text style={[typeTokens.small, styles.photoDateText]}>
            {formattedDate}
          </Text>
        </View>

        {/* Corner indicator if moment also has voice or text */}
        {(hasVoice || hasText) && (
          <View style={styles.photoCornerScrim}>
            {hasVoice ? (
              <Mic size={12} color="#FFFFFF" strokeWidth={2} />
            ) : (
              <FileText size={12} color="#FFFFFF" strokeWidth={2} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ── 2. Voice Tile (Voice-only) ────────────────────────────────────
  if (hasVoice && !hasText) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onLongPress={handleLongPress}
        delayLongPress={350}
        accessibilityLabel={accessibilityParts}
        accessibilityActions={[
          { name: 'activate', label: 'Open' },
          { name: 'edit', label: 'Edit' },
          { name: 'delete', label: 'Delete' },
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') onPress();
          else if (event.nativeEvent.actionName === 'edit') onEdit();
          else if (event.nativeEvent.actionName === 'delete') handlePromptDelete();
        }}
        style={[
          styles.tileBase,
          styles.voiceTile,
          { backgroundColor: colors.accent + '24' }, // 14% accent opacity per DESIGN-home.md §5
        ]}
      >
        <View style={styles.voiceTopRow}>
          <View style={[styles.voicePlayBtn, { backgroundColor: colors.accent }]}>
            <Play size={10} color={colors.onAccent} fill={colors.onAccent} style={{ marginLeft: 1 }} />
          </View>
          <Text style={[typeTokens.meta, { color: colors.text }]}>
            {formatVoiceDuration(moment.voice!.durationMs)}
          </Text>
        </View>

        <View style={styles.voiceWaveRow}>
          {STATIC_WAVE_HEIGHTS.map((h, idx) => (
            <View
              key={idx}
              style={[
                styles.voiceWaveBar,
                { height: h, backgroundColor: colors.accent },
              ]}
            />
          ))}
        </View>

        <Text style={[typeTokens.small, { color: colors.muted, marginTop: spacing.md }]}>
          {formattedDate}
        </Text>
      </TouchableOpacity>
    );
  }

  // ── 3. Quote Tile (Text-only or default) ──────────────────────────
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      accessibilityLabel={accessibilityParts}
      accessibilityActions={[
        { name: 'activate', label: 'Open' },
        { name: 'edit', label: 'Edit' },
        { name: 'delete', label: 'Delete' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'activate') onPress();
        else if (event.nativeEvent.actionName === 'edit') onEdit();
        else if (event.nativeEvent.actionName === 'delete') handlePromptDelete();
      }}
      style={[
        styles.tileBase,
        styles.quoteTile,
        { backgroundColor: colors.surface },
      ]}
    >
      <Text
        style={[styles.quoteText, { color: colors.text }]}
        numberOfLines={6} // up to 6 lines per DESIGN-home.md §5
      >
        {moment.text || 'Untitled thought'}
      </Text>

      <Text style={[typeTokens.small, { color: colors.muted, marginTop: spacing.sm }]}>
        {formattedDate}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  tileBase: {
    borderRadius: radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  fullImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  photoDateScrim: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.55)', // 55% dark scrim per DESIGN-home.md §5
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  photoDateText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  photoCornerScrim: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteTile: {
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  quoteText: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24, // serif 17/24 per DESIGN-home.md §5
  },
  voiceTile: {
    padding: spacing.md,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  voiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  voicePlayBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: spacing.md,
    height: 18,
  },
  voiceWaveBar: {
    width: 3,
    borderRadius: 1.5,
    opacity: 0.8,
  },
});
