import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { Category } from '@/types/moment';
import { getCategories, createMoment } from '@/services/db/momentRepository';
import { DriftText } from '@/components/ui/DriftText';
import { AudioRecorder } from '@/components/capture/AudioRecorder';
import { ImagePickerButton } from '@/components/capture/ImagePickerButton';

export default function CaptureScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const [text, setText] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn('Could not load categories:', err));
  }, []);

  const handleClose = () => {
    if (text.trim().length > 0 || audioUri || imageUris.length > 0) {
      Alert.alert(
        'Discard thought?',
        'Are you sure you want to discard what you started capturing?',
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

  const handleSave = async () => {
    // Check if there is anything to capture
    const hasText = text.trim().length > 0;
    const hasAudio = !!audioUri;
    const hasImages = imageUris.length > 0;

    if (!hasText && !hasAudio && !hasImages) {
      Alert.alert('Empty moment', 'Capture a thought, record your voice, or attach a photo before saving.');
      return;
    }

    setSaving(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      await createMoment({
        text: hasText ? text.trim() : undefined,
        categoryId: selectedCategoryId,
        audioUri: audioUri || undefined,
        audioDuration: audioDuration || undefined,
        imageUris: hasImages ? imageUris : undefined,
      });

      router.back();
    } catch (err) {
      console.warn('Error saving moment:', err);
      Alert.alert('Error', 'Could not preserve moment. Please try again.');
      setSaving(false);
    }
  };

  const handleAudioRecorded = (uri: string, durationMs: number) => {
    setAudioUri(uri);
    setAudioDuration(durationMs);
  };

  const handleAudioRemoved = () => {
    setAudioUri(null);
    setAudioDuration(null);
  };

  const handleImagesSelected = (newUris: string[]) => {
    setImageUris((prev) => [...prev, ...newUris]);
  };

  const handleImageRemoved = (index: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== index));
  };

  const hasContent = text.trim().length > 0 || !!audioUri || imageUris.length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}
    >
      <View style={[styles.sheetContainer, { backgroundColor: theme.surface }]}>
        {/* Top Handle / Bar */}
        <View style={styles.topHandleBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClose}
            style={styles.iconCircle}
          >
            <X size={20} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.sheetHandle}>
            <View style={[styles.handleIndicator, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleSave}
            disabled={saving || !hasContent}
            style={[
              styles.saveButton,
              {
                backgroundColor: hasContent ? theme.accent : theme.surfaceElevated,
                opacity: hasContent ? 1 : 0.4,
              },
            ]}
          >
            <Check size={18} color={hasContent ? '#0B0D11' : theme.textTertiary} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Poetic Prompt */}
          <DriftText variant="headline" color="primary" style={styles.prompt}>
            What is drifting through your mind?
          </DriftText>

          {/* Auto-growing Text Input */}
          <TextInput
            multiline
            autoFocus
            placeholder="Write a thought, a memory, or an idea..."
            placeholderTextColor={theme.textTertiary}
            value={text}
            onChangeText={setText}
            style={[
              styles.textInput,
              {
                color: theme.textPrimary,
              },
            ]}
            textAlignVertical="top"
          />

          {/* Voice Memo Recording Section */}
          <View style={styles.mediaSection}>
            <AudioRecorder
              audioUri={audioUri}
              audioDuration={audioDuration}
              onAudioRecorded={handleAudioRecorded}
              onAudioRemoved={handleAudioRemoved}
            />
          </View>

          {/* Image Picker Section */}
          <View style={styles.mediaSection}>
            <ImagePickerButton
              imageUris={imageUris}
              onImagesSelected={handleImagesSelected}
              onImageRemoved={handleImageRemoved}
            />
          </View>

          {/* Category Selection */}
          <View style={styles.categorySection}>
            <DriftText variant="caption" color="tertiary" style={styles.categoryHeading}>
              CATEGORY
            </DriftText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedCategoryId(isSelected ? null : cat.id)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? `${cat.color}25` : theme.surfaceElevated,
                        borderColor: isSelected ? cat.color : theme.borderSubtle,
                      },
                    ]}
                  >
                    <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                    <DriftText
                      variant="caption"
                      style={{
                        color: isSelected ? cat.color : theme.textSecondary,
                        fontWeight: isSelected ? '600' : '400',
                      }}
                    >
                      {cat.name}
                    </DriftText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: DriftTokens.radius.xl,
    borderTopRightRadius: DriftTokens.radius.xl,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  topHandleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sheetHandle: {
    flex: 1,
    alignItems: 'center',
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  prompt: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.3,
    marginTop: 6,
    marginBottom: 14,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 240,
    padding: 0,
    marginBottom: 16,
  },
  mediaSection: {
    marginBottom: 12,
  },
  categorySection: {
    marginTop: 10,
  },
  categoryHeading: {
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  categoryList: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: DriftTokens.radius.full,
    borderWidth: 1,
  },
  catDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
});
