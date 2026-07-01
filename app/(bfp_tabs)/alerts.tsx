import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import {
  COLORS,
  RISK_COLORS,
  ALERT_COLORS,
  FONT_SIZES,
  TYPOGRAPHY,
  RiskLevel,
  AlertType,
} from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================
interface FireIncidentMarker {
  id: string;
  barangay: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  year: number;
}

interface BarangayInfo {
  id: string;
  name: string;
  risk: RiskLevel;
  population: number;
  incidentsThisYear: number;
  lastIncidentDate: string;
  responseTimeAvg: string;
}

interface RecentIncident {
  id: string;
  barangay: string;
  type: string;
  date: string;
  severity: RiskLevel;
}

type NotifCategory = 'emergency' | 'assigned' | 'verification' | 'dispatch' | 'status';
type FilterKey = 'all' | 'emergency' | 'assigned' | 'updates';

interface NotificationItem {
  id: string;
  category: NotifCategory;
  alertType: AlertType;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  unread: boolean;
}

// ============================================================
// MOCK DATA
// ============================================================
const YEARS = [2023, 2024, 2025, 2026];

// Approximate coordinates around Lian, Batangas
const LIAN_CENTER = { lat: 13.9667, lng: 120.6167 };

const FIRE_MARKERS: FireIncidentMarker[] = [
  { id: 'm1', barangay: 'Bucana', lat: 13.9705, lng: 120.6105, risk: 'High', year: 2026 },
  { id: 'm2', barangay: 'Poblacion', lat: 13.9667, lng: 120.6167, risk: 'High', year: 2026 },
  { id: 'm3', barangay: 'Rizal', lat: 13.9612, lng: 120.6225, risk: 'Moderate', year: 2025 },
  { id: 'm4', barangay: 'Tulay', lat: 13.9720, lng: 120.6225, risk: 'Low', year: 2025 },
  { id: 'm5', barangay: 'Sampaloc', lat: 13.9598, lng: 120.6098, risk: 'High', year: 2026 },
  { id: 'm6', barangay: 'Palico', lat: 13.9750, lng: 120.6280, risk: 'High', year: 2024 },
  { id: 'm7', barangay: 'Matabungkay', lat: 13.9550, lng: 120.6280, risk: 'Moderate', year: 2026 },
];

const BARANGAY_INFO: BarangayInfo = {
  id: 'm1',
  name: 'Bucana',
  risk: 'High',
  population: 4820,
  incidentsThisYear: 6,
  lastIncidentDate: 'Jun 24, 2026',
  responseTimeAvg: '8.4 min',
};

const RECENT_INCIDENTS: RecentIncident[] = [
  { id: 'ri1', barangay: 'Bucana', type: 'Structural Fire', date: 'Jun 24, 2026', severity: 'High' },
  { id: 'ri2', barangay: 'Bucana', type: 'Grass Fire', date: 'May 30, 2026', severity: 'Moderate' },
  { id: 'ri3', barangay: 'Bucana', type: 'Electrical Fire', date: 'Apr 12, 2026', severity: 'High' },
];

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    category: 'emergency',
    alertType: 'Warning',
    title: 'Active Fire Reported',
    description: 'Structural fire reported near Purok 3, Barangay Bucana. Immediate response required.',
    timestamp: '2 min ago',
    status: 'Critical',
    unread: true,
  },
  {
    id: 'n2',
    category: 'assigned',
    alertType: 'Update',
    title: 'New Incident Assigned',
    description: 'You have been assigned to Incident #FS-2026-0142 in Barangay Poblacion.',
    timestamp: '18 min ago',
    status: 'Assigned',
    unread: true,
  },
  {
    id: 'n3',
    category: 'verification',
    alertType: 'Drill',
    title: 'Verification Request',
    description: 'A citizen report from Barangay Rizal needs verification before dispatch.',
    timestamp: '45 min ago',
    status: 'Pending',
    unread: true,
  },
  {
    id: 'n4',
    category: 'dispatch',
    alertType: 'Update',
    title: 'Dispatch Update',
    description: 'Engine 2 has arrived on scene at Barangay Sampaloc. ETA for full containment: 20 min.',
    timestamp: '1 hr ago',
    status: 'En Route',
    unread: false,
  },
  {
    id: 'n5',
    category: 'status',
    alertType: 'Resolved',
    title: 'Incident Status Updated',
    description: 'Incident #FS-2026-0138 in Barangay Palico has been marked as resolved.',
    timestamp: '3 hrs ago',
    status: 'Resolved',
    unread: false,
  },
  {
    id: 'n6',
    category: 'emergency',
    alertType: 'Warning',
    title: 'Heat Alert Issued',
    description: 'High temperature and dry conditions detected in Matabungkay. Fire risk elevated.',
    timestamp: '5 hrs ago',
    status: 'High Risk',
    unread: false,
  },
  {
    id: 'n7',
    category: 'status',
    alertType: 'Resolved',
    title: 'Report Closed',
    description: 'Grass fire incident in Barangay Tulay has been closed with no casualties.',
    timestamp: 'Yesterday',
    status: 'Closed',
    unread: false,
  },
];

