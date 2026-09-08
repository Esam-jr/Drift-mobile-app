import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Wind, Plus, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';

export default function TabsLayout() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleCapturePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    router.push('/capture');
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderSubtle,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.textPrimary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Moments',
          tabBarIcon: ({ color, focused }) => (
            <Wind size={20} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />

      <Tabs.Screen
        name="capture-trigger"
        options={{
          title: 'Capture',
          tabBarButton: () => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleCapturePress}
              style={styles.captureButtonWrapper}
            >
              <View style={[styles.captureButton, { backgroundColor: theme.accent }]}>
                <Plus size={22} color="#0B0D11" strokeWidth={2.4} />
              </View>
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Shield size={20} color={color} strokeWidth={focused ? 2.2 : 1.7} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  captureButtonWrapper: {
    top: -12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
});
