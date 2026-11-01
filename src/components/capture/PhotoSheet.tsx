import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  TouchableWithoutFeedback,
  Easing,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { Camera, Image as ImageIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius, motion } from '@/theme/tokens';

interface PhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseFromLibrary: () => void;
}

export const PhotoSheet: React.FC<PhotoSheetProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onChooseFromLibrary,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [reduceMotion, setReduceMotion] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current; // 0 = closed, 1 = open

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
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
    }
  }, [visible, reduceMotion]);

  const handleDismiss = (callback?: () => void) => {
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

  if (!visible) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const backdropOpacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <View style={styles.overlay}>
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
          {/* Options Card */}
          <View
            style={[
              styles.optionsGroup,
              { backgroundColor: colors.bg, borderColor: colors.hairline },
            ]}
          >
            {/* Take photo row */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDismiss(onTakePhoto)}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
              style={[styles.row, { borderBottomColor: colors.hairline }]}
            >
              <Camera size={20} color={colors.text} strokeWidth={1.8} style={styles.rowIcon} />
              <Text style={[typeTokens.ui, { color: colors.text, flex: 1 }]}>Take photo</Text>
            </TouchableOpacity>

            {/* Choose from library row */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDismiss(onChooseFromLibrary)}
              accessibilityRole="button"
              accessibilityLabel="Choose from library"
              style={styles.row}
            >
              <ImageIcon size={20} color={colors.text} strokeWidth={1.8} style={styles.rowIcon} />
              <Text style={[typeTokens.ui, { color: colors.text, flex: 1 }]}>Choose from library</Text>
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
        </Animated.View>
      </View>
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
  cancelButton: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
