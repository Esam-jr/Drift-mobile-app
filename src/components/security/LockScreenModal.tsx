import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Lock, Fingerprint, Delete } from 'lucide-react-native';
import { useTheme } from '@/theme/ThemeContext';
import { useSecurity } from '@/services/security/SecurityContext';
import { DriftTokens } from '@/theme/tokens';
import { DriftText } from '../ui/DriftText';

export const LockScreenModal: React.FC = () => {
  const { theme } = useTheme();
  const { isLocked, unlockWithPin, triggerBiometrics, biometricsActive } = useSecurity();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Auto trigger biometrics on lock appearance if active
  useEffect(() => {
    if (isLocked && biometricsActive) {
      triggerBiometrics();
    }
  }, [isLocked, biometricsActive, triggerBiometrics]);

  // Handle shake animation on wrong pin
  const shakeKeypad = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}

    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = async (val: string) => {
    if (pin.length >= 4) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    const nextPin = pin + val;
    setPin(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      const success = await unlockWithPin(nextPin);
      if (success) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (_) {}
        setPin('');
      } else {
        shakeKeypad();
        setErrorMsg('Incorrect passcode');
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
    <Modal visible={isLocked} animationType="fade" transparent={false}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header / Lock Icon */}
        <View style={styles.header}>
          <View style={[styles.iconBubble, { backgroundColor: theme.surfaceElevated }]}>
            <Lock size={28} color={theme.accent} />
          </View>
          <DriftText variant="title" color="primary" center style={styles.title}>
            Drift is locked
          </DriftText>
          <DriftText variant="bodySmall" color="secondary" center style={styles.subtitle}>
            Enter your passcode to open your moments
          </DriftText>
        </View>

        {/* PIN Indicators */}
        <Animated.View
          style={[
            styles.dotsRow,
            { transform: [{ translateX: shakeAnim }] },
          ]}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isFilled ? theme.accent : 'transparent',
                    borderColor: isFilled ? theme.accent : theme.border,
                  },
                ]}
              />
            );
          })}
        </Animated.View>

        {/* Error notice */}
        {errorMsg ? (
          <DriftText variant="caption" color="rose" center style={styles.errorText}>
            {errorMsg}
          </DriftText>
        ) : (
          <View style={styles.errorPlaceholder} />
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {[
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((num) => (
                <TouchableOpacity
                  key={num}
                  activeOpacity={0.65}
                  onPress={() => handleKeyPress(num)}
                  style={[styles.keyButton, { backgroundColor: theme.surface }]}
                >
                  <DriftText variant="title" color="primary">
                    {num}
                  </DriftText>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Bottom row: Biometrics, 0, Backspace */}
          <View style={styles.keypadRow}>
            {biometricsActive ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => triggerBiometrics()}
                style={[styles.keyButton, { backgroundColor: theme.surfaceElevated }]}
              >
                <Fingerprint size={24} color={theme.accent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.keyPlaceholder} />
            )}

            <TouchableOpacity
              activeOpacity={0.65}
              onPress={() => handleKeyPress('0')}
              style={[styles.keyButton, { backgroundColor: theme.surface }]}
            >
              <DriftText variant="title" color="primary">
                0
              </DriftText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDelete}
              style={[styles.keyButton, { backgroundColor: 'transparent' }]}
            >
              <Delete size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 50,
  },
  header: {
    alignItems: 'center',
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    maxWidth: 240,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 18,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  errorText: {
    height: 20,
    marginBottom: 10,
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: 10,
  },
  keypad: {
    width: '100%',
    maxWidth: 280,
    gap: 16,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
});
