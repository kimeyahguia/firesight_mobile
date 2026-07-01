import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import {
  COLORS,
  RISK_COLORS,
  FONT_SIZES,
  TYPOGRAPHY,
  RiskLevel,
} from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================
type WorkflowStage = 'Reported' | 'Verified' | 'Dispatched' | 'On Scene' | 'Resolved';

interface Responder {
  id: string;
  name: string;
  rank: string;
  contactNumber: string;
  photoInitials: string;
}

interface FireTruck {
  id: string;
  unitCode: string;
  plateNumber: string;
  type: string;
  capacity: string;
  driver: string;
}

interface IncidentDetail {
  id: string;
  title: string;
  barangay: string;
  address: string;
  risk: RiskLevel;
  reportedAt: string;
  reporterName: string;
}

interface RoutePoint {
  lat: number;
  lng: number;
}

// ============================================================
// MOCK DATA
// ============================================================
const RESPONDER: Responder = {
  id: 'r1',
  name: 'FO1 Miguel Santos',
  rank: 'Fire Officer I',
  contactNumber: '0917 555 2481',
  photoInitials: 'MS',
};

const FIRE_TRUCK: FireTruck = {
  id: 't1',
  unitCode: 'BFP-LIAN-02',
  plateNumber: 'SGB 4471',
  type: 'Pumper Fire Truck',
  capacity: '2,000 L water tank',
  driver: 'FO2 Ramon Cruz',
};

const INCIDENT: IncidentDetail = {
  id: 'inc-2026-0142',
  title: 'Structural Fire',
  barangay: 'Bucana',
  address: 'Purok 3, Barangay Bucana, Lian, Batangas',
  risk: 'High',
  reportedAt: 'Jul 1, 2026 — 2:14 PM',
  reporterName: 'Anonymous Citizen Report',
};

const STATION_POINT: RoutePoint = { lat: 13.9667, lng: 120.6167 }; // BFP Lian Station approx
const INCIDENT_POINT: RoutePoint = { lat: 13.9705, lng: 120.6105 }; // Bucana

const ETA_MINUTES = 8;
const DISTANCE_KM = 3.2;

const WORKFLOW_STAGES: WorkflowStage[] = ['Reported', 'Verified', 'Dispatched', 'On Scene', 'Resolved'];
const CURRENT_STAGE_INDEX = 2; // "Dispatched" — in progress toward On Scene

const STAGE_TIMESTAMPS: Record<WorkflowStage, string | null> = {
  Reported: '2:14 PM',
  Verified: '2:19 PM',
  Dispatched: '2:23 PM',
  'On Scene': null,
  Resolved: null,
};

