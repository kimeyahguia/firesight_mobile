import BfpHeader from '@/components/bfp/bfpHeader';
import NotificationsModal from '@/components/bfp/NotificationModal';
import RiskMapView from '@/components/shared/riskMapView';
import { API_ENDPOINTS } from '@/constants/api';
import {
  COLORS,
  FONT_SIZES,
  RISK_COLORS,
  RiskLevel,
  TYPOGRAPHY,
} from '@/constants/theme';
import { useNotifications } from '@/context/NotificationsContext';
import { fetchRiskMap, RiskMapApiError } from '@/services/riskMap';
import type { RiskBarangay, RiskMarker } from '@/types/riskMap';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import type { WebView } from 'react-native-webview';

// ============================================================
// TYPES (trucks/personnel/essentials — walang binago, hiwalay sa risk map)
// ============================================================
type TruckStatus = 'On Standby' | 'Deployed' | 'Under Maintenance';
type PersonnelStatus = 'On Duty' | 'Deployed' | 'Off Duty';
type EssentialCondition = 'Good' | 'Low Stock' | 'Needs Replacement';

interface ApiTruck {
  id: string;
  name: string;
  plateNo: string;
  status: TruckStatus;
  assignedTo: string | null;
  waterCapacity: string | null;
  crew: string[];
}

interface ApiPersonnel {
  id: string;
  name: string;
  rank: string;
  status: PersonnelStatus;
  assignedTruck: string | null;
  assignedTo: string | null;
}

interface ApiEssential {
  id: string;
  name: string;
  category: 'PPE' | 'Equipment' | 'Medical';
  quantity: number;
  unit: string;
  condition: EssentialCondition;
}

interface ApiSummary {
  trucksDeployed: number;
  trucksTotal: number;
  personnelOnDuty: number;
  personnelTotal: number;
  needAttention: number;
}

const YEARS = [2023, 2024, 2025, 2026];
const LIAN_CENTER = { lat: 13.9667, lng: 120.6167 };

// ============================================================
// SHARED UI
// ============================================================
const RiskBadge: React.FC<{ risk: RiskLevel; size?: 'sm' | 'md' }> = ({ risk, size = 'md' }) => {
  const c = RISK_COLORS[risk];
  return (
    <View style={[styles.riskBadge, { backgroundColor: c.bg }, size === 'sm' && styles.riskBadgeSm]}>
      <View style={[styles.riskDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.riskBadgeText, { color: c.text }, size === 'sm' && { fontSize: FONT_SIZES.tiny }]}>
        {risk}
      </Text>
    </View>
  );
};

const StatPill: React.FC<{ value: string | number; label: string; color: string }> = ({ value, label, color }) => (
  <View style={styles.statPillCard}>
    <Text style={[styles.statPillValue, { color }]}>{value}</Text>
    <Text style={styles.statPillLabel}>{label}</Text>
  </View>
);

const TRUCK_STATUS_STYLE: Record<TruckStatus, { bg: string; text: string; dot: string }> = {
  'On Standby': { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen },
  Deployed: { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber },
  'Under Maintenance': { bg: '#FEF2F2', text: COLORS.criticalRed, dot: COLORS.criticalRed },
};

const PERSONNEL_STATUS_STYLE: Record<PersonnelStatus, { bg: string; text: string; dot: string }> = {
  'On Duty': { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen },
  Deployed: { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber },
  'Off Duty': { bg: COLORS.surfaceMuted, text: COLORS.mutedText, dot: COLORS.mutedText },
};

const CONDITION_STYLE: Record<EssentialCondition, { bg: string; text: string; dot: string }> = {
  Good: { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen },
  'Low Stock': { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber },
  'Needs Replacement': { bg: '#FEF2F2', text: COLORS.criticalRed, dot: COLORS.criticalRed },
};

