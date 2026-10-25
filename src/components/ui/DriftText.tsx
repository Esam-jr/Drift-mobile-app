import React from 'react';
import { Text, TextProps } from 'react-native';
import { type as typeTokens } from '@/theme/tokens';

/**
 * Maps old variant names used in unmigrated screens to new type token keys.
 * New code should use the token name directly (e.g. 'momentBody', 'dayHeading').
 */
const variantMap: Record<string, keyof typeof typeTokens> = {
  // New token names (preferred)
  dayHeading: 'dayHeading',
  dateDisplay: 'dateDisplay',
  prompt: 'prompt',
  momentBody: 'momentBody',
  momentDetail: 'momentDetail',
  ui: 'ui',
  uiMedium: 'uiMedium',
  meta: 'meta',
  small: 'small',
  // Legacy compat
  display: 'dateDisplay',
  title: 'dayHeading',
  headline: 'uiMedium',
  body: 'momentBody',
  bodySmall: 'ui',
  caption: 'meta',
  micro: 'small',
};

type Props = TextProps & {
  variant?: string;
  /** Legacy color prop — ignored. Set color via style instead. */
  color?: string;
  center?: boolean;
};

export function DriftText({ variant = 'ui', center, style, ...props }: Props) {
  const tokenKey = variantMap[variant] ?? 'ui';
  const base = typeTokens[tokenKey];

  return (
    <Text
      style={[
        base,
        center && { textAlign: 'center' as const },
        style,
      ]}
      {...props}
    />
  );
}
