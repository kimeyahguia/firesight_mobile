

import { Ionicons } from '@expo/vector-icons';

// ────────────────────────────────────────────────────────────
// Shared domain types for FIRESIGHT
// ────────────────────────────────────────────────────────────

export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type AlertType = 'Advisory' | 'Warning' | 'Critical' | 'Resolved' | 'Drill';
export type IncidentStatus = 'pending' | 'verified' | 'dispatched' | 'ongoing' | 'resolved' | 'rejected';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  emphasized?: boolean;
}
export interface HomeAlert {
  id: string;
  title: string;
  description: string;
  type: string;
  timestamp: string;
}

export interface BarangayRisk {
  id: string;
  name: string;
  risk: RiskLevel;
  incidents: number;
  updatedAt?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  icon: string;
}

export interface HomeResource {
  id: string;
  category: string;
  title: string;
  snippet: string;
  content?: string;
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