function essentialIcon(category: ApiEssential['category']): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case 'PPE':
      return 'shirt';
    case 'Equipment':
      return 'construct';
    case 'Medical':
      return 'medkit';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No incidents yet';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================================
// RISK MAP TAB — ngayon gamit na ang shared RiskMapView + fetchRiskMap
// ============================================================
interface RiskMapTabProps {
  selectedYear: number;
  setSelectedYear: (y: number) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean | ((prev: boolean) => boolean)) => void;
  barangays: RiskBarangay[];
  markers: RiskMarker[];
  loading: boolean;
  error: string | null;
  selectedBarangayName: string | null;
  setSelectedBarangayName: (name: string | null) => void;
  searchQuery: string;
}

const RiskMapTab: React.FC<RiskMapTabProps> = ({
  selectedYear,
  setSelectedYear,
  showHeatmap,
  setShowHeatmap,
  barangays,
  markers,
  loading,
  error,
  selectedBarangayName,
  setSelectedBarangayName,
  searchQuery,
}) => {
  const q = searchQuery.trim().toLowerCase();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const webViewRef = useRef<WebView>(null);

  const mapHeight = useMemo(() => {
      const isLandscape = windowWidth > windowHeight;
      const base = isLandscape ? windowHeight * 0.8 : windowHeight * 0.6;
      return Math.round(Math.max(360, Math.min(620, base)));
    }, [windowWidth, windowHeight]);

  const searchedBarangays = useMemo(
    () => (!q ? barangays : barangays.filter((b) => b.name.toLowerCase().includes(q))),
    [barangays, q]
  );

  const searchedMarkers = useMemo(() => {
    const visibleNames = new Set(searchedBarangays.map((b) => b.name));
    return markers.filter((m) => visibleNames.has(m.barangay));
  }, [markers, searchedBarangays]);

  const selectedBarangay = useMemo(
    () => barangays.find((b) => b.name === selectedBarangayName) ?? null,
    [barangays, selectedBarangayName]
  );

  const recentIncidents = useMemo(() => {
    if (!selectedBarangayName) return [];
    return markers.filter((m) => m.barangay === selectedBarangayName).slice(0, 5);
  }, [markers, selectedBarangayName]);

  const handleSelectFromMap = (name: string) => {
    setSelectedBarangayName(name);
  };

  return (
    <View>
      <View style={styles.yearFilterRow}>
        {YEARS.map((y) => (
          <TouchableOpacity
            key={y}
            onPress={() => setSelectedYear(y)}
            style={[styles.yearChip, selectedYear === y && styles.yearChipActive]}
          >
            <Text style={[styles.yearChipText, selectedYear === y && styles.yearChipTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => setShowHeatmap((v) => !v)}
          style={[styles.heatToggle, showHeatmap && styles.heatToggleActive]}
        >
          <Ionicons name="flame" size={14} color={showHeatmap ? '#FFF' : COLORS.primaryOrange} />
          <Text style={[styles.heatToggleText, showHeatmap && { color: '#FFF' }]}>Heatmap</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.mapContainer, { height: mapHeight }]}>
        {loading ? (
          <View style={[styles.mapLoading, { height: mapHeight }]}>
            <ActivityIndicator color={COLORS.primaryOrange} />
          </View>
        ) : (
          <RiskMapView
            ref={webViewRef}
            barangays={searchedBarangays}
            markers={searchedMarkers}
            selectedName={selectedBarangayName}
            showHeatmap={showHeatmap}
            showMarkers
            center={LIAN_CENTER}
            zoom={11.5}
            backgroundColor={COLORS.deepIndigo}
            onSelectBarangay={handleSelectFromMap}
            style={styles.webview}
          />
        )}

        {!selectedBarangay && (
          <View style={styles.mapBadge}>
            <Ionicons name="locate" size={12} color={COLORS.accentViolet} />
            <Text style={styles.mapBadgeText}>Lian, Batangas — Fire Risk Overview</Text>
          </View>
        )}

        {/* ── Floating selected-barangay card, ala Navios-style overlay ── */}
        {selectedBarangay && (
          <View style={styles.floatingCard}>
            <TouchableOpacity
              style={styles.floatingCloseBtn}
              onPress={() => setSelectedBarangayName(null)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={14} color={COLORS.deepIndigo} />
            </TouchableOpacity>

            <View style={styles.floatingTopRow}>
              <View
                style={[
                  styles.floatingIconWrap,
                  { backgroundColor: RISK_COLORS[selectedBarangay.risk].bg },
                ]}
              >
                <Ionicons name="location" size={18} color={RISK_COLORS[selectedBarangay.risk].text} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.floatingTitle} numberOfLines={1}>
                  Barangay {selectedBarangay.name}
                </Text>
                <Text style={styles.floatingSubtitle} numberOfLines={1}>
                  {formatDate(selectedBarangay.lastIncidentAt)}
                </Text>
              </View>
              <RiskBadge risk={selectedBarangay.risk} size="sm" />
            </View>

            <View style={styles.floatingStatsRow}>
              <View style={styles.floatingStatBox}>
                <Text style={styles.floatingStatValue}>{selectedBarangay.verifiedIncidents}</Text>
                <Text style={styles.floatingStatLabel}>Verified ({selectedYear})</Text>
              </View>
              <View style={styles.floatingStatDivider} />
              <View style={styles.floatingStatBox}>
                <Text style={styles.floatingStatValue}>{recentIncidents.length}</Text>
                <Text style={styles.floatingStatLabel}>Recent Reports</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {error && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Legend</Text>
        <View style={styles.legendRow}>
          {(Object.keys(RISK_COLORS) as RiskLevel[]).map((r) => (
            <View key={r} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: RISK_COLORS[r].dot }]} />
              <Text style={styles.legendText}>{r}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionLabel}>
          Recent Incidents{selectedBarangayName ? ` — ${selectedBarangayName}` : ''}
        </Text>
        {!selectedBarangayName ? (
          <View style={styles.emptyState}>
            <Ionicons name="hand-left-outline" size={26} color={COLORS.mutedText} />
            <Text style={styles.emptyText}>Tap a barangay or marker to see details</Text>
          </View>
        ) : (
          <>
            {recentIncidents.map((inc) => (
              <View key={inc.id} style={styles.recentItem}>
                <View style={[styles.recentIconWrap, { backgroundColor: RISK_COLORS[inc.severity].bg }]}>
                  <Ionicons name="flame" size={16} color={RISK_COLORS[inc.severity].text} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.recentType}>{inc.incidentType}</Text>
                  <Text style={styles.recentDate}>{formatDate(inc.date)}</Text>
                </View>
                <RiskBadge risk={inc.severity} size="sm" />
              </View>
            ))}
            {recentIncidents.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={26} color={COLORS.mutedText} />
                <Text style={styles.emptyText}>No verified incidents this year</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
};

// ============================================================
// RESOURCE ALLOCATION TAB (walang binago)
// ============================================================
type ResSection = 'trucks' | 'personnel' | 'essentials';

const RES_SECTIONS: { key: ResSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'trucks', label: 'Fire Trucks', icon: 'car' },
  { key: 'personnel', label: 'Personnel', icon: 'people' },
  { key: 'essentials', label: 'Essentials', icon: 'shirt' },
];

interface ResourceAllocationTabProps {
  searchQuery: string;
  trucks: ApiTruck[];
  personnel: ApiPersonnel[];
  essentials: ApiEssential[];
  loading: boolean;
  error: string | null;
}

const ResourceAllocationTab: React.FC<ResourceAllocationTabProps> = ({
  searchQuery,
  trucks,
  personnel,
  essentials,
  loading,
  error,
}) => {
  const [section, setSection] = useState<ResSection>('trucks');
  const q = searchQuery.trim().toLowerCase();

  const filteredTrucks = useMemo(
    () => (!q ? trucks : trucks.filter((t) => t.name.toLowerCase().includes(q) || t.plateNo.toLowerCase().includes(q))),
    [trucks, q]
  );
  const filteredPersonnel = useMemo(
    () => (!q ? personnel : personnel.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q))),
    [personnel, q]
  );
  const filteredEssentials = useMemo(
    () => (!q ? essentials : essentials.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))),
    [essentials, q]
  );

  if (loading) {
    return (
      <View style={styles.mapLoading}>
        <ActivityIndicator color={COLORS.primaryOrange} />
      </View>
    );
  }

  return (
    <View>
      {error && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.filterRow}>
        {RES_SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.filterChip, section === s.key && styles.filterChipActive]}
          >
            <Ionicons
              name={s.icon}
              size={14}
              color={section === s.key ? '#FFFFFF' : COLORS.slateText}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.filterChipText, section === s.key && styles.filterChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'trucks' && (
        <View style={styles.resList}>
          {filteredTrucks.map((t) => {
            const s = TRUCK_STATUS_STYLE[t.status];
            return (
              <View key={t.id} style={styles.truckCard}>
                <View style={styles.resTopRow}>
                  <View style={styles.truckTitleRow}>
                    <View style={[styles.resIconWrap, { backgroundColor: s.bg }]}>
                      <Ionicons name="car" size={18} color={s.text} />
                    </View>
                    <View>
                      <Text style={styles.resName}>{t.name}</Text>
                      <Text style={styles.resMeta}>{t.plateNo}{t.waterCapacity ? ` · ${t.waterCapacity}` : ''}</Text>
                    </View>
                  </View>
                  <View style={[styles.resStatusBadge, { backgroundColor: s.bg }]}>
                    <View style={[styles.resStatusDot, { backgroundColor: s.dot }]} />
                    <Text style={[styles.resStatusText, { color: s.text }]}>{t.status}</Text>
                  </View>
                </View>

                {t.assignedTo && (
                  <View style={styles.truckAssignRow}>
                    <Ionicons name="location" size={12} color={COLORS.mutedText} />
                    <Text style={styles.truckAssignText}>Deployed to {t.assignedTo}</Text>
                  </View>
                )}

                <View style={styles.crewWrap}>
                  <Text style={styles.crewLabel}>Crew ({t.crew.length})</Text>
                  <View style={styles.crewChipsRow}>
                    {t.crew.map((name) => (
                      <View key={name} style={styles.crewChip}>
                        <Text style={styles.crewChipText}>{name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
          {filteredTrucks.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={26} color={COLORS.mutedText} />
              <Text style={styles.emptyText}>No matching trucks</Text>
            </View>
          )}
        </View>
      )}

      {section === 'personnel' && (
        <View style={styles.resList}>
          {filteredPersonnel.map((p) => {
            const s = PERSONNEL_STATUS_STYLE[p.status];
            return (
              <View key={p.id} style={styles.resCard}>
                <View style={[styles.resIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name="person" size={18} color={s.text} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.resTopRow}>
                    <Text style={styles.resName}>{p.name}</Text>
                    <View style={[styles.resStatusBadge, { backgroundColor: s.bg }]}>
                      <View style={[styles.resStatusDot, { backgroundColor: s.dot }]} />
                      <Text style={[styles.resStatusText, { color: s.text }]}>{p.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.resMeta}>
                    {p.rank}
                    {p.assignedTruck ? ` · ${p.assignedTruck}` : ''}
                    {p.assignedTo ? ` · ${p.assignedTo}` : ''}
                  </Text>
                </View>
              </View>
            );
          })}
          {filteredPersonnel.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={26} color={COLORS.mutedText} />
              <Text style={styles.emptyText}>No matching personnel</Text>
            </View>
          )}
        </View>
      )}

      {section === 'essentials' && (
        <View style={styles.resList}>
          {filteredEssentials.map((e) => {
            const s = CONDITION_STYLE[e.condition];
            return (
              <View key={e.id} style={styles.resCard}>
                <View style={[styles.resIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={essentialIcon(e.category)} size={18} color={s.text} />
                </View>
                <View style={styles.flex1}>
                  <View style={styles.resTopRow}>
                    <Text style={styles.resName}>{e.name}</Text>
                    <View style={[styles.resStatusBadge, { backgroundColor: s.bg }]}>
                      <View style={[styles.resStatusDot, { backgroundColor: s.dot }]} />
                      <Text style={[styles.resStatusText, { color: s.text }]}>{e.condition}</Text>
                    </View>
                  </View>
                  <Text style={styles.resMeta}>
                    {e.category} · {e.quantity} {e.unit}
                  </Text>
                </View>
              </View>
            );
          })}
          {filteredEssentials.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={26} color={COLORS.mutedText} />
              <Text style={styles.emptyText}>No matching items</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ============================================================
// MAIN COMBINED SCREEN
// ============================================================
type MainView = 'map' | 'resources';

export default function AlertsScreen() {
  const [view, setView] = useState<MainView>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedBarangayName, setSelectedBarangayName] = useState<string | null>(null);
  const router = useRouter();

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const { unreadCount } = useNotifications();

  // ── Risk map data — shared endpoint + service, same source as User app ──
  const [barangays, setBarangays] = useState<RiskBarangay[]>([]);
  const [markers, setMarkers] = useState<RiskMarker[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // ── Resource allocation data (walang binago) ──
  const [trucks, setTrucks] = useState<ApiTruck[]>([]);
  const [personnel, setPersonnel] = useState<ApiPersonnel[]>([]);
  const [essentials, setEssentials] = useState<ApiEssential[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [resLoading, setResLoading] = useState(true);
  const [resError, setResError] = useState<string | null>(null);

  const loadRiskMap = useCallback(async (year: number) => {
    setMapLoading(true);
    setMapError(null);
    try {
      const { barangays: data, markers: markerData } = await fetchRiskMap(year);
      setBarangays(data);
      setMarkers(markerData);
    } catch (e) {
      setMapError(e instanceof RiskMapApiError ? e.message : 'Failed to load risk map');
    } finally {
      setMapLoading(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    setResLoading(true);
    setResError(null);
    try {
      const [trucksRes, personnelRes, essentialsRes, summaryRes] = await Promise.all([
        fetch(API_ENDPOINTS.bfpResourceTrucks),
        fetch(API_ENDPOINTS.bfpResourcePersonnel),
        fetch(API_ENDPOINTS.bfpResourceEssentials),
        fetch(API_ENDPOINTS.bfpResourceSummary),
      ]);
      const [trucksJson, personnelJson, essentialsJson, summaryJson] = await Promise.all([
        trucksRes.json(), personnelRes.json(), essentialsRes.json(), summaryRes.json(),
      ]);

      if (!trucksJson.success) throw new Error(trucksJson.message || 'Failed to load trucks');
      if (!personnelJson.success) throw new Error(personnelJson.message || 'Failed to load personnel');
      if (!essentialsJson.success) throw new Error(essentialsJson.message || 'Failed to load essentials');
      if (!summaryJson.success) throw new Error(summaryJson.message || 'Failed to load summary');

      setTrucks(trucksJson.data ?? []);
      setPersonnel(personnelJson.data ?? []);
      setEssentials(essentialsJson.data ?? []);
      setSummary(summaryJson.data ?? null);
    } catch (e: any) {
      setResError(e?.message ?? 'Failed to load resource data');
    } finally {
      setResLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiskMap(selectedYear);
  }, [selectedYear, loadRiskMap]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const criticalCount = markers.filter((m) => m.severity === 'Critical').length;
  const highCount = markers.filter((m) => m.severity === 'High').length;
  const moderateCount = markers.filter((m) => m.severity === 'Moderate').length;

  const handleFilterPress = () => {
    if (view === 'map') setShowHeatmap((v) => !v);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <NotificationsModal visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <BfpHeader unreadNotifCount={unreadCount} onBellPress={() => setNotifModalVisible(true)}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowLeft}>
            <Text style={styles.eyebrowText}>BFP LIAN FIRE STATION</Text>
          </View>
          <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7} onPress={handleFilterPress}>
            <Ionicons name="filter" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Risk Center</Text>

        <View style={styles.statCardsRow}>
          {view === 'map' ? (
            <>
              <StatPill value={criticalCount} label="Critical" color={RISK_COLORS.Critical.dot} />
              <StatPill value={highCount} label="High Risk" color={RISK_COLORS.High.dot} />
              <StatPill value={moderateCount} label="Moderate" color={RISK_COLORS.Moderate.dot} />
            </>
          ) : (
            <>
              <StatPill
                value={summary ? `${summary.trucksDeployed}/${summary.trucksTotal}` : '—'}
                label="Trucks Out"
                color={COLORS.warningAmber}
              />
              <StatPill
                value={summary ? `${summary.personnelOnDuty}/${summary.personnelTotal}` : '—'}
                label="On Duty"
                color={COLORS.successGreen}
              />
              <StatPill
                value={summary ? summary.needAttention : '—'}
                label="Need Attention"
                color={COLORS.criticalRed}
              />
            </>
          )}
        </View>
      </BfpHeader>

      <View style={styles.body}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.mutedText} />
          <TextInput
            style={styles.searchInput}
            placeholder={view === 'map' ? 'Search by barangay...' : 'Search by unit, personnel, or item...'}
            placeholderTextColor={COLORS.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.mutedText} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentBtn, view === 'map' && styles.segmentBtnActive]}
            onPress={() => setView('map')}
          >
            <Ionicons name="map" size={16} color={view === 'map' ? '#FFF' : COLORS.slateText} />
            <Text style={[styles.segmentText, view === 'map' && styles.segmentTextActive]}>Risk Map</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, view === 'resources' && styles.segmentBtnActive]}
            onPress={() => setView('resources')}
          >
            <Ionicons name="cube-outline" size={16} color={view === 'resources' ? '#FFF' : COLORS.slateText} />
            <Text style={[styles.segmentText, view === 'resources' && styles.segmentTextActive]}>
              Resource Allocation
            </Text>
          </TouchableOpacity>
        </View>

        {view === 'map' ? (
          <RiskMapTab
            selectedYear={selectedYear}
            setSelectedYear={setSelectedYear}
            showHeatmap={showHeatmap}
            setShowHeatmap={setShowHeatmap}
            barangays={barangays}
            markers={markers}
            loading={mapLoading}
            error={mapError}
            selectedBarangayName={selectedBarangayName}
            setSelectedBarangayName={setSelectedBarangayName}
            searchQuery={searchQuery}
          />
        ) : (
          <ResourceAllocationTab
            searchQuery={searchQuery}
            trucks={trucks}
            personnel={personnel}
            essentials={essentials}
            loading={resLoading}
            error={resError}
          />
        )}
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES (walang binago)
// ============================================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },

  heroHeader: { backgroundColor: COLORS.deepIndigo, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 30 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrowText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8 },
  filterIconBtn: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: { fontSize: FONT_SIZES.cardTitle + 4, fontWeight: '800', color: '#FFFFFF', marginTop: 3, marginLeft: 2 },

  statCardsRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  statPillCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  statPillValue: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800' },
  statPillLabel: { fontSize: FONT_SIZES.tiny, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginTop: 3 },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  body: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
      marginTop: -16,
    },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 40,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.caption, color: COLORS.deepIndigo, fontWeight: '500' },

  segmentWrap: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 35, borderRadius: 11 },
  segmentBtnActive: {
    backgroundColor: COLORS.primaryOrange,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentText: { ...TYPOGRAPHY.secondary, fontWeight: '700', color: COLORS.slateText },
  segmentTextActive: { color: '#FFFFFF' },

  yearFilterRow: { flexDirection: 'row', marginBottom: 10, gap: 8, alignItems: 'center' },
  yearChip: {
    paddingHorizontal: 14, height: 35, justifyContent: 'center', borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  yearChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  yearChipText: { color: COLORS.slateText, fontWeight: '700', fontSize: FONT_SIZES.caption },
  yearChipTextActive: { color: '#FFFFFF' },
  heatToggle: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 35, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.primaryOrange,
  },
  heatToggleActive: {
    backgroundColor: COLORS.primaryOrange,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  heatToggleText: { color: COLORS.primaryOrange, fontSize: FONT_SIZES.tiny, fontWeight: '700' },

  mapContainer: {
    width: '100%', borderRadius: 10, backgroundColor: COLORS.deepIndigo, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    marginBottom: 10,
  },
  webview: { flex: 2, backgroundColor: COLORS.deepIndigo },
  mapLoading: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  mapBadge: {
    position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(30,27,75,0.85)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  mapBadgeText: { color: '#E7E5F5', fontSize: FONT_SIZES.tiny, fontWeight: '600' },

  card: {
    marginTop: 0, marginBottom: 14, padding: 16, borderRadius: 20, backgroundColor: COLORS.card,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  errorText: { color: COLORS.criticalRed, fontSize: FONT_SIZES.caption, fontWeight: '600' },
  sectionLabel: { ...TYPOGRAPHY.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 10 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 5, height: 5, borderRadius: 5 },
  legendText: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, fontWeight: '600' },

  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  riskBadgeSm: { paddingHorizontal: 4, paddingVertical: 2 },
  riskDot: { width: 3, height: 3, borderRadius: 1 },
  riskBadgeText: { fontSize: FONT_SIZES.caption, fontWeight: '700' },

  // ── Floating map overlay card (selected barangay) ──
  floatingCard: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  floatingCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  floatingTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 26 },
  floatingIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  floatingTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo },
  floatingSubtitle: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 1, fontWeight: '500' },
  floatingStatsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 12, paddingVertical: 10,
  },
  floatingStatBox: { flex: 1, alignItems: 'center' },
  floatingStatDivider: { width: 1, height: 26, backgroundColor: COLORS.border },
  floatingStatValue: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo },
  floatingStatLabel: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600', marginTop: 2 },

  infoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.deepIndigo },
  infoSubtitle: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: {
    flex: 1, backgroundColor: COLORS.surfaceMuted, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statValue: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '800' },
  statLabel: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600', textAlign: 'center' },

  recentSection: { marginTop: 4 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 16,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  recentIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentType: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '700' },
  recentDate: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, marginTop: 2 },

  filterRow: { flexDirection: 'row', marginBottom: 14, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, justifyContent: 'center',
    borderRadius: 20, backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterChipText: { color: COLORS.slateText, fontWeight: '700', fontSize: FONT_SIZES.caption },
  filterChipTextActive: { color: '#FFFFFF' },

  resList: { gap: 10, paddingBottom: 20 },
  resCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  resIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  resTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resName: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, flex: 1, marginRight: 8 },
  resMeta: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 2 },
  resStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  resStatusDot: { width: 5, height: 5, borderRadius: 3 },
  resStatusText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },

  truckCard: { backgroundColor: COLORS.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  truckTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  truckAssignRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 2 },
  truckAssignText: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },
  crewWrap: { marginTop: 2 },
  crewLabel: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.mutedText, marginBottom: 6 },
  crewChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  crewChip: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  crewChipText: { fontSize: FONT_SIZES.tiny, fontWeight: '600', color: COLORS.deepIndigo },

  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10 },
  emptyText: { color: COLORS.mutedText, fontSize: FONT_SIZES.secondary, fontWeight: '600', textAlign: 'center' },
});