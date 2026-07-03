import AppHeader from '@/components/common/AppHeader';
import {
  ALERT_COLORS,
  AlertType,
  COLORS,
  RISK_COLORS,
  RiskLevel,
} from '@/constants/theme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type FilterOption = 'All' | 'Low Risk' | 'Moderate Risk' | 'High Risk' | 'Recent Incidents';

interface BarangayData {
  id: string;
  name: string;
  risk: RiskLevel;
  incidents: number;
  note: string;
  lastUpdate: string;
  lat: number;
  lng: number;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: AlertType;
}

// ────────────────────────────────────────────────────────────
// Mock Data — real Lian, Batangas coordinates
// ────────────────────────────────────────────────────────────

const BARANGAYS: BarangayData[] = [
  {
    id: '1',
    name: 'Lian Proper',
    risk: 'High',
    incidents: 3,
    note: 'Dry weather and clustered residential zones contribute to elevated fire risk.',
    lastUpdate: '12 minutes ago',
    lat: 14.0422,
    lng: 120.6517,
  },
  {
    id: '2',
    name: 'Bungahan',
    risk: 'Moderate',
    incidents: 1,
    note: 'Periodic agricultural burning reported nearby. Monitor closely during dry season.',
    lastUpdate: '1 hour ago',
    lat: 14.0358,
    lng: 120.6441,
  },
  {
    id: '3',
    name: 'Lumaniag',
    risk: 'Low',
    incidents: 0,
    note: 'No active incidents reported. Conditions remain stable.',
    lastUpdate: '3 hours ago',
    lat: 14.0501,
    lng: 120.6589,
  },
  {
    id: '4',
    name: 'Balaytigui',
    risk: 'Moderate',
    incidents: 2,
    note: 'Aging electrical lines in older housing blocks increase moderate risk.',
    lastUpdate: '45 minutes ago',
    lat: 14.0299,
    lng: 120.6378,
  },
  {
    id: '5',
    name: 'Caybunga',
    risk: 'Low',
    incidents: 0,
    note: 'Well-spaced housing and recent safety drills keep risk low.',
    lastUpdate: '5 hours ago',
    lat: 14.0467,
    lng: 120.6623,
  },
];

const ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    title: 'Small residential fire reported',
    description: 'Near Barangay Lumaniag, contained within minutes.',
    timestamp: '2h ago',
    type: 'Warning',
  },
  {
    id: '2',
    title: 'Electrical fire incident resolved',
    description: 'Reported issue in Barangay Balaytigui has been addressed.',
    timestamp: '6h ago',
    type: 'Resolved',
  },
  {
    id: '3',
    title: 'Fire drill scheduled',
    description: 'Community drill planned in Barangay Bungahan this weekend.',
    timestamp: '1d ago',
    type: 'Drill',
  },
];

const FILTERS: FilterOption[] = ['All', 'Low Risk', 'Moderate Risk', 'High Risk', 'Recent Incidents'];

const RISK_DOT: Record<RiskLevel, string> = {
  Low: '#16A34A',
  Moderate: '#F59E0B',
  High: '#DC2626',
  Critical: '#991B1B',
};

// ────────────────────────────────────────────────────────────
// Leaflet HTML — injected into WebView
// ────────────────────────────────────────────────────────────

