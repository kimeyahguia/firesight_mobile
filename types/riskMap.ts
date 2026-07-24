import type { RiskLevel } from '@/constants/theme';

export interface RiskBarangay {
  id: string;
  name: string;
  lat: number;
  lng: number;
  boundary: [number, number][]; // [lat, lng] pairs, matches barangays.boundary_coords
  note: string;
  risk: RiskLevel;
  verifiedIncidents: number;
  lastIncidentAt: string | null;
}

export interface RiskMarker {
  id: string;
  referenceId: string;
  barangay: string;
  lat: number;
  lng: number;
  severity: RiskLevel;
  incidentType: string;
  status: string;
  date: string;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  description: string;
  type: string;
  timestamp: string;
}

export interface RiskThresholds {
  moderate: number;
  high: number;
  critical: number;
}

export interface RiskMapResponse {
  success: boolean;
  year: number | null;
  barangays: RiskBarangay[];
  markers: RiskMarker[];
  riskThresholds: RiskThresholds;
  message?: string;
}