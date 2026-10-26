import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Text,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Delete, Fingerprint, ScanFace } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSecurity } from '@/services/security/SecurityContext';
import { type as typeTokens, spacing, radius, motion } from '@/theme/tokens';
import { Mote } from '@/components/Mote';

export const LockScreenModal: React.FC = () => {
  const { colors } = useTheme();
  const {
    isLocked,
    unlockWithPin,
    triggerBiometrics,
    biometricsActive,
    biometricType,
    hasBiometrics,
    unlock,
  } = useSecurity();

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [moteState, setMoteState] = useState<'asleep' | 'rest'>('asleep');
  const [reduceMotion, setReduceMotion] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Check reduced motion
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Float animation: translateY 3pt over 5s loop per DESIGN.md §7
  useEffect(() => {
    if (isLocked && !reduceMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -3,
            duration: motion.float / 2,
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 3,
            duration: motion.float / 2,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      floatAnim.setValue(0);
    }
  }, [isLocked, reduceMotion]);

  // Reset state when lock screen appears
  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMsg(null);
      setMoteState('asleep');
      fadeAnim.setValue(1);

      // Auto trigger biometrics on open if enabled per DESIGN.md §6.1
      if (biometricsActive) {
        handleBiometricUnlock();
      }
    }
  }, [isLocked, biometricsActive]);

  const handleBiometricUnlock = useCallback(async () => {
    const success = await triggerBiometrics();
    if (success) {
      handleUnlockSuccess();
    }
  }, [triggerBiometrics]);

  const handleUnlockSuccess = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}

    // DESIGN.md §6.1: Mote swaps to rest for ~280ms, then fades into Home (~280ms)
    setMoteState('rest');
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: motion.base,
        useNativeDriver: true,
      }).start(() => {
        unlock();
        setPin('');
      });
    }, motion.base);
  };

  const shakeKeypad = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (val: string) => {
    if (pin.length >= 6) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const nextPin = pin + val;
    setPin(nextPin);
    setErrorMsg(null);

    // 6-digit passcode check
    if (nextPin.length === 6) {
      const success = await unlockWithPin(nextPin);
      if (success) {
        handleUnlockSuccess();
      } else {
        shakeKeypad();
        setErrorMsg("That passcode doesn't match. Try again.");
        setTimeout(() => {
          setPin('');
        }, 400);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length === 0) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  if (!isLocked) return null;

  return (
    <Modal visible={isLocked} animationType="none" transparent={false}>
      <Animated.View style={[styles.container, { backgroundColor: colors.bg, opacity: fadeAnim }]}>
        {/* Header / Mote centered */}
        <View style={styles.header}>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <Mote state={moteState} size={110} label="Mote sleeping" />
          </Animated.View>

          <Text style={[typeTokens.dayHeading, styles.title, { color: colors.text }]}>
            Welcome back
          </Text>

          <Text style={[typeTokens.meta, styles.hint, { color: colors.muted }]}>
            {errorMsg ? errorMsg : 'Enter your passcode'}
          </Text>
        </View>

        {/* Six PIN Indicators */}
        <Animated.View
          style={[
            styles.dotsRow,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled ? colors.accent : 'transparent',
                    borderColor: isFilled ? colors.accent : colors.hairline,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* 3x4 Keypad with 46pt round buttons */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((val) => (
                <TouchableOpacity
                  key={val}
                  activeOpacity={0.7}
                  onPress={() => handleKeyPress(val)}
                  accessibilityLabel={`Digit ${val}`}
                  style={[styles.key, { backgroundColor: colors.surface }]}
                >
                  <Text style={[typeTokens.ui, styles.keyText, { color: colors.text }]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom row: biometric button, 0, delete */}
          <View style={styles.keypadRow}>
            {biometricsActive && hasBiometrics ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleBiometricUnlock}
                accessibilityLabel={`Unlock with ${biometricType}`}
                style={[styles.key, { backgroundColor: colors.surface }]}
              >
                {biometricType === 'Face ID' ? (
                  <ScanFace size={20} color={colors.text} strokeWidth={1.8} />
                ) : (
                  <Fingerprint size={20} color={colors.text} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.keySpacer} />
            )}

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleKeyPress('0')}
              accessibilityLabel="Digit 0"
              style={[styles.key, { backgroundColor: colors.surface }]}
            >
              <Text style={[typeTokens.ui, styles.keyText, { color: colors.text }]}>
                0
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              accessibilityLabel="Delete digit"
              style={[styles.key, { backgroundColor: colors.surface }]}
            >
              <Delete size={20} color={colors.text} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? spacing.huge * 1.5 : spacing.huge,
    paddingBottom: Platform.OS === 'ios' ? spacing.huge * 1.2 : spacing.xxl,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.lg,
  },
  hint: {
    marginTop: spacing.xs,
    height: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  keypad: {
    width: 250,
    gap: spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  key: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keySpacer: {
    width: 46,
    height: 46,
  },
  keyText: {
    fontSize: 20,
    lineHeight: 24,
  },
});
