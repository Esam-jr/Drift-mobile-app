import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Mote } from '@/components/Mote';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing } from '@/theme/tokens';
import { DriftText } from './DriftText';

/**
 * Empty state for Home. Shows Mote at rest, DESIGN.md §6.4 copy.
 * No buttons — capture bar stays at the bottom of Home.
 */
export function EmptyState() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Mote state="rest" size={120} label="Drift mascot" />
      <DriftText
        variant="prompt"
        style={[styles.heading, { color: colors.text }]}
      >
        Your first thought is waiting.
      </DriftText>
      <DriftText
        variant="ui"
        style={[styles.subheading, { color: colors.muted }]}
      >
        Capture a moment whenever it drifts in.
      </DriftText>
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
  },
  subheading: {
    marginTop: spacing.sm,
    textAlign: 'center',
    maxWidth: 260,
  },
});
