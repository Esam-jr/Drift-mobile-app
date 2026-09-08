import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { DriftTokens } from '@/theme/tokens';

type TextVariant = 'display' | 'title' | 'headline' | 'body' | 'bodySmall' | 'caption' | 'micro';
type TextColor = 'primary' | 'secondary' | 'tertiary' | 'accent' | 'lavender' | 'rose';

interface DriftTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  center?: boolean;
}

export const DriftText: React.FC<DriftTextProps> = ({
  variant = 'body',
  color = 'primary',
  center = false,
  style,
  children,
  ...props
}) => {
  const { theme } = useTheme();

  const colorMap = {
    primary: theme.textPrimary,
    secondary: theme.textSecondary,
    tertiary: theme.textTertiary,
    accent: theme.accent,
    lavender: theme.lavender,
    rose: theme.rose,
  };

  const typographyStyle = DriftTokens.typography[variant];

  return (
    <Text
      style={[
        typographyStyle,
        { color: colorMap[color] },
        center && { textAlign: 'center' },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};
