import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import type { RecentActivityItem, RiskBarangay, RiskMapResponse, RiskMarker, RiskThresholds } from '@/types/riskMap';

export interface IncidentHistoryItem {
  id: number | string;
  reference_id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  incident_date: string;
  verified_date: string | null;
}

export async function fetchIncidentHistory(barangayId: string): Promise<IncidentHistoryItem[]> {
  const res = await fetch(`${API_BASE_URL}/history.php?barangay_id=${barangayId}`);
  const json = await res.json();
  if (!json.success) throw new RiskMapApiError(json.message || 'Failed to load incident history.');
  return json.data;
}
// Shape na ginagamit ng BFP dashboard mini-map (buildDashboardMapHtml) —
// simplified na bersyon ng RiskBarangay, "incidents" instead of "verifiedIncidents".
export type BarangayData = Pick<RiskBarangay, 'id' | 'name' | 'risk' | 'boundary'> & {
  incidents: number;
};
export class RiskMapApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RiskMapApiError';
  }
}



/**
 * Single fetch function for the shared risk map endpoint.
 * Used by BOTH the User (map.tsx) and BFP (alerts.tsx) screens —
 * no more duplicated fetch logic or divergent risk formulas.
 */
export async function fetchRiskMap(year?: number): Promise<{
  barangays: RiskBarangay[];
  markers: RiskMarker[];
  thresholds: RiskThresholds;
}> {
  const url = year ? `${API_ENDPOINTS.riskMap}?year=${year}` : API_ENDPOINTS.riskMap;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new RiskMapApiError('Unable to reach the server. Check your connection.');
  }

  let json: RiskMapResponse;
  try {
    json = await res.json();
  } catch {
    throw new RiskMapApiError('Received an invalid response from the server.');
  }

  if (!res.ok || !json.success) {
    throw new RiskMapApiError(json.message ?? 'Failed to load risk map data.');
  }

  return {
    barangays: json.barangays ?? [],
    markers: json.markers ?? [],
    thresholds: json.riskThresholds ?? { moderate: 0, high: 0, critical: 0 },
  };
}

export async function fetchRecentIncidents(): Promise<RecentActivityItem[]> {
  let res: Response;
  try {
    res = await fetch(API_ENDPOINTS.mapRecentIncidents);
  } catch {
    throw new RiskMapApiError('Unable to reach the server. Check your connection.');
  }

  let json: { success: boolean; data?: Array<{
    id?: string | number;
    reference_id?: string | number;
    title?: string;
    description?: string;
    type?: string;
    created_at?: string;
  }>; message?: string };

  try {
    json = await res.json();
  } catch {
    throw new RiskMapApiError('Received an invalid response from the server.');
  }

  if (!res.ok || !json.success) {
    throw new RiskMapApiError(json.message ?? 'Failed to load recent activity.');
  }

  return (json.data ?? []).map((item, index) => ({
    id: String(item.id ?? item.reference_id ?? index),
    title: item.title ?? 'Recent incident',
    description: item.description ?? 'No description provided.',
    type: item.type ?? 'Incident',
    timestamp: item.created_at ?? '',
  }));
}
