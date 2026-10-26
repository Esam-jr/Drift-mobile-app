import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Text,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Delete, X } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSecurity } from '@/services/security/SecurityContext';
import { type as typeTokens, spacing, radius, hitSlop } from '@/theme/tokens';
import { Mote } from '@/components/Mote';

export const CreatePasscodeModal: React.FC = () => {
  const { colors } = useTheme();
  const {
    isSettingUpPasscode,
    cancelPasscodeSetup,
    completePasscodeSetup,
    hasBiometrics,
    biometricType,
  } = useSecurity();

  const [step, setStep] = useState<'create' | 'confirm' | 'biometrics'>('create');
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Reset state when opening
  useEffect(() => {
    if (isSettingUpPasscode) {
      setStep('create');
      setFirstPin('');
      setConfirmPin('');
      setErrorMsg(null);
    }
  }, [isSettingUpPasscode]);

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
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (step === 'create') {
      if (firstPin.length >= 6) return;
      const next = firstPin + val;
      setFirstPin(next);
      setErrorMsg(null);

      if (next.length === 6) {
        setTimeout(() => {
          setStep('confirm');
        }, 150);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length >= 6) return;
      const next = confirmPin + val;
      setConfirmPin(next);
      setErrorMsg(null);

      if (next.length === 6) {
        if (next === firstPin) {
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (_) {}

          if (hasBiometrics) {
            setStep('biometrics');
          } else {
            await completePasscodeSetup(next, false);
          }
        } else {
          shakeKeypad();
          setErrorMsg("That passcode doesn't match. Try again.");
          setTimeout(() => {
            setFirstPin('');
            setConfirmPin('');
            setStep('create');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    if (step === 'create') {
      setFirstPin((prev) => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
    setErrorMsg(null);
  };

  const currentPin = step === 'create' ? firstPin : confirmPin;

  if (!isSettingUpPasscode) return null;

  return (
    <Modal visible={isSettingUpPasscode} animationType="slide" transparent={false}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Top Cancel button */}
        <View style={styles.topBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={cancelPasscodeSetup}
            accessibilityLabel="Cancel passcode setup"
            hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
            style={styles.closeBtn}
          >
            <X size={20} color={colors.muted} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {step === 'biometrics' ? (
          // ── Step 3: Biometrics Prompt ──────────────────────────────
          <View style={styles.biometricsContainer}>
            <Mote state="rest" size={100} />

            <Text style={[typeTokens.dayHeading, styles.title, { color: colors.text }]}>
              Unlock with {biometricType}?
            </Text>

            <Text style={[typeTokens.meta, styles.hint, { color: colors.muted }]}>
              Use {biometricType} to open your moments quickly
            </Text>

            <View style={styles.biometricsActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => completePasscodeSetup(firstPin, true)}
                style={[styles.primaryButton, { backgroundColor: colors.accent }]}
              >
                <Text style={[typeTokens.uiMedium, { color: colors.onAccent }]}>
                  Use {biometricType}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => completePasscodeSetup(firstPin, false)}
                style={[styles.secondaryButton, { backgroundColor: colors.surface }]}
              >
                <Text style={[typeTokens.uiMedium, { color: colors.muted }]}>
                  Not now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ── Steps 1 & 2: Passcode Entry ─────────────────────────────
          <View style={styles.content}>
            <View style={styles.header}>
              <Mote state="rest" size={90} />

              <Text style={[typeTokens.dayHeading, styles.title, { color: colors.text }]}>
                {step === 'create' ? 'Create a passcode' : 'Enter it once more'}
              </Text>

              <Text style={[typeTokens.meta, styles.hint, { color: colors.muted }]}>
                {errorMsg ? errorMsg : step === 'create' ? 'Choose 6 digits' : 'Confirm your passcode'}
              </Text>
            </View>

            {/* Six Passcode Dots */}
            <Animated.View
              style={[
                styles.dotsRow,
                { transform: [{ translateX: shakeAnim }] },
              ]}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const isFilled = currentPin.length > index;
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

            {/* 3x4 Keypad */}
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

              {/* Bottom row: empty, 0, delete */}
              <View style={styles.keypadRow}>
                <View style={styles.keySpacer} />

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
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? spacing.huge : spacing.xl,
    paddingBottom: spacing.huge,
  },
  topBar: {
    paddingHorizontal: spacing.screen,
    height: 44,
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  title: {
    marginTop: spacing.md,
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
  biometricsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screen,
  },
  biometricsActions: {
    width: '100%',
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  primaryButton: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
