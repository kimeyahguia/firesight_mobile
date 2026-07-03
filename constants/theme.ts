// ────────────────────────────────────────────────────────────
// FIRESIGHT Theme
// Centralized color + typography tokens — import this anywhere
// you need consistent colors/text sizes instead of redefining
// them per screen.
//
// Usage:
//   import { COLORS, RISK_COLORS, ALERT_COLORS, FONT_SIZES, TYPOGRAPHY } from '@/constants/theme-colors';
// ────────────────────────────────────────────────────────────

export const COLORS = {
  // Brand
  primaryOrange: '#F97316',
  deepIndigo: '#1E1B4B',
  accentViolet: '#6D5BD0',

  // Text
  slateText: '#5B5A78',
  mutedText: '#A6A4C2',

  // Surfaces
  background: '#FFFFFF',
  card: '#FFFFFF',
  surfaceMuted: '#F4F3FB',
  border: '#E7E5F5',

  // Status
  warningAmber: '#F59E0B',
  successGreen: '#16A34A',
  criticalRed: '#DC2626',

  // Misc fixed tones used in specific components
  contactIconBg: '#FFF1E6',
} as const;

import type { AlertType, RiskLevel } from './types';

export type { AlertType, RiskLevel };

export const RISK_COLORS: Record<RiskLevel, { dot: string; bg: string; text: string }> = {
  Low: { dot: COLORS.successGreen, bg: '#ECFDF5', text: COLORS.successGreen },
  Moderate: { dot: COLORS.warningAmber, bg: '#FFFBEB', text: '#B45309' },
  High: { dot: COLORS.criticalRed, bg: '#FEF2F2', text: COLORS.criticalRed },
  Critical: { dot: '#B91C1C', bg: '#FEE2E2', text: '#B91C1C' },
};

export const ALERT_COLORS: Record<AlertType, { dot: string; bg: string; text: string }> = {
  Advisory: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet },
  Warning: { dot: COLORS.warningAmber, bg: '#FFFBEB', text: '#B45309' },
  Critical: { dot: COLORS.criticalRed, bg: '#FEF2F2', text: COLORS.criticalRed },
  Resolved: { dot: COLORS.successGreen, bg: '#ECFDF5', text: COLORS.successGreen },
  Drill: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet },
};


// ────────────────────────────────────────────────────────────
// Typography Scale
// One source of truth for font sizes across the app.
// Use FONT_SIZES.xxx directly in StyleSheet, or spread
// TYPOGRAPHY.xxx for size + matching lineHeight/fontWeight.
// ────────────────────────────────────────────────────────────

export const FONT_SIZES = {
  display: 40,       // Hero numbers, splash screens
  heroTitle: 32,      // Hero Title
  screenTitle: 28,    // Screen Title
  sectionHeading: 22, // Section Heading
  appBar: 20,         // App Bar
  cardTitle: 18,      // Card Title / Subheading
  body: 16,           // Body / Buttons / Inputs (most common)
  secondary: 14,      // Secondary Text
  caption: 12,        // Caption
  tiny: 11,           // Tiny Labels
} as const;

export type FontSizeKey = keyof typeof FONT_SIZES;

interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700' | '800';
}

export const TYPOGRAPHY: Record<FontSizeKey, TypographyStyle> = {
  display: { fontSize: FONT_SIZES.display, lineHeight: 46, fontWeight: '800' },
  heroTitle: { fontSize: FONT_SIZES.heroTitle, lineHeight: 38, fontWeight: '700' },
  screenTitle: { fontSize: FONT_SIZES.screenTitle, lineHeight: 34, fontWeight: '700' },
  sectionHeading: { fontSize: FONT_SIZES.sectionHeading, lineHeight: 28, fontWeight: '700' },
  appBar: { fontSize: FONT_SIZES.appBar, lineHeight: 26, fontWeight: '700' },
  cardTitle: { fontSize: FONT_SIZES.cardTitle, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: FONT_SIZES.body, lineHeight: 22, fontWeight: '400' },
  secondary: { fontSize: FONT_SIZES.secondary, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: FONT_SIZES.caption, lineHeight: 16, fontWeight: '500' },
  tiny: { fontSize: FONT_SIZES.tiny, lineHeight: 14, fontWeight: '600' },
} as const;