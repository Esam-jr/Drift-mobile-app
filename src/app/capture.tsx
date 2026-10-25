import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, Mic, ImageIcon, Tag, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';
import { Category } from '@/types/moment';
import { getCategories, createMoment } from '@/services/db/momentRepository';

export default function CaptureScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ autoRecord?: string }>();

  const textRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => console.warn('Could not load categories:', err));
  }, []);

  // Auto-focus the text input
  useEffect(() => {
    const timer = setTimeout(() => textRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const hasContent = text.trim().length > 0;

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const nowLabel = (() => {
    const d = new Date();
    const day = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return `${day}, ${time}`;
  })();

  const handleClose = () => {
    if (hasContent) {
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

  const handleKeep = async () => {
    if (!hasContent) return;

    setSaving(true);
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}

      await createMoment({
        text: text.trim(),
        categoryId: selectedCategoryId,
      });

      router.back();
    } catch (err) {
      console.warn('Error saving moment:', err);
      Alert.alert('Error', 'Could not preserve moment. Please try again.');
      setSaving(false);
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryId((prev) => (prev === id ? null : id));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.bg }]}
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
        {/* Four toolbar buttons */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Record"
            style={[styles.toolBtn, { backgroundColor: colors.accent }]}
          >
            <Mic size={20} color={colors.onAccent} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Add photos"
            style={[styles.toolBtn, { backgroundColor: colors.surface }]}
          >
            <ImageIcon size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Category"
            onPress={() => setShowCategories(!showCategories)}
            style={[styles.toolBtn, { backgroundColor: colors.surface }]}
          >
            <Tag size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityLabel="Location"
            style={[styles.toolBtn, { backgroundColor: colors.surface }]}
          >
            <MapPin size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Keep button */}
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
            Keep
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingTop: Platform.OS === 'ios' ? 56 : spacing.lg,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  textInput: {
    minHeight: 160,
    padding: 0,
    marginTop: spacing.sm,
  },
  attachedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
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
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
  },
  bottomArea: {
    paddingHorizontal: spacing.screen,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  toolBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepButton: {
    height: 50,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
