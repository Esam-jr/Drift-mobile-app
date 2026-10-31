import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Easing,
  AccessibilityInfo,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Tag, MapPin, ChevronRight, ChevronLeft, Check, X, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, motion } from '@/theme/tokens';
import { Category } from '@/types/moment';

interface MoreSheetProps {
  visible: boolean;
  initialMode?: 'main' | 'category';
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  onCreateCategory?: (name: string) => Promise<Category | void>;
  locationName: string | null;
  onLocationPress: () => void;
}

export const MoreSheet: React.FC<MoreSheetProps> = ({
  visible,
  initialMode = 'main',
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  locationName,
  onLocationPress,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mode, setMode] = useState<'main' | 'category'>(initialMode);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCatInputRef = useRef<TextInput>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      if (reduceMotion) {
        slideAnim.setValue(1);
      } else {
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: motion.base,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    } else {
      slideAnim.setValue(0);
      setIsCreatingCategory(false);
      setNewCategoryName('');
    }
  }, [visible, initialMode, reduceMotion]);

  const handleDismiss = (callback?: () => void) => {
    setIsCreatingCategory(false);
    setNewCategoryName('');
    if (reduceMotion) {
      slideAnim.setValue(0);
      onClose();
      callback?.();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: motion.base,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onClose();
        callback?.();
      });
    }
  };

  const handleSaveNewCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onSelectCategory(existing.id);
      setIsCreatingCategory(false);
      setNewCategoryName('');
      handleDismiss();
      return;
    }

    if (onCreateCategory) {
      const created = await onCreateCategory(trimmed);
      if (created) {
        onSelectCategory(created.id);
      }
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    handleDismiss();
  };

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [380, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        {/* Scrim backdrop */}
        <TouchableWithoutFeedback onPress={() => handleDismiss()}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity, backgroundColor: '#000000' },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sliding Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              transform: [{ translateY }],
            },
          ]}
          accessibilityRole="none"
        >
          {mode === 'main' ? (
            <>
              {/* Options Card */}
              <View
                style={[
                  styles.optionsGroup,
                  { backgroundColor: colors.bg, borderColor: colors.hairline },
                ]}
              >
                {/* Category Row */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    try {
                      Haptics.selectionAsync();
                    } catch (_) {}
                    setMode('category');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Category, currently ${selectedCategory ? selectedCategory.name : 'None'}`}
                  style={[styles.row, { borderBottomColor: colors.hairline }]}
                >
                  <Tag size={18} color={colors.text} strokeWidth={1.8} style={styles.rowIcon} />
                  <Text style={[typeTokens.ui, { color: colors.text }]}>Category</Text>

                  <View style={styles.rowRight}>
                    {selectedCategory ? (
                      <View style={styles.categoryBadge}>
                        <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                        <Text style={[typeTokens.ui, { color: colors.muted }]}>
                          {selectedCategory.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[typeTokens.ui, { color: colors.muted }]}>None</Text>
                    )}
                    <ChevronRight
                      size={16}
                      color={colors.muted}
                      strokeWidth={1.8}
                      style={{ marginLeft: spacing.xs }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Location Row */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    handleDismiss(onLocationPress);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Location, currently ${locationName || 'Add where you are right now'}`}
                  style={styles.row}
                >
                  <MapPin size={18} color={colors.text} strokeWidth={1.8} style={styles.rowIcon} />
                  <Text style={[typeTokens.ui, { color: colors.text }]}>Location</Text>

                  <View style={styles.rowRight}>
                    <Text
                      style={[
                        typeTokens.ui,
                        { color: colors.muted, maxWidth: 170 },
                      ]}
                      numberOfLines={1}
                    >
                      {locationName || 'Add where you are right now'}
                    </Text>
                    <ChevronRight
                      size={16}
                      color={colors.muted}
                      strokeWidth={1.8}
                      style={{ marginLeft: spacing.xs }}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Cancel button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDismiss()}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={[
                  styles.cancelButton,
                  { backgroundColor: colors.bg, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typeTokens.uiMedium, { color: colors.muted }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Category Sub-view Header */}
              <View style={styles.subHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsCreatingCategory(false);
                    setNewCategoryName('');
                    setMode('main');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Back to options"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.backBtn}
                >
                  <ChevronLeft size={20} color={colors.text} strokeWidth={1.8} />
                </TouchableOpacity>
                <Text style={[typeTokens.uiMedium, { color: colors.text }]}>Select category</Text>
                <View style={{ width: 28 }} />
              </View>

              {/* Category Options Card */}
              <View
                style={[
                  styles.optionsGroup,
                  { backgroundColor: colors.bg, borderColor: colors.hairline, maxHeight: 290 },
                ]}
              >
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* None option */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      try {
                        Haptics.selectionAsync();
                      } catch (_) {}
                      onSelectCategory(null);
                      handleDismiss();
                    }}
                    style={[styles.row, { borderBottomColor: colors.hairline }]}
                  >
                    <Text style={[typeTokens.ui, { color: colors.text, flex: 1 }]}>None</Text>
                    {!selectedCategoryId && (
                      <Check size={18} color={colors.accent} strokeWidth={2} />
                    )}
                  </TouchableOpacity>

                  {/* Category items */}
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          try {
                            Haptics.selectionAsync();
                          } catch (_) {}
                          onSelectCategory(cat.id);
                          handleDismiss();
                        }}
                        style={[
                          styles.row,
                          { borderBottomColor: colors.hairline },
                        ]}
                      >
                        <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                        <Text style={[typeTokens.ui, { color: colors.text, flex: 1 }]}>
                          {cat.name}
                        </Text>
                        {isSelected && (
                          <Check size={18} color={colors.accent} strokeWidth={2} />
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add Custom Category Row */}
                  {isCreatingCategory ? (
                    <View style={styles.row}>
                      <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
                      <TextInput
                        ref={newCatInputRef}
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholder="Category name"
                        placeholderTextColor={colors.muted}
                        style={[typeTokens.ui, styles.newCatInput, { color: colors.text }]}
                        autoFocus
                        maxLength={24}
                        returnKeyType="done"
                        onSubmitEditing={handleSaveNewCategory}
                      />
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleSaveNewCategory}
                        disabled={!newCategoryName.trim()}
                        style={styles.actionIconBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Confirm new category"
                      >
                        <Check
                          size={18}
                          color={newCategoryName.trim() ? colors.accent : colors.muted}
                          strokeWidth={2}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setIsCreatingCategory(false);
                          setNewCategoryName('');
                        }}
                        style={[styles.actionIconBtn, { marginLeft: spacing.xs }]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel="Cancel new category"
                      >
                        <X size={18} color={colors.muted} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        try {
                          Haptics.selectionAsync();
                        } catch (_) {}
                        setIsCreatingCategory(true);
                      }}
                      style={styles.row}
                      accessibilityRole="button"
                      accessibilityLabel="Add new category"
                    >
                      <Plus size={18} color={colors.accent} strokeWidth={2} style={styles.rowIcon} />
                      <Text style={[typeTokens.ui, { color: colors.accent, flex: 1 }]}>
                        New category
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* Close / Done button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDismiss()}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[
                  styles.cancelButton,
                  { backgroundColor: colors.bg, borderColor: colors.hairline },
                ]}
              >
                <Text style={[typeTokens.uiMedium, { color: colors.muted }]}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screen,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsGroup: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    marginRight: spacing.md,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  newCatInput: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
