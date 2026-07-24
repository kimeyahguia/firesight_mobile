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

// Minimal local type declarations to avoid dependency on a separate './types' file
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export const RISK_COLORS: Record<RiskLevel, { dot: string; bg: string; text: string }> = {
  Low: { dot: COLORS.successGreen, bg: '#ECFDF5', text: COLORS.successGreen },
  Moderate: { dot: COLORS.warningAmber, bg: '#FFFBEB', text: '#B45309' },
  High: { dot: COLORS.criticalRed, bg: '#FEF2F2', text: COLORS.criticalRed },
  Critical: { dot: '#B91C1C', bg: '#FEE2E2', text: '#B91C1C' },
};

export type AlertType = 'Advisory' | 'Warning' | 'Critical' | 'Resolved' | 'Drill' | 'Info';

export const ALERT_COLORS: Record<AlertType, { dot: string; bg: string; text: string }> = {
  Advisory: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet },
  Warning: { dot: COLORS.warningAmber, bg: '#FFFBEB', text: '#B45309' },
  Critical: { dot: COLORS.criticalRed, bg: '#FEF2F2', text: COLORS.criticalRed },
  Resolved: { dot: COLORS.successGreen, bg: '#ECFDF5', text: COLORS.successGreen },
  Drill: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet },
  Info: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet },
};

export type IncidentStatus = 'pending' | 'verified' | 'dispatched' | 'ongoing' | 'resolved' | 'rejected';

export const STATUS_COLORS: Record<IncidentStatus, { dot: string; bg: string; text: string; label: string }> = {
  pending:    { dot: COLORS.warningAmber, bg: '#FFFBEB', text: '#B45309', label: 'Pending' },
  verified:   { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet, label: 'Verified' },
  dispatched: { dot: COLORS.accentViolet, bg: '#EEF2FF', text: COLORS.accentViolet, label: 'Dispatched' },
  ongoing:    { dot: COLORS.primaryOrange, bg: '#FFF7ED', text: COLORS.primaryOrange, label: 'Ongoing' },
  resolved:   { dot: COLORS.successGreen, bg: '#ECFDF5', text: COLORS.successGreen, label: 'Resolved' },
  rejected:   { dot: COLORS.criticalRed, bg: '#FEF2F2', text: COLORS.criticalRed, label: 'Rejected' },
};

// Also add 'Info' here since it exists in your alerts DB data but was missing before:
// (update your existing AlertType + ALERT_COLORS to include this)


// ────────────────────────────────────────────────────────────
// Typography Scale
// One source of truth for font sizes across the app.
// Use FONT_SIZES.xxx directly in StyleSheet, or spread
// TYPOGRAPHY.xxx for size + matching lineHeight/fontWeight.
// ────────────────────────────────────────────────────────────

export const FONT_SIZES = {
  display: 40,        // Hero numbers, splash screens
  heroTitle: 32,       // Hero Title / Screen Title (upper range)
  screenTitle: 28,     // Screen Title (lower range)
  sectionHeading: 22,  // Section Title
  appBar: 20,          // App Bar
  cardTitle: 18,       // Incident Title / Card Title
  body: 16,            // Body / Button / Input Text
  secondary: 14,       // Input Label / Card Description
  caption: 12,         // Bottom Navigation / Timestamp
  tiny: 12,            // Emergency Badge (bold)
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
  tiny: { fontSize: FONT_SIZES.tiny, lineHeight: 16, fontWeight: '700' },
} as const;