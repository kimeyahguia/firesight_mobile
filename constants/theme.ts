// ────────────────────────────────────────────────────────────
// FIRESIGHT Theme
// Centralized color tokens — import this anywhere you need
// consistent colors instead of redefining them per screen.
//
// Usage:
//   import { COLORS, RISK_COLORS, ALERT_COLORS } from '@/constants/theme-colors';
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

export type RiskLevel = 'Low' | 'Moderate' | 'High';

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; dot: string }> = {
  Low: { bg: '#ECFDF5', text: '#16A34A', dot: '#16A34A' },
  Moderate: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  High: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
};

export type AlertType = 'Warning' | 'Update' | 'Drill' | 'Resolved';

export const ALERT_COLORS: Record<AlertType, { bg: string; text: string }> = {
  Warning: { bg: '#FEF2F2', text: '#DC2626' },
  Update: { bg: '#EEF2FF', text: '#6D5BD0' },
  Drill: { bg: '#FFF7ED', text: '#C2410C' },
  Resolved: { bg: '#ECFDF5', text: '#16A34A' },
};