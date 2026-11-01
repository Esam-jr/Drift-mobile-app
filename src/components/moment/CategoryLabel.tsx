import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { type as typeTokens, spacing } from '@/theme/tokens';

interface CategoryLabelProps {
  name: string;
}

/**
 * Shared category label with glow dot per DESIGN-home.md §2:
 * "Category: a `glow` dot plus the category name."
 */
export const CategoryLabel: React.FC<CategoryLabelProps> = ({ name }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.glowDot, { backgroundColor: colors.glow }]} />
      <Text style={[typeTokens.meta, { color: colors.muted }]}>
        {name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
});
