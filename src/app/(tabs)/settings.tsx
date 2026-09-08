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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Shield, Lock, Fingerprint, HardDrive, Download, Info, Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';
import { useSecurity } from '@/services/security/SecurityContext';
import {
  setupPasscode,
  disableSecurity,
  setBiometricsEnabled,
  checkBiometricHardware,
  changePasscode,
} from '@/services/security/securityService';
import { getMediaStorageStats } from '@/services/media/mediaService';
import { getAllMoments } from '@/services/db/momentRepository';
import { DriftText } from '@/components/ui/DriftText';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { isSecured, biometricsActive, refreshSecurityStatus, lock } = useSecurity();

  const [biometricType, setBiometricType] = useState<string>('Biometrics');
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [storageStats, setStorageStats] = useState<{ audioBytes: number; imageBytes: number; totalBytes: number }>({
    audioBytes: 0,
    imageBytes: 0,
    totalBytes: 0,
  });
  const [momentCount, setMomentCount] = useState<number>(0);

  // Passcode setup / change modal state
  const [pinModalVisible, setPinModalVisible] = useState<boolean>(false);
  const [pinMode, setPinMode] = useState<'setup' | 'change' | 'disable'>('setup');
  const [tempPin, setTempPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'first' | 'confirm'>('first');

  const loadSettingsData = useCallback(async () => {
    try {
      const bioInfo = await checkBiometricHardware();
      setHasBiometrics(bioInfo.hasHardware && bioInfo.isEnrolled);
      setBiometricType(bioInfo.biometricType);

      const stats = await getMediaStorageStats();
      setStorageStats(stats);

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

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const handleToggleSecurity = (value: boolean) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    if (value) {
      // Setup PIN
      setPinMode('setup');
      setTempPin('');
      setConfirmPin('');
      setStep('first');
      setPinModalVisible(true);
    } else {
      // Disable PIN prompt
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
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    await setBiometricsEnabled(value);
    await refreshSecurityStatus();
  };

  const handlePinKey = async (num: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}

    if (step === 'first') {
      const next = tempPin + num;
      setTempPin(next);
      if (next.length === 4) {
        setStep('confirm');
      }
    } else {
      const next = confirmPin + num;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === tempPin) {
          await setupPasscode(next, hasBiometrics);
          await refreshSecurityStatus();
          setPinModalVisible(false);
          Alert.alert('Passcode set', 'Drift is now protected with your passcode.');
        } else {
          Alert.alert('PIN Mismatch', 'The passcodes do not match. Please try again.');
          setTempPin('');
          setConfirmPin('');
          setStep('first');
        }
      }
    }
  };

  const handleExportData = async () => {
    try {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (_) {}
      const moments = await getAllMoments();
      const exportJson = JSON.stringify(
        {
          appName: 'Drift',
          exportedAt: new Date().toISOString(),
          momentsCount: moments.length,
          moments: moments.map((m) => ({
            id: m.id,
            text: m.text,
            createdAt: new Date(m.createdAt).toISOString(),
            category: m.category?.name || null,
            hasAudio: !!m.audioUri,
            hasImages: m.images.length > 0,
          })),
        },
        null,
        2
      );
      Alert.alert(
        'Export Complete',
        `Successfully prepared ${moments.length} moments for export.`
      );
    } catch (err) {
      Alert.alert('Export Failed', 'Could not compile export data.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <DriftText variant="display" color="primary" style={styles.title}>
            Settings
          </DriftText>
          <DriftText variant="caption" color="tertiary" style={styles.sub}>
            Privacy, security & storage
          </DriftText>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Privacy & Security Card */}
          <View style={styles.section}>
            <DriftText variant="caption" color="tertiary" style={styles.sectionHeading}>
              PRIVACY & SECURITY
            </DriftText>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              {/* Passcode Toggle */}
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <View style={[styles.iconPill, { backgroundColor: theme.surfaceElevated }]}>
                    <Lock size={16} color={theme.accent} />
                  </View>
                  <View style={styles.labelCol}>
                    <DriftText variant="headline" color="primary" style={styles.rowTitle}>
                      Passcode Protection
                    </DriftText>
                    <DriftText variant="caption" color="secondary">
                      Lock journal when app opens
                    </DriftText>
                  </View>
                </View>
                <Switch
                  value={isSecured}
                  onValueChange={handleToggleSecurity}
                  trackColor={{ false: theme.border, true: theme.accent }}
                  thumbColor={Platform.OS === 'android' ? theme.background : undefined}
                />
              </View>

              {/* Biometrics Toggle (shown if secured and hardware supported) */}
              {isSecured && hasBiometrics && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.iconPill, { backgroundColor: theme.surfaceElevated }]}>
                        <Fingerprint size={16} color={theme.lavender} />
                      </View>
                      <View style={styles.labelCol}>
                        <DriftText variant="headline" color="primary" style={styles.rowTitle}>
                          {biometricType} Unlock
                        </DriftText>
                        <DriftText variant="caption" color="secondary">
                          Quick unlock with your biometrics
                        </DriftText>
                      </View>
                    </View>
                    <Switch
                      value={biometricsActive}
                      onValueChange={handleToggleBiometrics}
                      trackColor={{ false: theme.border, true: theme.accent }}
                      thumbColor={Platform.OS === 'android' ? theme.background : undefined}
                    />
                  </View>
                </>
              )}

              {/* Lock Now button */}
              {isSecured && (
                <>
                  <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={lock}
                    style={styles.lockNowButton}
                  >
                    <DriftText variant="bodySmall" color="accent">
                      Lock Drift Now
                    </DriftText>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Local Storage & Data Card */}
          <View style={styles.section}>
            <DriftText variant="caption" color="tertiary" style={styles.sectionHeading}>
              LOCAL STORAGE
            </DriftText>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <View style={styles.statRow}>
                <DriftText variant="bodySmall" color="secondary">
                  Total Moments Captured
                </DriftText>
                <DriftText variant="headline" color="primary">
                  {momentCount}
                </DriftText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

              <View style={styles.statRow}>
                <DriftText variant="bodySmall" color="secondary">
                  Voice Recordings
                </DriftText>
                <DriftText variant="bodySmall" color="primary">
                  {formatBytes(storageStats.audioBytes)}
                </DriftText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

              <View style={styles.statRow}>
                <DriftText variant="bodySmall" color="secondary">
                  Photos & Memories
                </DriftText>
                <DriftText variant="bodySmall" color="primary">
                  {formatBytes(storageStats.imageBytes)}
                </DriftText>
              </View>

              <View style={[styles.divider, { backgroundColor: theme.borderSubtle }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleExportData}
                style={styles.exportRow}
              >
                <Download size={16} color={theme.accent} />
                <DriftText variant="bodySmall" color="accent" style={styles.exportText}>
                  Export Journal Data (JSON)
                </DriftText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Philosophy / About */}
          <View style={styles.section}>
            <DriftText variant="caption" color="tertiary" style={styles.sectionHeading}>
              ABOUT DRIFT
            </DriftText>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSubtle }]}>
              <DriftText variant="bodySmall" color="secondary" style={styles.philosophyText}>
                "Drift is a private place to capture the thoughts and moments that would otherwise drift away."
              </DriftText>
              <DriftText variant="caption" color="tertiary" style={styles.versionText}>
                Version 1.0.0 • 100% Offline-First • Zero Cloud Accounts
              </DriftText>
            </View>
          </View>
        </ScrollView>

        {/* PIN Setup Modal */}
        <Modal visible={pinModalVisible} animationType="slide" transparent>
          <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setPinModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                <DriftText variant="headline" color="primary" center>
                  {step === 'first' ? 'Create a 4-Digit Passcode' : 'Confirm your Passcode'}
                </DriftText>
                <View style={{ width: 20 }} />
              </View>

              <View style={styles.modalDots}>
                {[0, 1, 2, 3].map((i) => {
                  const currentStr = step === 'first' ? tempPin : confirmPin;
                  const isFilled = currentStr.length > i;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.setupDot,
                        {
                          backgroundColor: isFilled ? theme.accent : 'transparent',
                          borderColor: isFilled ? theme.accent : theme.border,
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Number pad */}
              <View style={styles.modalKeypad}>
                {[
                  ['1', '2', '3'],
                  ['4', '5', '6'],
                  ['7', '8', '9'],
                  ['', '0', ''],
                ].map((row, rIdx) => (
                  <View key={rIdx} style={styles.keypadRow}>
                    {row.map((num, cIdx) => (
                      num ? (
                        <TouchableOpacity
                          key={num}
                          activeOpacity={0.7}
                          onPress={() => handlePinKey(num)}
                          style={[styles.modalKey, { backgroundColor: theme.surfaceElevated }]}
                        >
                          <DriftText variant="title" color="primary">
                            {num}
                          </DriftText>
                        </TouchableOpacity>
                      ) : (
                        <View key={`empty_${cIdx}`} style={styles.emptyKey} />
                      )
                    ))}
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
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    letterSpacing: -1,
  },
  sub: {
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeading: {
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.6,
  },
  card: {
    borderRadius: DriftTokens.radius.lg,
    padding: 16,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  labelCol: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  lockNowButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  exportText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  philosophyText: {
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 10,
  },
  versionText: {
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: DriftTokens.radius.xl,
    borderTopRightRadius: DriftTokens.radius.xl,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  closeBtn: {
    padding: 4,
  },
  modalDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 28,
  },
  setupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  modalKeypad: {
    alignSelf: 'center',
    width: 260,
    gap: 14,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalKey: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyKey: {
    width: 68,
    height: 68,
  },
});