// ============================================================
// SHARED
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

const categoryIcon = (cat: NotifCategory): keyof typeof Ionicons.glyphMap => {
  switch (cat) {
    case 'emergency':
      return 'flame';
    case 'assigned':
      return 'person-add';
    case 'verification':
      return 'shield-checkmark';
    case 'dispatch':
      return 'car';
    case 'status':
      return 'checkmark-done-circle';
  }
};

// ============================================================
// LEAFLET MAP HTML BUILDER
// ============================================================
function buildLeafletHtml(
  markers: FireIncidentMarker[],
  showHeatmap: boolean,
  selectedId: string | null
): string {
  const markerData = markers.map((m) => ({
    id: m.id,
    barangay: m.barangay,
    lat: m.lat,
    lng: m.lng,
    color: RISK_COLORS[m.risk].dot,
    weight: m.risk === 'High' ? 1 : m.risk === 'Moderate' ? 0.6 : 0.3,
  }));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${COLORS.deepIndigo}; }
    .leaflet-control-attribution { font-size: 9px; }
    .fire-pin {
      width: 28px; height: 28px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-size: 15px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: true })
      .setView([${LIAN_CENTER.lat}, ${LIAN_CENTER.lng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const markers = ${JSON.stringify(markerData)};

    ${showHeatmap ? `
    const heatPoints = markers.map(m => [m.lat, m.lng, m.weight]);
    L.heatLayer(heatPoints, { radius: 45, blur: 35, maxZoom: 15 }).addTo(map);
    ` : ''}

    markers.forEach(m => {
      const isSelected = m.id === ${JSON.stringify(selectedId)};
      const icon = L.divIcon({
        className: '',
        html: '<div class="fire-pin" style="background:' + (isSelected ? m.color : '${COLORS.deepIndigo}') + '; border-color:' + m.color + ';">🔥</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      marker.on('click', () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: m.id }));
      });
    });
  </script>
</body>
</html>
  `;
}

// ============================================================
// RISK MAP TAB
// ============================================================
const RiskMapTab: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedMarker, setSelectedMarker] = useState<FireIncidentMarker | null>(FIRE_MARKERS[0]);

  const visibleMarkers = useMemo(
    () => FIRE_MARKERS.filter((m) => m.year === selectedYear),
    [selectedYear]
  );

  const mapHtml = useMemo(
    () => buildLeafletHtml(visibleMarkers, showHeatmap, selectedMarker?.id ?? null),
    [visibleMarkers, showHeatmap, selectedMarker]
  );

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerPress') {
        const found = FIRE_MARKERS.find((m) => m.id === data.id);
        if (found) setSelectedMarker(found);
      }
    } catch (e) {
      // ignore malformed messages
    }
  };

  return (
    <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Year Filter */}
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

      {/* Leaflet Map Section */}
      <View style={styles.mapContainer}>
        <WebView
          key={`${selectedYear}-${showHeatmap}-${selectedMarker?.id}`}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleWebViewMessage}
          startInLoadingState
        />

        <View style={styles.mapBadge}>
          <Ionicons name="locate" size={12} color={COLORS.accentViolet} />
          <Text style={styles.mapBadgeText}>Lian, Batangas — Fire Risk Overview</Text>
        </View>
      </View>

      {/* Legend */}
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

      {/* Selected Barangay Info */}
      {selectedMarker && (
        <View style={styles.card}>
          <View style={styles.infoHeaderRow}>
            <View>
              <Text style={styles.infoTitle}>Barangay {BARANGAY_INFO.name}</Text>
              <Text style={styles.infoSubtitle}>Selected area details</Text>
            </View>
            <RiskBadge risk={BARANGAY_INFO.risk} />
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Ionicons name="people" size={16} color={COLORS.slateText} />
              <Text style={styles.statValue}>{BARANGAY_INFO.population.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Population</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="flame" size={16} color={COLORS.slateText} />
              <Text style={styles.statValue}>{BARANGAY_INFO.incidentsThisYear}</Text>
              <Text style={styles.statLabel}>Incidents ({selectedYear})</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time" size={16} color={COLORS.slateText} />
              <Text style={styles.statValue}>{BARANGAY_INFO.responseTimeAvg}</Text>
              <Text style={styles.statLabel}>Avg Response</Text>
            </View>
          </View>

          <View style={styles.lastIncidentRow}>
            <Ionicons name="calendar" size={14} color={COLORS.mutedText} />
            <Text style={styles.lastIncidentText}>Last incident: {BARANGAY_INFO.lastIncidentDate}</Text>
          </View>
        </View>
      )}

      {/* Recent Incidents */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionLabel}>Recent Incidents — {BARANGAY_INFO.name}</Text>
        {RECENT_INCIDENTS.map((inc) => (
          <View key={inc.id} style={styles.recentItem}>
            <View style={[styles.recentIconWrap, { backgroundColor: RISK_COLORS[inc.severity].bg }]}>
              <Ionicons name="flame" size={16} color={RISK_COLORS[inc.severity].text} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.recentType}>{inc.type}</Text>
              <Text style={styles.recentDate}>{inc.date}</Text>
            </View>
            <RiskBadge risk={inc.severity} size="sm" />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

// ============================================================
// NOTIFICATIONS TAB
// ============================================================
const FILTER_MAP: Record<FilterKey, NotifCategory[] | null> = {
  all: null,
  emergency: ['emergency'],
  assigned: ['assigned'],
  updates: ['dispatch', 'status', 'verification'],
};

const NotificationsTab: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    const cats = FILTER_MAP[activeFilter];
    if (!cats) return NOTIFICATIONS;
    return NOTIFICATIONS.filter((n) => cats.includes(n.category));
  }, [activeFilter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'assigned', label: 'Assigned' },
    { key: 'updates', label: 'Updates' },
  ];

  return (
    <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notifList}>
        {filtered.map((n) => {
          const ac = ALERT_COLORS[n.alertType];
          return (
            <View key={n.id} style={[styles.notifCard, n.unread && styles.notifCardUnread]}>
              {n.unread && <View style={styles.unreadDot} />}
              <View style={[styles.notifIconWrap, { backgroundColor: ac.bg }]}>
                <Ionicons name={categoryIcon(n.category)} size={18} color={ac.text} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.notifTopRow}>
                  <Text style={[styles.notifTitle, n.unread && styles.notifTitleUnread]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={styles.notifTimestamp}>{n.timestamp}</Text>
                </View>
                <Text style={styles.notifDescription} numberOfLines={2}>
                  {n.description}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: ac.bg }]}>
                  <Text style={[styles.statusBadgeText, { color: ac.text }]}>{n.status}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={28} color={COLORS.mutedText} />
            <Text style={styles.emptyText}>No notifications in this category</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

// ============================================================
// MAIN COMBINED SCREEN
// ============================================================
type MainView = 'map' | 'notifications';

export default function AlertsScreen() {
  const [view, setView] = useState<MainView>('map');
  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Risk Center</Text>
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
          style={[styles.segmentBtn, view === 'notifications' && styles.segmentBtnActive]}
          onPress={() => setView('notifications')}
        >
          <Ionicons
            name="notifications"
            size={16}
            color={view === 'notifications' ? '#FFF' : COLORS.slateText}
          />
          <Text style={[styles.segmentText, view === 'notifications' && styles.segmentTextActive]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.segmentBadge}>
              <Text style={styles.segmentBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {view === 'map' ? <RiskMapTab /> : <NotificationsTab />}
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { ...TYPOGRAPHY.screenTitle, color: COLORS.deepIndigo },

  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: { backgroundColor: COLORS.primaryOrange },
  segmentText: { ...TYPOGRAPHY.secondary, fontWeight: '700', color: COLORS.slateText },
  segmentTextActive: { color: '#FFFFFF' },
  segmentBadge: {
    backgroundColor: COLORS.criticalRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  segmentBadgeText: { color: '#FFF', fontSize: FONT_SIZES.tiny, fontWeight: '800' },

  // Year filter
  yearFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  yearChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  yearChipText: { color: COLORS.slateText, fontWeight: '700', fontSize: FONT_SIZES.caption },
  yearChipTextActive: { color: '#FFFFFF' },
  heatToggle: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
  },
  heatToggleActive: { backgroundColor: COLORS.primaryOrange },
  heatToggleText: { color: COLORS.primaryOrange, fontSize: FONT_SIZES.tiny, fontWeight: '700' },

  // Map
  mapContainer: {
    marginHorizontal: 16,
    height: 340,
    borderRadius: 20,
    backgroundColor: COLORS.deepIndigo,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.deepIndigo,
  },
  mapBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30,27,75,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  mapBadgeText: { color: '#E7E5F5', fontSize: FONT_SIZES.tiny, fontWeight: '600' },

  // Shared card
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionLabel: { ...TYPOGRAPHY.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 10 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, fontWeight: '600' },

  // Risk badge
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  riskBadgeSm: { paddingHorizontal: 8, paddingVertical: 3 },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskBadgeText: { fontSize: FONT_SIZES.caption, fontWeight: '700' },

  // Info card
  infoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.deepIndigo },
  infoSubtitle: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, marginTop: 2 },
  statGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '800' },
  statLabel: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600', textAlign: 'center' },
  lastIncidentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  lastIncidentText: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption },

  // Recent incidents
  recentSection: { marginHorizontal: 16, marginTop: 18 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recentIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  recentType: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '700' },
  recentDate: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, marginTop: 2 },

  // Notifications filter chips
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterChipText: { color: COLORS.slateText, fontWeight: '700', fontSize: FONT_SIZES.caption },
  filterChipTextActive: { color: '#FFFFFF' },

  // Notification cards
  notifList: { paddingHorizontal: 16, gap: 10 },
  notifCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
  },
  notifCardUnread: {
    borderColor: COLORS.accentViolet,
    backgroundColor: COLORS.surfaceMuted,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentViolet,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { color: COLORS.slateText, fontSize: FONT_SIZES.secondary, fontWeight: '700', flex: 1, marginRight: 8 },
  notifTitleUnread: { color: COLORS.deepIndigo },
  notifTimestamp: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },
  notifDescription: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, marginTop: 4, lineHeight: 17 },
  statusBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '800' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { color: COLORS.mutedText, fontSize: FONT_SIZES.secondary, fontWeight: '600' },
});