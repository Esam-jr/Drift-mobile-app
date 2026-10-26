import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';

interface AudioPlayerProps {
  uri: string;
  durationMs?: number | null;
  compact?: boolean;
  onRemove?: () => void;
}

const WAVEFORM_HEIGHTS = [6, 12, 18, 10, 16, 22, 14, 8, 20, 12, 16, 8, 14, 20, 10, 6];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  durationMs,
  compact = false,
  onRemove,
}) => {
  const { colors } = useTheme();
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing;
  const currentSeconds = status.currentTime || 0;
  const totalSeconds = status.duration > 0 ? status.duration : (durationMs ? durationMs / 1000 : 0);

  const togglePlayback = () => {
    if (!player) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    try {
      if (isPlaying) {
        player.pause();
      } else {
        // If at the end, restart
        if (totalSeconds > 0 && currentSeconds >= totalSeconds - 0.2) {
          player.seekTo(0);
        }
        player.play();
      }
    } catch (err) {
      console.warn('Playback toggle error:', err);
    }
  };

  const progress = totalSeconds > 0 ? Math.min(1, currentSeconds / totalSeconds) : 0;

  const formatTime = (secs: number) => {
    const total = Math.floor(secs);
    const mins = Math.floor(total / 60);
    const rem = total % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // "0:18 of 0:45" per DESIGN.md §6.6
  const timeLabel = `${formatTime(currentSeconds)} of ${formatTime(totalSeconds)}`;

  return (
    <View
      style={[
        styles.container,
        compact ? styles.compactContainer : styles.fullContainer,
        { backgroundColor: colors.surface },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={togglePlayback}
        accessibilityLabel={isPlaying ? 'Pause voice moment' : 'Play voice moment'}
        hitSlop={{ top: hitSlop / 4, bottom: hitSlop / 4, left: hitSlop / 4, right: hitSlop / 4 }}
        style={[
          styles.playButton,
          compact ? styles.playButtonCompact : styles.playButtonFull,
          { backgroundColor: colors.accent },
        ]}
      >
        {isPlaying ? (
          <Pause size={compact ? 12 : 14} color={colors.onAccent} />
        ) : (
          <Play
            size={compact ? 12 : 14}
            color={colors.onAccent}
            fill={colors.onAccent}
            style={{ marginLeft: 2 }}
          />
        )}
      </TouchableOpacity>

      {/* Waveform track */}
      <View style={styles.waveContainer}>
        <View style={styles.waveBarsRow}>
          {WAVEFORM_HEIGHTS.map((height, i) => {
            const barProgress = (i + 1) / WAVEFORM_HEIGHTS.length;
            const isFilled = progress >= barProgress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: compact ? Math.max(5, height * 0.6) : height,
                    backgroundColor: isFilled ? colors.accent : colors.muted + '40',
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <Text
        style={[
          typeTokens.meta,
          styles.timeText,
          { color: colors.muted },
        ]}
      >
        {compact ? formatTime(totalSeconds) : timeLabel}
      </Text>

      {onRemove && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRemove}
          accessibilityLabel="Remove audio"
          hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
          style={styles.removeBtn}
        >
          <X size={16} color={colors.muted} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  compactContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  fullContainer: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  playButtonFull: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  waveContainer: {
    flex: 1,
    marginHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  waveBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    marginLeft: spacing.xs,
  },
  removeBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
