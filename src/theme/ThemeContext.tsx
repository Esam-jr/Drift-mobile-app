import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { DriftTokens, DriftTheme } from './tokens';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: DriftTheme;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  tokens: typeof DriftTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceScheme = useDeviceColorScheme();
  const [mode, setMode] = useState<ThemeMode>('dark'); // Default to dark for Drift's calm atmosphere

  const isDark = mode === 'system' ? deviceScheme === 'light' ? false : true : mode === 'dark';
  const theme = isDark ? DriftTokens.colors.dark : DriftTokens.colors.light;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        mode,
        isDark,
        setMode,
        tokens: DriftTokens,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
