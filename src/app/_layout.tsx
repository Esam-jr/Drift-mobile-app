import React, { useEffect, useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, StyleSheet, AppState, Modal } from 'react-native';
import { useFonts, Newsreader_400Regular, Newsreader_400Regular_Italic } from '@expo-google-fonts/newsreader';
import { Figtree_400Regular, Figtree_500Medium } from '@expo-google-fonts/figtree';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { SecurityProvider } from '@/services/security/SecurityContext';
import { LockScreenModal } from '@/components/security/LockScreenModal';
import { CreatePasscodeModal } from '@/components/security/CreatePasscodeModal';
import { Mote } from '@/components/Mote';
import { getDatabase } from '@/services/db/database';
import { ensureMediaDirectoryExists } from '@/services/media/mediaService';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { colors, isDark } = useTheme();
  const [isBackgrounded, setIsBackgrounded] = useState(AppState.currentState !== 'active');

  useEffect(() => {
    getDatabase().catch((e) => console.warn('Database init error:', e));
    ensureMediaDirectoryExists().catch((e) => console.warn('Media dir init error:', e));
  }, []);

  // Background blanking: blank screen whenever app is inactive or in background per DESIGN.md §6.1
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      setIsBackgrounded(nextState === 'inactive' || nextState === 'background');
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="capture"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="moment/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
      </Stack>

      {/* Lock Screen & Passcode Creation */}
      <LockScreenModal />
      <CreatePasscodeModal />

      {/* Privacy blanking shield in app switcher per DESIGN.md §6.1:
          Uses both an absoluteFill View and a top-level native Modal so all native
          sub-views (modals, stack screens) are covered in the OS App Switcher preview. */}
      {isBackgrounded && (
        <>
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.privacyShield,
              { backgroundColor: colors.bg, zIndex: 999999 },
            ]}
          >
            <Mote state="asleep" size={100} label="Drift is resting" />
          </View>
          <Modal
            visible={isBackgrounded}
            transparent={false}
            animationType="none"
            statusBarTranslucent
          >
            <View
              style={[
                styles.privacyShield,
                { backgroundColor: colors.bg },
              ]}
            >
              <Mote state="asleep" size={100} label="Drift is resting" />
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Figtree_400Regular,
    Figtree_500Medium,
  });

  const onReady = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onReady();
  }, [onReady]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SecurityProvider>
          <RootNavigator />
        </SecurityProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  privacyShield: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
