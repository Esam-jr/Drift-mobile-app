import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  Image,
  Linking,
  Animated,
  AccessibilityInfo,
  Keyboard,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  X,
  Mic,
  Image as ImageLucide,
  Tag,
  MapPin,
  Square,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop, motion } from '@/theme/tokens';
import { Category, Moment } from '@/types/moment';
import {
  getCategories,
  createMoment,
  updateMoment,
  getMomentById,
} from '@/services/db/momentRepository';
import { Mote } from '@/components/Mote';
import { AudioPlayer } from '@/components/moment/AudioPlayer';

export default function CaptureScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ autoRecord?: string; editId?: string }>();

  const isEditing = !!params.editId;
  const textRef = useRef<TextInput>(null);

  // Moment form state
  const [text, setText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [originalMoment, setOriginalMoment] = useState<Moment | null>(null);

  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSec, setRecordDurationSec] = useState(0);
  const timerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  // Signature Keep Motion: drifts down 24pt, scales to 0.96, fades over ~520ms per DESIGN.md §7
  const keepAnim = useRef(new Animated.Value(0)).current;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Check reduced motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Load categories and edit data
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn('Could not load categories:', err));

    if (params.editId) {
      getMomentById(params.editId)
        .then((m) => {
          if (m) {
            setOriginalMoment(m);
            setText(m.text || '');
            setSelectedCategoryId(m.categoryId || null);
            setAudioUri(m.audioUri || null);
            setAudioDuration(m.audioDuration || null);
            setImageUris(m.images ? m.images.map((img) => img.uri) : []);
          }
        })
        .catch((err) => console.warn('Could not load moment for edit:', err));
    }
  }, [params.editId]);

  // Handle auto-record or focus text input
  useEffect(() => {
    if (params.autoRecord === '1') {
      startRecording();
    } else if (!isEditing) {
      const timer = setTimeout(() => textRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }
  }, [params.autoRecord, isEditing]);

  // Recording pulse animation: 2.4s loop per DESIGN.md §7
  useEffect(() => {
    if (isRecording && !reduceMotion) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: motion.recordingRing / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: motion.recordingRing / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, reduceMotion]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission',
          'Drift needs microphone access to record a voice moment.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      try {
        Haptics.selectionAsync();
      } catch (_) {}

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordDurationSec(0);

      timerRef.current = setInterval(() => {
        setRecordDurationSec((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Failed to start recording:', err);
    }
  };

  // Stop recording and attach voice pill
  const stopRecording = async () => {
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recorder.stop();
      const recordedUri = recorder.uri;
      const durationMs = recordDurationSec * 1000;

      setIsRecording(false);
      if (recordedUri) {
        setAudioUri(recordedUri);
        setAudioDuration(durationMs > 0 ? durationMs : 1000);
      }
    } catch (err) {
      console.warn('Failed to stop recording:', err);
      setIsRecording(false);
    }
  };

  // Cancel recording and discard current take
  const cancelRecording = async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await recorder.stop();
    } catch (_) {}
    setIsRecording(false);
    setRecordDurationSec(0);
  };

  // Pick photos from photo library
  const handlePickPhotos = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photos Access',
          'Drift needs access to your photos to add them to a moment.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => Linking.openSettings(),
            },
          ]
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map((a) => a.uri);
        setImageUris((prev) => [...prev, ...newUris]);
      }
    } catch (err) {
      console.warn('Error picking photos:', err);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLocationPress = () => {
    Alert.alert(
      'Location',
      'Drift will attach where you are right now to this moment. It never tracks you in the background.'
    );
  };

  const hasContent =
    text.trim().length > 0 || !!audioUri || imageUris.length > 0;

  // Check if anything changed from original
  const isDirty = (() => {
    if (!isEditing) return hasContent;
    if (!originalMoment) return false;
    const origImages = originalMoment.images ? originalMoment.images.map((i) => i.uri) : [];
    return (
      text.trim() !== (originalMoment.text || '').trim() ||
      selectedCategoryId !== (originalMoment.categoryId || null) ||
      audioUri !== (originalMoment.audioUri || null) ||
      JSON.stringify(imageUris) !== JSON.stringify(origImages)
    );
  })();

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const nowLabel = (() => {
    const d = originalMoment ? new Date(originalMoment.createdAt) : new Date();
    const day = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${day}, ${time}`;
  })();

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleClose = () => {
    if (isDirty) {
      Alert.alert(
        'Discard this moment?',
        undefined,
        [
          { text: 'Keep writing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  // ── Signature Keep Motion per DESIGN.md §7 ─────────────────────────
  const handleKeep = async () => {
    if (!hasContent || saving) return;

    Keyboard.dismiss();
    setSaving(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    // Motion: drifts down 24pt, scales to 0.96, fades over ~520ms (ease-out)
    const animPromise = new Promise<void>((resolve) => {
      if (reduceMotion) {
        Animated.timing(keepAnim, {
          toValue: 1,
          duration: motion.base,
          useNativeDriver: true,
        }).start(() => resolve());
      } else {
        Animated.timing(keepAnim, {
          toValue: 1,
          duration: motion.slow,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => resolve());
      }
    });

    const savePromise = (async () => {
      if (isEditing && params.editId) {
        await updateMoment({
          id: params.editId,
          text: text.trim(),
          categoryId: selectedCategoryId,
          audioUri: audioUri ?? null,
          audioDuration: audioDuration ?? null,
          imageUris: imageUris,
        });
      } else {
        await createMoment({
          text: text.trim(),
          categoryId: selectedCategoryId,
          audioUri: audioUri ?? undefined,
          audioDuration: audioDuration ?? undefined,
          imageUris: imageUris.length > 0 ? imageUris : undefined,
        });
      }
    })();

    try {
      await Promise.all([animPromise, savePromise]);
      router.back();
    } catch (err) {
      console.warn('Error saving moment:', err);
      Alert.alert('Error', 'Could not preserve moment. Please try again.');
      setSaving(false);
      keepAnim.setValue(0);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  };

  // Signature drift interpolations
  const driftY = keepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });
  const driftScale = keepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.96],
  });
  const driftOpacity = keepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // ── Recording State View ──────────────────────────────────────────
  if (isRecording) {
    return (
      <View style={[styles.root, styles.recordingRoot, { backgroundColor: colors.bg }]}>
        {/* Top bar with Cancel */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={cancelRecording}
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.cancelBtn}
          >
            <Text style={[typeTokens.ui, { color: colors.muted }]}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Center: Mote listening + timer + prompt */}
        <View style={styles.recordingCenter}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Mote state="listening" size={130} />
          </Animated.View>

          <Text
            style={[
              typeTokens.prompt,
              styles.recordingTimer,
              { color: colors.text, fontVariant: ['tabular-nums'] },
            ]}
          >
            {formatTimer(recordDurationSec)}
          </Text>

          <Text style={[typeTokens.prompt, styles.recordingPrompt, { color: colors.muted }]}>
            Say what's on your mind
          </Text>
        </View>

        {/* Bottom: Large Stop Button */}
        <View style={styles.recordingBottom}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={stopRecording}
            accessibilityLabel="Stop recording"
            style={[styles.stopButton, { backgroundColor: colors.accent }]}
          >
            <Square size={24} color={colors.onAccent} fill={colors.onAccent} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main Capture / Edit View ──────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg }]}
    >
      <Animated.View
        style={[
          styles.animatedContent,
          {
            opacity: driftOpacity,
            transform: [{ translateY: driftY }, { scale: driftScale }],
          },
        ]}
      >
        {/* Top bar: close + timestamp */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClose}
            accessibilityLabel="Close"
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.closeBtn}
          >
            <X size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={[typeTokens.meta, { color: colors.muted }]}>
            {nowLabel}
          </Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Multiline serif input */}
          <TextInput
            ref={textRef}
            multiline
            placeholder="What is drifting through your mind?"
            placeholderTextColor={colors.muted}
            value={text}
            onChangeText={setText}
            style={[
              typeTokens.prompt,
              styles.textInput,
              { color: colors.text },
            ]}
            textAlignVertical="top"
          />

          {/* Attached Voice Pill */}
          {audioUri && (
            <View style={styles.attachedMediaBlock}>
              <AudioPlayer
                uri={audioUri}
                durationMs={audioDuration}
                onRemove={() => {
                  setAudioUri(null);
                  setAudioDuration(null);
                }}
              />
            </View>
          )}

          {/* Attached Photo Thumbnails */}
          {imageUris.length > 0 && (
            <View style={styles.attachedMediaBlock}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoThumbList}
              >
                {imageUris.map((uri, idx) => (
                  <View key={`${uri}-${idx}`} style={styles.photoThumbWrapper}>
                    <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleRemovePhoto(idx)}
                      accessibilityLabel="Remove photo"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={[styles.photoRemoveBadge, { backgroundColor: colors.surface }]}
                    >
                      <X size={12} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Attached category indicator */}
          {selectedCategory && (
            <View style={styles.attachedCategory}>
              <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
              <Text style={[typeTokens.meta, { color: colors.muted }]}>
                {selectedCategory.name}
              </Text>
            </View>
          )}

          {/* Category picker */}
          {showCategories && (
            <View style={styles.categoryList}>
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => toggleCategory(cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? colors.accent + '20' : colors.surface,
                      },
                    ]}
                  >
                    <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                    <Text
                      style={[
                        typeTokens.meta,
                        { color: isSelected ? colors.accent : colors.muted },
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar + Keep button */}
        <View style={styles.bottomArea}>
          {/* Four toolbar buttons: record, photos, category, location */}
          <View style={styles.toolbar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={startRecording}
              accessibilityLabel="Record"
              style={[styles.toolBtn, { backgroundColor: colors.accent }]}
            >
              <Mic size={20} color={colors.onAccent} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handlePickPhotos}
              accessibilityLabel="Add photos"
              style={[styles.toolBtn, { backgroundColor: colors.surface }]}
            >
              <ImageLucide size={20} color={colors.muted} strokeWidth={1.8} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityLabel="Category"
              onPress={() => setShowCategories(!showCategories)}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: showCategories ? colors.accent + '20' : colors.surface,
                },
              ]}
            >
              <Tag
                size={20}
                color={showCategories ? colors.accent : colors.muted}
                strokeWidth={1.8}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLocationPress}
              accessibilityLabel="Location"
              style={[styles.toolBtn, { backgroundColor: colors.surface }]}
            >
              <MapPin size={20} color={colors.muted} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* Keep button: "Keep" or "Keep changes" */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleKeep}
            disabled={saving || !hasContent}
            style={[
              styles.keepButton,
              {
                backgroundColor: hasContent ? colors.accent : colors.surface,
              },
            ]}
          >
            <Text
              style={[
                typeTokens.uiMedium,
                {
                  color: hasContent ? colors.onAccent : colors.muted,
                },
              ]}
            >
              {isEditing ? 'Keep changes' : 'Keep'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  animatedContent: {
    flex: 1,
  },
  recordingRoot: {
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: Platform.OS === 'ios' ? spacing.huge : spacing.lg,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  recordingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  recordingTimer: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: spacing.xl,
  },
  recordingPrompt: {
    marginTop: spacing.sm,
    fontSize: 18,
    lineHeight: 24,
  },
  recordingBottom: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? spacing.huge : spacing.xl,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  textInput: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  attachedMediaBlock: {
    marginTop: spacing.md,
  },
  photoThumbList: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  photoThumbWrapper: {
    position: 'relative',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  photoRemoveBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  attachedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  bottomArea: {
    paddingHorizontal: spacing.screen,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
    paddingTop: spacing.xs,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButton: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
