import React, { createContext, useContext, useState } from 'react';
import { useColorScheme as useDeviceScheme } from 'react-native';
import { palette, type Palette, type ThemeName } from './tokens';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  /** The resolved palette for the active theme. Use this in new screens. */
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /**
   * Legacy compatibility object that maps old key names to new palette values.
   * Used by screens not yet migrated to the new tokens (moment/[id], settings, etc.).
   * Remove once all screens are migrated.
   */
  theme: {
    background: string;
    surface: string;
    surfaceRaised: string;
    surfaceElevated: string;
    border: string;
    borderSubtle: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    accent: string;
    onAccent: string;
    overlay: string;
    rose: string;
    lavender: string;
    amber: string;
    sky: string;
  };
}

const Ctx = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const device = useDeviceScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const isDark = mode === 'system' ? device !== 'light' : mode === 'dark';
  const colors = isDark ? palette.dark : palette.light;

  // Legacy compat mapping for unmigrated screens
  const theme = {
    background: colors.bg,
    surface: colors.surface,
    surfaceRaised: colors.surface,
    surfaceElevated: colors.surface,
    border: colors.hairline,
    borderSubtle: colors.hairline,
    textPrimary: colors.text,
    textSecondary: colors.muted,
    textTertiary: colors.muted,
    accent: colors.accent,
    onAccent: colors.onAccent,
    overlay: isDark ? 'rgba(19,18,27,0.82)' : 'rgba(244,241,235,0.88)',
    rose: colors.glow,
    lavender: colors.accent,
    amber: colors.glow,
    sky: colors.accent,
  };

  return (
    <Ctx.Provider value={{ colors, isDark, mode, setMode, theme }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
