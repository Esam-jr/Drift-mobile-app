import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, AccessibilityInfo, Easing, Text } from 'react-native';
import { Mote } from '@/components/Mote';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing, motion } from '@/theme/tokens';

interface EmptyStateProps {
  glow?: boolean;
}

/**
 * Empty state for Home. Shows Mote at rest with gentle float animation per DESIGN.md §6.4 & §7.
 * Copy from DESIGN.md §6.4. No buttons — capture bar stays at bottom of Home.
 */
export function EmptyState({ glow = false }: EmptyStateProps) {
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Reduced motion check
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // Float loop: translateY about 3pt over 5s, looping, ease-in-out per DESIGN.md §7
  useEffect(() => {
    if (!reduceMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -3,
            duration: motion.float / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 3,
            duration: motion.float / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      floatAnim.setValue(0);
    }
  }, [reduceMotion]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Mote
          state={glow ? 'glow' : 'rest'}
          size={120}
          label="Your first thought is waiting"
        />
      </Animated.View>

      <Text
        style={[
          typeTokens.prompt,
          styles.heading,
          { color: colors.text },
        ]}
      >
        Your first thought is waiting.
      </Text>

      <Text
        style={[
          typeTokens.ui,
          styles.subheading,
          { color: colors.muted },
        ]}
      >
        Capture a moment whenever it drifts in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: 21,
    lineHeight: 28,
  },
  subheading: {
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 260,
  },
});
