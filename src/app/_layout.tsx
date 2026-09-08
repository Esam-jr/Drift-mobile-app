import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { SecurityProvider } from '@/services/security/SecurityContext';
import { LockScreenModal } from '@/components/security/LockScreenModal';
import { getDatabase } from '@/services/db/database';
import { ensureMediaDirectoryExists } from '@/services/media/mediaService';

function RootNavigator() {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Pre-initialize database and media directories
    getDatabase().catch((e) => console.warn('Database init error:', e));
    ensureMediaDirectoryExists().catch((e) => console.warn('Media dir init error:', e));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
            presentation: 'card',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
      </Stack>
      <LockScreenModal />
    </View>
  );
}

export default function RootLayout() {
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
});
