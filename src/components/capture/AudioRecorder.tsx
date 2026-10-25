import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Mic, Square, Play, Pause, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { DriftText } from '../ui/DriftText';

interface AudioRecorderProps {
  audioUri: string | null;
  audioDuration: number | null;
  onAudioRecorded: (uri: string, durationMs: number) => void;
  onAudioRemoved: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  audioUri,
  audioDuration,
  onAudioRecorded,
  onAudioRemoved,
}) => {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordDurationSec, setRecordDurationSec] = useState<number>(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(audioUri ? { uri: audioUri } : null);
  const playerStatus = useAudioPlayerStatus(player);

  const timerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission',
          'Drift needs microphone access to capture voice moments.'
        );
        return;
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordDurationSec(0);

      timerRef.current = setInterval(() => {
        setRecordDurationSec((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.warn('Failed to start recording:', error);
      Alert.alert('Recording unavailable', 'Could not access audio recording.');
    }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}

      await recorder.stop();
      const recordedUri = recorder.uri;
      const durationMs = (recorder.currentTime || recordDurationSec) * 1000;

      setIsRecording(false);

      if (recordedUri) {
        onAudioRecorded(recordedUri, Math.max(1000, durationMs));
      }
    } catch (error) {
      console.warn('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const togglePreviewPlayback = () => {
    if (!player) return;
    try {
      if (playerStatus.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (err) {
      console.warn('Preview playback error:', err);
    }
  };

  const removeAudio = () => {
    if (player && playerStatus.playing) {
      player.pause();
    }
    onAudioRemoved();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatMs = (ms?: number | null) => {
    if (!ms) return '0:00';
    return formatTime(Math.round(ms / 1000));
  };

  // Case 1: Currently recording
  if (isRecording) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceElevated, borderColor: theme.accent }]}>
        <View style={styles.recordingIndicator}>
          <Animated.View
            style={[
              styles.breathingDot,
              {
                backgroundColor: theme.accent,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <DriftText variant="bodySmall" color="accent" style={styles.recordingTimer}>
            Recording {formatTime(recordDurationSec)}
          </DriftText>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={stopRecording}
          style={[styles.stopButton, { backgroundColor: theme.rose }]}
        >
          <Square size={14} color="#FFFFFF" fill="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  // Case 2: Audio attached - Preview player
  if (audioUri) {
    const isPlaying = playerStatus.playing;
    const progress = playerStatus.duration > 0 ? playerStatus.currentTime / playerStatus.duration : 0;

    return (
      <View style={[styles.container, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={togglePreviewPlayback}
          style={[styles.playButton, { backgroundColor: theme.surface }]}
        >
          {isPlaying ? (
            <Pause size={16} color={theme.accent} />
          ) : (
            <Play size={16} color={theme.accent} fill={theme.accent} />
          )}
        </TouchableOpacity>

        <View style={styles.previewInfo}>
          <DriftText variant="caption" color="secondary">
            Voice moment • {formatMs(audioDuration || (playerStatus.duration * 1000))}
          </DriftText>
          {/* Progress bar */}
          <View style={[styles.progressBarBg, { backgroundColor: theme.borderSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.accent,
                  width: `${Math.max(4, Math.min(100, progress * 100))}%`,
                },
              ]}
            />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={removeAudio}
          style={styles.deleteButton}
        >
          <Trash2 size={16} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>
    );
  }

  // Case 3: Initial idle state - Tap to record button
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={startRecording}
      style={[
        styles.triggerPill,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <Mic size={16} color={theme.accent} />
      <Text style={[styles.triggerText, { color: theme.textSecondary }]}>
        Record voice
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  triggerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
  },
  triggerText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '500',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: DriftTokens.radius.md,
    borderWidth: 1,
    marginVertical: 6,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  breathingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  recordingTimer: {
    fontWeight: '500',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 3,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 6,
  },
});
