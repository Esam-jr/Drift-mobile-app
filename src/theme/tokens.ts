// Drift design tokens. Source of truth for color, type, spacing, shape, and motion.
// Never hardcode these values in screens. See DESIGN.md.

export const palette = {
  light: {
    bg: '#F4F1EB',
    surface: '#FCFAF6',
    text: '#26242E',
    muted: '#6E6B7A',
    accent: '#5F68C9',
    onAccent: '#FFFFFF',
    glow: '#E9A877',
    hairline: 'rgba(38,36,46,0.12)',
  },
  dark: {
    bg: '#13121B',
    surface: '#1D1C29',
    text: '#ECE9F3',
    muted: '#9A97AB',
    accent: '#9AA2F0',
    onAccent: '#13121B',
    glow: '#F0B88A',
    hairline: 'rgba(236,233,243,0.12)',
  },
} as const;

export type ThemeName = keyof typeof palette;
export type Palette = (typeof palette)[ThemeName];

// Mascot colors are the same in both themes.
export const mote = {
  body: '#6C75D8',
  face: '#1D1C29',
  glow: '#F0B88A',
  trail: '#9AA2F0',
} as const;

// Suggested fonts: @expo-google-fonts/newsreader and @expo-google-fonts/figtree.
export const fonts = {
  serif: 'Newsreader_400Regular',
  serifItalic: 'Newsreader_400Regular_Italic',
  serifSemiBold: 'Newsreader_600SemiBold',
  serifSemiBoldItalic: 'Newsreader_600SemiBold_Italic',
  sans: 'Figtree_400Regular',
  sansMedium: 'Figtree_500Medium',
} as const;

export const type = {
  heading: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 30 },
  heading1: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 30 },
  heading2: { fontFamily: fonts.serifSemiBold, fontSize: 20, lineHeight: 26 },
  dayHeading: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 28 },
  dateDisplay: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 32 },
  prompt: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  momentBody: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 26 },
  momentDetail: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28 },
  ui: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 20 },
  uiMedium: { fontFamily: fonts.sansMedium, fontSize: 15, lineHeight: 20 },
  meta: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  small: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 14 },
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, huge: 48, screen: 20 } as const;

export const radius = { sm: 8, md: 14, lg: 24, pill: 999 } as const;

// Milliseconds. Respect reduced motion: swap movement for fades and stop loops.
export const motion = {
  fast: 160,
  base: 280,
  slow: 520,
  settle: 700,
  recordingRing: 2400,
  float: 5000,
} as const;

export const hitSlop = 8; // default touch slop extension padding

// ── Legacy compat ──────────────────────────────────────────────────
// Maps old DriftTokens shape used by unmigrated files.
// Remove once all screens use the named exports above.
export const DriftTokens = {
  radius: { ...radius, full: radius.pill, xs: radius.sm, xl: radius.lg },
  spacing,
  typography: type,
  colors: palette,
} as const;
export type DriftTheme = Palette;