// ============================================================
// LEAFLET ROUTE MAP
// ============================================================
function buildRouteHtml(from: RoutePoint, to: RoutePoint): string {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${COLORS.deepIndigo}; }
    .leaflet-control-attribution { font-size: 8px; }
    .pin-station, .pin-incident {
      width: 26px; height: 26px; border-radius: 13px;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false, attributionControl: true, dragging: true })
      .setView([${midLat}, ${midLng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const stationIcon = L.divIcon({
      className: '',
      html: '<div class="pin-station" style="background:${COLORS.accentViolet};">🚒</div>',
      iconSize: [26, 26], iconAnchor: [13, 13],
    });
    const incidentIcon = L.divIcon({
      className: '',
      html: '<div class="pin-incident" style="background:${COLORS.criticalRed};">🔥</div>',
      iconSize: [26, 26], iconAnchor: [13, 13],
    });

    L.marker([${from.lat}, ${from.lng}], { icon: stationIcon }).addTo(map);
    L.marker([${to.lat}, ${to.lng}], { icon: incidentIcon }).addTo(map);

    const routeLine = L.polyline(
      [[${from.lat}, ${from.lng}], [${to.lat}, ${to.lng}]],
      { color: '${COLORS.primaryOrange}', weight: 4, opacity: 0.85, dashArray: '1, 8', lineCap: 'round' }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
  </script>
</body>
</html>
  `;
}

// ============================================================
// SHARED SMALL COMPONENTS
// ============================================================
const RiskBadge: React.FC<{ risk: RiskLevel }> = ({ risk }) => {
  const c = RISK_COLORS[risk];
  return (
    <View style={[styles.riskBadge, { backgroundColor: c.bg }]}>
      <View style={[styles.riskDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.riskBadgeText, { color: c.text }]}>{risk} Risk</Text>
    </View>
  );
};

const SectionCard: React.FC<{ children: React.ReactNode; style?: object }> = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ============================================================
// WORKFLOW TIMELINE
// ============================================================
const WorkflowTimeline: React.FC<{ currentIndex: number }> = ({ currentIndex }) => {
  return (
    <View style={styles.timelineWrap}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isLast = index === WORKFLOW_STAGES.length - 1;
        const timestamp = STAGE_TIMESTAMPS[stage];

        const dotColor = isCompleted
          ? COLORS.successGreen
          : isActive
          ? COLORS.primaryOrange
          : COLORS.border;

        return (
          <View key={stage} style={styles.timelineRow}>
            <View style={styles.timelineIndicatorCol}>
              <View
                style={[
                  styles.timelineDot,
                  { backgroundColor: isCompleted || isActive ? dotColor : COLORS.surfaceMuted, borderColor: dotColor },
                ]}
              >
                {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                {isActive && <View style={styles.timelineActivePulse} />}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineConnector,
                    { backgroundColor: index < currentIndex ? COLORS.successGreen : COLORS.border },
                  ]}
                />
              )}
            </View>

            <View style={styles.timelineContentCol}>
              <Text
                style={[
                  styles.timelineStageText,
                  (isCompleted || isActive) && { color: COLORS.deepIndigo, fontWeight: '700' },
                ]}
              >
                {stage}
              </Text>
              <Text style={styles.timelineTimestampText}>
                {timestamp ? timestamp : isActive ? 'In progress' : 'Pending'}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// ============================================================
// MAIN SCREEN
// ============================================================
export default function ResponseSupportScreen() {
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(CURRENT_STAGE_INDEX);

  const routeHtml = useMemo(() => buildRouteHtml(STATION_POINT, INCIDENT_POINT), []);

  const handleUpdateStatus = () => {
    if (currentStageIndex >= WORKFLOW_STAGES.length - 1) {
      Alert.alert('Incident Resolved', 'This incident has already reached the final stage.');
      return;
    }
    const nextStage = WORKFLOW_STAGES[currentStageIndex + 1];
    Alert.alert(
      'Update Status',
      `Mark this incident as "${nextStage}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => setCurrentStageIndex((i) => i + 1) },
      ]
    );
  };

  const handleNavigate = () => {
    Alert.alert('Navigate', 'Opening turn-by-turn navigation to the incident location.');
  };

  const handleContactTeam = () => {
    Alert.alert('Contact Team', `Calling ${RESPONDER.name} at ${RESPONDER.contactNumber}...`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <ScrollView style={styles.flex1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Response Support</Text>
            <Text style={styles.headerSubtitle}>Incident #{INCIDENT.id.toUpperCase()}</Text>
          </View>
          <RiskBadge risk={INCIDENT.risk} />
        </View>

        {/* Current Incident */}
        <SectionCard>
          <View style={styles.incidentHeaderRow}>
            <View style={styles.incidentIconWrap}>
              <MaterialCommunityIcons name="fire" size={22} color={COLORS.criticalRed} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.incidentTitle}>{INCIDENT.title}</Text>
              <Text style={styles.incidentSubtitle}>Barangay {INCIDENT.barangay}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Ionicons name="location" size={14} color={COLORS.mutedText} />
            <Text style={styles.detailText}>{INCIDENT.address}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={14} color={COLORS.mutedText} />
            <Text style={styles.detailText}>Reported {INCIDENT.reportedAt}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={14} color={COLORS.mutedText} />
            <Text style={styles.detailText}>{INCIDENT.reporterName}</Text>
          </View>
        </SectionCard>

        {/* Assigned Responder + Truck */}
        <View style={styles.assignedRow}>
          <SectionCard style={styles.assignedCard}>
            <Text style={styles.assignedLabel}>Assigned Responder</Text>
            <View style={styles.responderRow}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{RESPONDER.photoInitials}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.responderName}>{RESPONDER.name}</Text>
                <Text style={styles.responderRank}>{RESPONDER.rank}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="call" size={12} color={COLORS.mutedText} />
              <Text style={styles.detailTextSm}>{RESPONDER.contactNumber}</Text>
            </View>
          </SectionCard>

          <SectionCard style={styles.assignedCard}>
            <Text style={styles.assignedLabel}>Assigned Fire Truck</Text>
            <View style={styles.responderRow}>
              <View style={[styles.avatarCircle, { backgroundColor: COLORS.surfaceMuted }]}>
                <MaterialCommunityIcons name="fire-truck" size={20} color={COLORS.primaryOrange} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.responderName}>{FIRE_TRUCK.unitCode}</Text>
                <Text style={styles.responderRank}>{FIRE_TRUCK.type}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person" size={12} color={COLORS.mutedText} />
              <Text style={styles.detailTextSm}>{FIRE_TRUCK.driver}</Text>
            </View>
          </SectionCard>
        </View>

        {/* Route Map */}
        <SectionCard>
          <View style={styles.routeHeaderRow}>
            <Text style={styles.sectionLabel}>Suggested Navigation Route</Text>
            <View style={styles.etaPill}>
              <Ionicons name="navigate" size={12} color={COLORS.primaryOrange} />
              <Text style={styles.etaPillText}>{ETA_MINUTES} min</Text>
            </View>
          </View>

          <View style={styles.mapContainer}>
            <WebView
              originWhitelist={['*']}
              source={{ html: routeHtml }}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState
              scrollEnabled={false}
            />
          </View>

          <View style={styles.routeStatsRow}>
            <View style={styles.routeStatBox}>
              <Ionicons name="time" size={16} color={COLORS.slateText} />
              <Text style={styles.routeStatValue}>{ETA_MINUTES} min</Text>
              <Text style={styles.routeStatLabel}>ETA</Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStatBox}>
              <Ionicons name="speedometer" size={16} color={COLORS.slateText} />
              <Text style={styles.routeStatValue}>{DISTANCE_KM} km</Text>
              <Text style={styles.routeStatLabel}>Distance</Text>
            </View>
            <View style={styles.routeStatDivider} />
            <View style={styles.routeStatBox}>
              <MaterialCommunityIcons name="fire-station" size={16} color={COLORS.slateText} />
              <Text style={styles.routeStatValue}>BFP Lian</Text>
              <Text style={styles.routeStatLabel}>Origin</Text>
            </View>
          </View>
        </SectionCard>

        {/* Workflow Timeline */}
        <SectionCard>
          <Text style={styles.sectionLabel}>Response Workflow</Text>
          <WorkflowTimeline currentIndex={currentStageIndex} />
        </SectionCard>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleContactTeam} activeOpacity={0.8}>
          <Ionicons name="call" size={18} color={COLORS.deepIndigo} />
          <Text style={styles.secondaryBtnText}>Contact Team</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleNavigate} activeOpacity={0.8}>
          <Ionicons name="navigate" size={18} color={COLORS.deepIndigo} />
          <Text style={styles.secondaryBtnText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdateStatus} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Update Status</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.background },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTitle: { ...TYPOGRAPHY.screenTitle, color: COLORS.deepIndigo },
  headerSubtitle: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, marginTop: 2, fontWeight: '600' },

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

  // Risk badge
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskBadgeText: { fontSize: FONT_SIZES.caption, fontWeight: '700' },

  // Incident card
  incidentHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  incidentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incidentTitle: { ...TYPOGRAPHY.cardTitle, color: COLORS.deepIndigo },
  incidentSubtitle: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, marginTop: 2, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, flex: 1 },
  detailTextSm: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },

  // Assigned responder / truck
  assignedRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 14 },
  assignedCard: { flex: 1, marginHorizontal: 0, marginTop: 0 },
  assignedLabel: {
    color: COLORS.mutedText,
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  responderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.deepIndigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: FONT_SIZES.caption, fontWeight: '800' },
  responderName: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '700' },
  responderRank: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, marginTop: 1 },

  // Route map
  routeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  etaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  etaPillText: { color: COLORS.primaryOrange, fontSize: FONT_SIZES.tiny, fontWeight: '800' },
  mapContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.deepIndigo,
  },
  webview: { flex: 1, backgroundColor: COLORS.deepIndigo },

  routeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 12,
  },
  routeStatBox: { flex: 1, alignItems: 'center', gap: 4 },
  routeStatValue: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '800' },
  routeStatLabel: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },
  routeStatDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  // Timeline
  timelineWrap: { marginTop: 4 },
  timelineRow: { flexDirection: 'row' },
  timelineIndicatorCol: { alignItems: 'center', width: 28 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineActivePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timelineConnector: { width: 2, flex: 1, minHeight: 28, marginVertical: 2 },
  timelineContentCol: { flex: 1, paddingBottom: 18, paddingLeft: 12 },
  timelineStageText: { color: COLORS.mutedText, fontSize: FONT_SIZES.secondary, fontWeight: '600' },
  timelineTimestampText: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, marginTop: 2 },

  // Action bar
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryBtnText: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.caption, fontWeight: '700' },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: COLORS.primaryOrange,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: FONT_SIZES.caption, fontWeight: '800' },
});