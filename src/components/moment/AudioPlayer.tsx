import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Play, Pause } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { DriftText } from '../ui/DriftText';

interface AudioPlayerProps {
  uri: string;
  durationMs?: number | null;
  compact?: boolean;
}

const WAVEFORM_HEIGHTS = [8, 14, 20, 12, 18, 24, 16, 10, 22, 14, 18, 10, 16, 22, 12, 8];

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  uri,
  durationMs,
  compact = false,
}) => {
  const { theme } = useTheme();
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
        player.play();
      }
    } catch (err) {
      console.warn('Playback toggle error:', err);
    }
  };

  const progress = totalSeconds > 0 ? currentSeconds / totalSeconds : 0;

  const formatTime = (secs: number) => {
    const total = Math.floor(secs);
    const mins = Math.floor(total / 60);
    const rem = total % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.borderSubtle,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={togglePlayback}
        style={[
          styles.playButton,
          {
            backgroundColor: theme.accent,
          },
        ]}
      >
        {isPlaying ? (
          <Pause size={14} color="#0B0D11" />
        ) : (
          <Play size={14} color="#0B0D11" fill="#0B0D11" style={{ marginLeft: 2 }} />
        )}
      </TouchableOpacity>

      {/* Simulated Waveform / Progress Bar */}
      <View style={styles.waveContainer}>
        <View style={styles.waveBarsRow}>
          {WAVEFORM_HEIGHTS.map((height, i) => {
            const barProgress = i / WAVEFORM_HEIGHTS.length;
            const isFilled = progress >= barProgress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: compact ? Math.max(6, height * 0.7) : height,
                    backgroundColor: isFilled ? theme.accent : theme.border,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>

      <DriftText variant="caption" color="secondary" style={styles.timer}>
        {isPlaying ? formatTime(currentSeconds) : formatTime(totalSeconds)}
      </DriftText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: DriftTokens.radius.md,
    borderWidth: 1,
    marginVertical: 4,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  waveBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  timer: {
    fontVariant: ['tabular-nums'],
    minWidth: 32,
    textAlign: 'right',
  },
});
