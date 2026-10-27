import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';

interface VoicePillProps {
  durationMs: number;
}

const STATIC_WAVEFORM_HEIGHTS = [4, 9, 13, 7, 15, 10, 6, 12, 8, 5];

/**
 * Shared VoicePill component per DESIGN-home.md §2:
 * "Voice: one pill (play button, small static waveform, duration).
 * Never more than one in a list row, even if the moment has several recordings."
 */
export const VoicePill: React.FC<VoicePillProps> = ({ durationMs }) => {
  const { colors } = useTheme();

  const formatDuration = (ms: number) => {
    if (!ms || ms <= 0) return '0:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.playCircle, { backgroundColor: colors.accent }]}>
        <Play
          size={10}
          color={colors.onAccent}
          fill={colors.onAccent}
          style={{ marginLeft: 1 }}
        />
      </View>

      <View style={styles.waveformRow}>
        {STATIC_WAVEFORM_HEIGHTS.map((h, i) => (
          <View
            key={i}
            style={[styles.waveBar, { height: h, backgroundColor: colors.muted }]}
          />
        ))}
      </View>

      <Text style={[typeTokens.meta, { color: colors.muted }]}>
        {formatDuration(durationMs)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  playCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 16,
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
  },
});