function buildLeafletHTML(barangays: BarangayData[], selectedId: string): string {
  const markersJS = barangays
    .map((b) => {
      const color = RISK_DOT[b.risk];
      const isSelected = b.id === selectedId;
      const size = isSelected ? 22 : 16;
      const border = isSelected ? 4 : 2;
      return `
        var icon_${b.id} = L.divIcon({
          className: '',
          html: '<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border}px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>',
          iconSize: [${size}, ${size}],
          iconAnchor: [${size / 2}, ${size / 2}],
        });
        var marker_${b.id} = L.marker([${b.lat}, ${b.lng}], { icon: icon_${b.id} })
          .addTo(map)
          .bindPopup('<b>${b.name}</b><br/><span style="color:${color};font-weight:700;">${b.risk} Risk</span><br/>${b.incidents} incident(s)');
        marker_${b.id}.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: '${b.id}' }));
        });
      `;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none; }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      font-family: -apple-system, sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    }
    .leaflet-popup-tip-container { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([14.0400, 120.6510], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    ${markersJS}

    map.on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
    });
  </script>
</body>
</html>
  `;
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: FilterOption; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BarangayCard({ item, selected, onPress }: { item: BarangayData; selected: boolean; onPress: () => void }) {
  const dotColor = RISK_DOT[item.risk];
  const palette = RISK_COLORS[item.risk];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.barangayListCard, selected && styles.barangayListCardSelected]}
    >
      <View style={[styles.barangaySideBar, { backgroundColor: dotColor }]} />
      <View style={styles.barangayListContent}>
        <View style={styles.barangayListTopRow}>
          <Text style={styles.barangayListName}>{item.name}</Text>
          <View style={[styles.riskBadgeSmall, { backgroundColor: palette.bg }]}>
            <Text style={[styles.riskBadgeSmallText, { color: palette.text }]}>{item.risk}</Text>
          </View>
        </View>
        <Text style={styles.barangayListNote} numberOfLines={2}>{item.note}</Text>
        <Text style={styles.barangayListMeta}>
          {item.incidents} {item.incidents === 1 ? 'incident' : 'incidents'} · {item.lastUpdate}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const palette = ALERT_COLORS[item.type];
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityRowTop}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <View style={[styles.activityBadge, { backgroundColor: palette.bg }]}>
          <Text style={[styles.activityBadgeText, { color: palette.text }]}>{item.type}</Text>
        </View>
      </View>
      <Text style={styles.activityDescription}>{item.description}</Text>
      <Text style={styles.activityTimestamp}>{item.timestamp}</Text>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [selectedId, setSelectedId] = useState<string>(BARANGAYS[0].id);
  const webViewRef = useRef<WebView>(null);

  const selected = BARANGAYS.find((b) => b.id === selectedId) ?? BARANGAYS[0];

  const filteredBarangays = BARANGAYS.filter((b) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Low Risk') return b.risk === 'Low';
    if (activeFilter === 'Moderate Risk') return b.risk === 'Moderate';
    if (activeFilter === 'High Risk') return b.risk === 'High';
    if (activeFilter === 'Recent Incidents') return b.incidents > 0;
    return true;
  });

  const handleSelectBarangay = (id: string) => {
    setSelectedId(id);
    const b = BARANGAYS.find((x) => x.id === id);
    if (b && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        map.setView([${b.lat}, ${b.lng}], 15, { animate: true });
        marker_${b.id}.openPopup();
        true;
      `);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick' && data.id) {
        setSelectedId(data.id);
      }
    } catch (_) {}
  };

  const handleIncidentHistory = () => {
    Alert.alert(
      `${selected.name} — Incident History`,
      `${selected.incidents} ${selected.incidents === 1 ? 'incident' : 'incidents'} recorded. Last update: ${selected.lastUpdate}.\n\nFull incident history log coming soon.`
    );
  };

  const handleBellPress = () => {
    Alert.alert('Notifications', 'You have no new notifications.');
  };

  const highRiskCount = BARANGAYS.filter((b) => b.risk === 'High').length;
  const moderateRiskCount = BARANGAYS.filter((b) => b.risk === 'Moderate').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <AppHeader
          title="Risk Map"
          subtitle="Lian, Batangas"
          showLocation
          showBell
          onBellPress={handleBellPress}
          showBrand
        />

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Area Fire Risk Overview</Text>
          <Text style={styles.summaryText}>
            {highRiskCount + moderateRiskCount} barangays are currently under moderate to high fire risk.
          </Text>
          <View style={styles.legendRow}>
            {(['Low', 'Moderate', 'High'] as RiskLevel[]).map((r) => (
              <View key={r} style={styles.legendChip}>
                <View style={[styles.legendDot, { backgroundColor: RISK_DOT[r] }]} />
                <Text style={styles.legendChipText}>{r}</Text>
              </View>
            ))}
          </View>
          <View style={styles.summaryMetricsRow}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricValue}>{BARANGAYS.length}</Text>
              <Text style={styles.summaryMetricLabel}>Monitored</Text>
            </View>
            <View style={styles.summaryMetricDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricValue}>{BARANGAYS.reduce((s, b) => s + b.incidents, 0)}</Text>
              <Text style={styles.summaryMetricLabel}>Incidents / week</Text>
            </View>
            <View style={styles.summaryMetricDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricValue}>12m</Text>
              <Text style={styles.summaryMetricLabel}>Last update</Text>
            </View>
          </View>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {FILTERS.map((f) => (
            <FilterChip key={f} label={f} active={activeFilter === f} onPress={() => setActiveFilter(f)} />
          ))}
        </ScrollView>

        {/* ── LEAFLET MAP ── */}
        <View style={styles.mapCard}>
          <WebView
            ref={webViewRef}
            style={styles.mapWebView}
            originWhitelist={['*']}
            source={{ html: buildLeafletHTML(BARANGAYS, selectedId) }}
            onMessage={handleWebViewMessage}
            scrollEnabled={false}
            javaScriptEnabled
          />
          {/* Locate button overlay */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.locateButton}
            onPress={() => {
              const b = selected;
              webViewRef.current?.injectJavaScript(`
                map.setView([${b.lat}, ${b.lng}], 15, { animate: true });
                true;
              `);
            }}
          >
            <Ionicons name="locate" size={18} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        {/* Selected Barangay Detail Panel */}
        <View style={styles.detailCard}>
          <View style={styles.detailTopRow}>
            <View style={styles.detailTitleGroup}>
              <Ionicons name="location" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.detailName}>{selected.name}</Text>
            </View>
            <View style={[styles.riskBadgeSmall, { backgroundColor: RISK_COLORS[selected.risk].bg }]}>
              <Text style={[styles.riskBadgeSmallText, { color: RISK_COLORS[selected.risk].text }]}>
                {selected.risk} Risk
              </Text>
            </View>
          </View>
          <Text style={styles.detailNote}>{selected.note}</Text>
          <View style={styles.detailMetaRow}>
            <View style={styles.detailMetaItem}>
              <MaterialCommunityIcons name="fire-alert" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.detailMetaText}>
                {selected.incidents} {selected.incidents === 1 ? 'incident' : 'incidents'}
              </Text>
            </View>
            <View style={styles.detailMetaItem}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
              <Text style={styles.detailMetaText}>Updated {selected.lastUpdate}</Text>
            </View>
          </View>
          <View style={styles.detailActionsRow}>
            <TouchableOpacity activeOpacity={0.85} style={styles.detailSecondaryButton} onPress={handleIncidentHistory}>
              <Ionicons name="time-outline" size={15} color={COLORS.deepIndigo} />
              <Text style={styles.detailSecondaryButtonText}>Incident History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.detailPrimaryButton}
              onPress={() => router.push('/(tabs)/report' as any)}
            >
              <Ionicons name="flame" size={15} color="#FFFFFF" />
              <Text style={styles.detailPrimaryButtonText}>Report Fire Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barangay Risk Snapshot */}
        <Text style={styles.sectionTitle}>Barangay Risk Snapshot</Text>
        <View style={styles.barangayListWrap}>
          {filteredBarangays.map((item) => (
            <BarangayCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onPress={() => handleSelectBarangay(item.id)}
            />
          ))}
        </View>

        {/* Recent Incident Activity */}
        <Text style={styles.sectionTitle}>Recent Incident Activity</Text>
        <View style={styles.activityCard}>
          {ACTIVITY.map((item, index) => (
            <View key={item.id}>
              <ActivityRow item={item} />
              {index < ACTIVITY.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* CTA */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.ctaTextGroup}>
            <Text style={styles.ctaTitle}>Notice a fire nearby?</Text>
            <Text style={styles.ctaSubtitle}>Report it immediately so responders can act fast.</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaButton}
            onPress={() => router.push('/(tabs)/report' as any)}
          >
            <Text style={styles.ctaButtonText}>Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  summaryCard: {
    backgroundColor: COLORS.card, borderRadius: 20, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  summaryTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 6 },
  summaryText: { fontSize: 13, color: COLORS.slateText, lineHeight: 18, marginBottom: 14 },
  legendRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.surfaceMuted, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendChipText: { fontSize: 11.5, fontWeight: '600', color: COLORS.deepIndigo },
  summaryMetricsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  summaryMetric: { flex: 1, alignItems: 'center' },
  summaryMetricValue: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  summaryMetricLabel: { fontSize: 10.5, color: COLORS.slateText, textAlign: 'center' },
  summaryMetricDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  filterScrollContent: { gap: 8, paddingRight: 8, marginBottom: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.slateText },
  filterChipTextActive: { color: '#FFFFFF' },

  mapCard: { borderRadius: 22, marginBottom: 20, overflow: 'hidden', height: 280, position: 'relative', shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  mapWebView: { flex: 1 },
  locateButton: {
    position: 'absolute', bottom: 12, right: 12,
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },

  detailCard: { backgroundColor: COLORS.deepIndigo, borderRadius: 20, padding: 18, marginBottom: 24, shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  detailTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  detailNote: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18, marginBottom: 14 },
  detailMetaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailMetaText: { fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  detailActionsRow: { flexDirection: 'row', gap: 10 },
  detailSecondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14, paddingVertical: 12 },
  detailSecondaryButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.deepIndigo },
  detailPrimaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingVertical: 12 },
  detailPrimaryButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 14 },

  riskBadgeSmall: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  riskBadgeSmallText: { fontSize: 11, fontWeight: '700' },

  barangayListWrap: { gap: 12, marginBottom: 24 },
  barangayListCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  barangayListCardSelected: { borderColor: COLORS.primaryOrange },
  barangaySideBar: { width: 5 },
  barangayListContent: { flex: 1, padding: 14 },
  barangayListTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barangayListName: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo },
  barangayListNote: { fontSize: 12, color: COLORS.slateText, lineHeight: 16, marginBottom: 6 },
  barangayListMeta: { fontSize: 11, color: COLORS.mutedText },

  activityCard: { backgroundColor: COLORS.card, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, paddingHorizontal: 16 },
  activityRow: { paddingVertical: 14 },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 8 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: COLORS.deepIndigo, flex: 1 },
  activityBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  activityBadgeText: { fontSize: 10.5, fontWeight: '700' },
  activityDescription: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17, marginBottom: 6 },
  activityTimestamp: { fontSize: 11, color: COLORS.mutedText },
  divider: { height: 1, backgroundColor: COLORS.border },

  ctaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceMuted, borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  ctaIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: COLORS.primaryOrange, alignItems: 'center', justifyContent: 'center' },
  ctaTextGroup: { flex: 1 },
  ctaTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  ctaSubtitle: { fontSize: 11.5, color: COLORS.slateText, lineHeight: 15 },
  ctaButton: { backgroundColor: COLORS.deepIndigo, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  ctaButtonText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
});