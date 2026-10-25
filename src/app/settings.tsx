import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
  StatusBar,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, Lock, Fingerprint, Download, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';
import { useSecurity } from '@/services/security/SecurityContext';
import {
  setupPasscode,
  disableSecurity,
  setBiometricsEnabled,
  checkBiometricHardware,
} from '@/services/security/securityService';
import { getMediaStorageStats } from '@/services/media/mediaService';
import { getAllMoments } from '@/services/db/momentRepository';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { isSecured, biometricsActive, refreshSecurityStatus, lock } = useSecurity();

  const [biometricType, setBiometricType] = useState('Biometrics');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [momentCount, setMomentCount] = useState(0);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [tempPin, setTempPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'first' | 'confirm'>('first');

  const loadSettingsData = useCallback(async () => {
    try {
      const bioInfo = await checkBiometricHardware();
      setHasBiometrics(bioInfo.hasHardware && bioInfo.isEnrolled);
      setBiometricType(bioInfo.biometricType);
      const moments = await getAllMoments();
      setMomentCount(moments.length);
    } catch (err) {
      console.warn('Error loading settings data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  const handleToggleSecurity = (value: boolean) => {
    try { Haptics.selectionAsync(); } catch (_) {}
    if (value) {
      setTempPin('');
      setConfirmPin('');
      setStep('first');
      setPinModalVisible(true);
    } else {
      Alert.alert(
        'Disable Passcode?',
        'Your moments will no longer be locked when Drift opens.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await disableSecurity();
              await refreshSecurityStatus();
            },
          },
        ]
      );
    }
  };

  const handleToggleBiometrics = async (value: boolean) => {
    try { Haptics.selectionAsync(); } catch (_) {}
    await setBiometricsEnabled(value);
    await refreshSecurityStatus();
  };

  const handlePinKey = async (num: string) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (_) {}
    if (step === 'first') {
      const next = tempPin + num;
      setTempPin(next);
      if (next.length === 4) setStep('confirm');
    } else {
      const next = confirmPin + num;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === tempPin) {
          await setupPasscode(next, hasBiometrics);
          await refreshSecurityStatus();
          setPinModalVisible(false);
        } else {
          Alert.alert('That passcode doesn\'t match. Try again.');
          setTempPin('');
          setConfirmPin('');
          setStep('first');
        }
      }
    }
  };

  const handlePinDelete = () => {
    if (step === 'first') {
      setTempPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={[typeTokens.dayHeading, { color: colors.text }]}>
            Settings
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Privacy */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Privacy
          </Text>

          {/* Passcode */}
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Passcode</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>
              {isSecured ? 'On' : 'Off'}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>
              Unlock with {biometricType}
            </Text>
            {isSecured && hasBiometrics ? (
              <Switch
                value={biometricsActive}
                onValueChange={handleToggleBiometrics}
                trackColor={{ false: colors.hairline, true: colors.accent }}
              />
            ) : (
              <Text style={[typeTokens.ui, { color: colors.muted }]}>—</Text>
            )}
          </View>
          {isSecured && (
            <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
              <Text style={[typeTokens.ui, { color: colors.text }]}>Lock Drift</Text>
              <Text style={[typeTokens.ui, { color: colors.muted }]}>When I leave</Text>
            </View>
          )}

          {/* Appearance */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Theme</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>Match my phone</Text>
          </View>

          {/* Your moments */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Your moments
          </Text>
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Export</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>{momentCount} moments</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Backup</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>Off</Text>
          </View>
        </ScrollView>

        {/* PIN Modal */}
        <Modal visible={pinModalVisible} animationType="slide" transparent>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPinModalVisible(false)}>
                  <X size={20} color={colors.muted} />
                </TouchableOpacity>
                <Text style={[typeTokens.uiMedium, { color: colors.text }]}>
                  {step === 'first' ? 'Create a passcode' : 'Enter it once more'}
                </Text>
                <View style={{ width: 20 }} />
              </View>

              <View style={styles.dots}>
                {[0, 1, 2, 3].map((i) => {
                  const pin = step === 'first' ? tempPin : confirmPin;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: pin.length > i ? colors.accent : 'transparent',
                          borderColor: pin.length > i ? colors.accent : colors.hairline,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              <View style={styles.keypad}>
                {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','⌫']].map((row, ri) => (
                  <View key={ri} style={styles.keyRow}>
                    {row.map((k, ci) =>
                      k === '' ? (
                        <View key={`e${ci}`} style={styles.emptyKey} />
                      ) : (
                        <TouchableOpacity
                          key={k}
                          activeOpacity={0.7}
                          onPress={() => k === '⌫' ? handlePinDelete() : handlePinKey(k)}
                          style={[styles.key, { backgroundColor: colors.surface }]}
                        >
                          <Text style={[typeTokens.dayHeading, { color: colors.text }]}>
                            {k}
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.huge,
  },
  sectionTitle: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.huge,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  keypad: {
    alignSelf: 'center',
    width: 240,
    gap: spacing.md,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  key: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    width: 64,
    height: 64,
  },
});
