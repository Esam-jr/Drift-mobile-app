import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  Text,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { useSecurity } from '@/services/security/SecurityContext';
import { type as typeTokens, spacing, radius } from '@/theme/tokens';
import { getAllMoments } from '@/services/db/momentRepository';
import { LockTimeout } from '@/services/security/securityService';
import { HomeLayout } from '@/types/moment';
import { getSavedHomeLayout, saveHomeLayout } from '@/services/preferences/preferencesService';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const router = useRouter();
  const {
    isSecured,
    biometricsActive,
    biometricType,
    hasBiometrics,
    lockTimeout,
    startPasscodeSetup,
    disablePasscode,
    updateLockTimeout,
    updateBiometricsEnabled,
  } = useSecurity();

  const [momentCount, setMomentCount] = useState<number>(0);
  const [homeLayout, setHomeLayout] = useState<HomeLayout>('journal');

  const loadSettingsData = useCallback(async () => {
    try {
      const moments = await getAllMoments();
      setMomentCount(moments.length);
      const savedLayout = await getSavedHomeLayout();
      setHomeLayout(savedLayout);
    } catch (err) {
      console.warn('Error loading settings data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  const handlePasscodePress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    if (!isSecured) {
      startPasscodeSetup();
    } else {
      Alert.alert(
        'Turn off passcode?',
        'Your moments will no longer be locked when Drift opens.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn off',
            style: 'destructive',
            onPress: async () => {
              await disablePasscode();
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
    await updateBiometricsEnabled(value);
  };

  const handleLockTimeoutPress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    const options: { label: string; value: LockTimeout }[] = [
      { label: 'When I leave', value: 'immediately' },
      { label: 'After 1 minute', value: '1min' },
      { label: 'Never', value: 'never' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'When I leave', 'After 1 minute', 'Never'],
          cancelButtonIndex: 0,
        },
        async (index) => {
          if (index >= 1 && index <= 3) {
            await updateLockTimeout(options[index - 1].value);
          }
        }
      );
    } else {
      Alert.alert('Lock Drift', undefined, [
        { text: 'When I leave', onPress: () => updateLockTimeout('immediately') },
        { text: 'After 1 minute', onPress: () => updateLockTimeout('1min') },
        { text: 'Never', onPress: () => updateLockTimeout('never') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleThemePress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    const modes: { label: string; value: 'system' | 'light' | 'dark' }[] = [
      { label: 'Match my phone', value: 'system' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Match my phone', 'Light', 'Dark'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index >= 1 && index <= 3) {
            setMode(modes[index - 1].value);
          }
        }
      );
    } else {
      Alert.alert('Theme', undefined, [
        { text: 'Match my phone', onPress: () => setMode('system') },
        { text: 'Light', onPress: () => setMode('light') },
        { text: 'Dark', onPress: () => setMode('dark') },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const lockTimeoutLabel = {
    immediately: 'When I leave',
    '1min': 'After 1 minute',
    never: 'Never',
  }[lockTimeout];

  const themeLabel = {
    system: 'Match my phone',
    light: 'Light',
    dark: 'Dark',
  }[mode];

  const handleHomeLayoutPress = () => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}

    const layoutOptions: { label: string; value: HomeLayout }[] = [
      { label: 'Journal', value: 'journal' },
      { label: 'Gallery', value: 'gallery' },
      { label: 'Compact', value: 'compact' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Journal', 'Gallery', 'Compact'],
          cancelButtonIndex: 0,
        },
        async (index) => {
          if (index >= 1 && index <= 3) {
            const selected = layoutOptions[index - 1].value;
            setHomeLayout(selected);
            await saveHomeLayout(selected);
          }
        }
      );
    } else {
      Alert.alert('Home layout', undefined, [
        {
          text: 'Journal',
          onPress: async () => {
            setHomeLayout('journal');
            await saveHomeLayout('journal');
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            setHomeLayout('gallery');
            await saveHomeLayout('gallery');
          },
        },
        {
          text: 'Compact',
          onPress: async () => {
            setHomeLayout('compact');
            await saveHomeLayout('compact');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const homeLayoutLabel = {
    journal: 'Journal',
    gallery: 'Gallery',
    compact: 'Compact',
  }[homeLayout];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.container}>
        {/* Header: back chevron + serif title */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            accessibilityLabel="Back to moments"
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={[typeTokens.dayHeading, { color: colors.text }]}>
            Settings
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Privacy Section */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Privacy
          </Text>

          {/* Passcode row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePasscodePress}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <Text style={[typeTokens.ui, { color: colors.text }]}>Passcode</Text>
            <Text style={[typeTokens.ui, { color: isSecured ? colors.text : colors.muted }]}>
              {isSecured ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>

          {/* Unlock with Biometrics */}
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

          {/* Lock Drift */}
          {isSecured && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLockTimeoutPress}
              style={[styles.row, { borderBottomColor: colors.hairline }]}
            >
              <Text style={[typeTokens.ui, { color: colors.text }]}>Lock Drift</Text>
              <Text style={[typeTokens.ui, { color: colors.muted }]}>
                {lockTimeoutLabel}
              </Text>
            </TouchableOpacity>
          )}

          {/* Appearance Section */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>

          {/* Theme row */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleThemePress}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <Text style={[typeTokens.ui, { color: colors.text }]}>Theme</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>{themeLabel}</Text>
          </TouchableOpacity>

          {/* Home layout row per DESIGN-home.md §1 & §8 */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleHomeLayoutPress}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={[typeTokens.ui, { color: colors.text }]}>Home layout</Text>
              <Text style={[typeTokens.meta, { color: colors.muted, marginTop: 2 }]}>
                Choose how your moments appear on the main screen.
              </Text>
            </View>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>{homeLayoutLabel}</Text>
          </TouchableOpacity>

          {/* Your Moments Section */}
          <Text style={[typeTokens.dayHeading, styles.sectionTitle, { color: colors.text }]}>
            Your moments
          </Text>

          {/* Export */}
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Export</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>
              {momentCount} {momentCount === 1 ? 'moment' : 'moments'}
            </Text>
          </View>

          {/* Backup */}
          <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
            <Text style={[typeTokens.ui, { color: colors.text }]}>Backup</Text>
            <Text style={[typeTokens.ui, { color: colors.muted }]}>Off</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.huge,
  },
  sectionTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
