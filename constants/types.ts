import { Ionicons } from '@expo/vector-icons';

// ────────────────────────────────────────────────────────────
// Shared domain types for FIRESIGHT
// ────────────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type AlertType = 'Advisory' | 'Warning' | 'Critical' | 'Resolved' | 'Drill';
export type IncidentStatus = 'Active' | 'Responding' | 'Verified' | 'Resolved';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  emphasized?: boolean;
}

export interface BarangayRisk {
  id: string;
  name: string;
  risk: RiskLevel;
  incidents: number;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: AlertType;
}

export interface ResourceItem {
  id: string;
  title: string;
  snippet: string;
  category: string;
}