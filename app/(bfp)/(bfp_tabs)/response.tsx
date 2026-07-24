import BfpHeader from '@/components/bfp/bfpHeader';
import NotificationsModal from '@/components/bfp/NotificationModal';
import { API_ENDPOINTS } from '@/constants/api';
import {
  COLORS,
  FONT_SIZES,
  RISK_COLORS,
  RiskLevel,
  TYPOGRAPHY,
} from '@/constants/theme';
import { useNotifications } from '@/context/NotificationsContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

// ============================================================
// TYPES
// ============================================================
type WorkflowStage = 'Pending' | 'Verified' | 'Responding' | 'Resolved';
type MapViewMode = 'street' | 'flat' | 'satellite';
type RiskFilter = 'All' | RiskLevel;

interface RoutePoint {
  lat: number;
  lng: number;
}

interface ApiResponder {
  id: string;
  name: string;
  rank: string | null;
  contactNumber: string | null;
  photoInitials: string;
}

interface ApiTruck {
  id: string;
  unitCode: string;
  plateNumber: string | null;
  type: string | null;
  capacity: string | null;
  driver: string | null;
}

interface ApiIncident {
  id: string;
  referenceId: string;
  title: string;
  barangay: string;
  address: string;
  risk: RiskLevel;
  reportedAt: string;
  reportedAgo: string | null;
  reporterName: string;
  lat: number | null;
  lng: number | null;
  etaMinutes: number | null;
  distanceKm: number | null;
  responder: ApiResponder | null;
  truck: ApiTruck | null;
  stageIndex: number;
  stageLabel: WorkflowStage;
  stageTimestamps: (string | null)[];
}

const WORKFLOW_STAGES: WorkflowStage[] = ['Pending', 'Verified', 'Responding', 'Resolved'];
const STATION_POINT: RoutePoint = { lat: 14.0369, lng: 120.65257 }; // dapat tugma sa STATION_LAT/LNG sa list.php

const RISK_FILTERS: RiskFilter[] = ['All', 'Critical', 'High', 'Moderate', 'Low'];

const MAP_VIEWS: { key: MapViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'flat', label: 'Flat', icon: 'square-outline' },
  { key: 'street', label: 'Street', icon: 'navigate-outline' },
  { key: 'satellite', label: 'Satellite', icon: 'globe-outline' },
];

const STAGE_BADGE_STYLE: Record<WorkflowStage, { bg: string; text: string }> = {
  Pending: { bg: '#FEF2F2', text: COLORS.criticalRed },
  Verified: { bg: '#EEF2FF', text: COLORS.accentViolet },
  Responding: { bg: '#FFF7ED', text: COLORS.primaryOrange },
  Resolved: { bg: '#ECFDF5', text: COLORS.successGreen },
};

// ============================================================
// LINKING HELPERS
// ============================================================
async function openUrlSafely(url: string, failMessage: string) {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    Linking.openURL(url);
  } else {
    Alert.alert('Unable to open', failMessage);
  }
}

function callNumber(number: string) {
  openUrlSafely(`tel:${number}`, 'This device cannot place phone calls.');
}

function textNumber(number: string) {
  openUrlSafely(`sms:${number}`, 'This device cannot send text messages.');
}

function openInGoogleMaps(from: RoutePoint, to: RoutePoint) {
  const url = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`;
  openUrlSafely(url, 'Google Maps is not available on this device.');
}

function openInWaze(to: RoutePoint) {
  const url = `https://waze.com/ul?ll=${to.lat},${to.lng}&navigate=yes`;
  openUrlSafely(url, 'Waze is not installed on this device.');
}

// ============================================================
// LEAFLET ROUTE MAP — ngayon road-based na (OSRM) na may straight-line fallback
// ============================================================
function buildRouteHtml(from: RoutePoint, to: RoutePoint, initialView: MapViewMode): string {
  const midLat = (from.lat + to.lat) / 2;
  const midLng = (from.lng + to.lng) / 2;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { height: 100%; width: 100%; background: ${COLORS.deepIndigo}; }
    .leaflet-control-attribution { font-size: 8px; }
    .leaflet-control-zoom { margin-top: 54px !important; }
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
    const map = L.map('map', { zoomControl: true, attributionControl: true, dragging: true })
      .setView([${midLat}, ${midLng}], 13);

    var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    });
    var flatLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution: '&copy; OpenStreetMap, &copy; CARTO'
    });
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri'
    });

    var layers = { street: streetLayer, flat: flatLayer, satellite: satelliteLayer };
    var currentKey = '${initialView}';
    layers[currentKey].addTo(map);

    function switchMapView(key) {
      if (!layers[key] || key === currentKey) return;
      map.removeLayer(layers[currentKey]);
      currentKey = key;
      layers[currentKey].addTo(map);
    }

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

    function drawStraightFallback() {
      const line = L.polyline(
        [[${from.lat}, ${from.lng}], [${to.lat}, ${to.lng}]],
        { color: '${COLORS.primaryOrange}', weight: 4, opacity: 0.85, dashArray: '1, 8', lineCap: 'round' }
      ).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }

    // Kumuha ng aktwal na ruta base sa daan gamit ang OSRM public routing service.
    // Kung mag-fail (walang internet, timeout, atbp.), babalik sa straight line.
    fetch('https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.routes || !data.routes.length) {
          drawStraightFallback();
          return;
        }
        const coords = data.routes[0].geometry.coordinates.map(function (c) {
          return [c[1], c[0]];
        });
        const routeLine = L.polyline(coords, {
          color: '${COLORS.primaryOrange}',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
        map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
      })
      .catch(function () {
        drawStraightFallback();
      });
  </script>
</body>
</html>
  `;
}

// ============================================================
// SHARED SMALL COMPONENTS
// ============================================================
const RiskBadge: React.FC<{ risk: RiskLevel; dark?: boolean }> = ({ risk, dark }) => {
  const c = RISK_COLORS[risk];
  if (dark) {
    return (
      <View style={styles.riskBadgeDark}>
        <View style={[styles.riskDot, { backgroundColor: c.dot }]} />
        <Text style={styles.riskBadgeTextDark}>{risk} Risk</Text>
      </View>
    );
  }
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

function MapViewSwitcher({ active, onChange }: { active: MapViewMode; onChange: (v: MapViewMode) => void }) {
  return (
    <View style={styles.mapViewSwitcher}>
      {MAP_VIEWS.map((v) => {
        const isActive = v.key === active;
        return (
          <TouchableOpacity
            key={v.key}
            activeOpacity={0.85}
            onPress={() => onChange(v.key)}
            style={[styles.mapViewButton, isActive && styles.mapViewButtonActive]}
          >
            <Ionicons name={v.icon} size={12} color={isActive ? '#FFFFFF' : COLORS.deepIndigo} />
            <Text style={[styles.mapViewButtonText, isActive && styles.mapViewButtonTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ============================================================
// WORKFLOW TIMELINE — Horizontal version
// ============================================================
const WorkflowTimeline: React.FC<{ currentIndex: number; stageTimestamps: (string | null)[] }> = ({
  currentIndex,
}) => {
  return (
    <View style={styles.timelineHorizontalWrap}>
      {WORKFLOW_STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isLast = index === WORKFLOW_STAGES.length - 1;

        const dotColor = isCompleted
          ? COLORS.successGreen
          : isActive
          ? COLORS.primaryOrange
          : COLORS.border;

        return (
          <React.Fragment key={stage}>
            <View style={styles.timelineHStep}>
              <View
                style={[
                  styles.timelineHDot,
                  { backgroundColor: isCompleted || isActive ? dotColor : COLORS.surfaceMuted, borderColor: dotColor },
                ]}
              >
                {isCompleted && <Ionicons name="checkmark" size={11} color="#FFFFFF" />}
                {isActive && <View style={styles.timelineHActivePulse} />}
              </View>
              <Text
                style={[
                  styles.timelineHLabel,
                  (isCompleted || isActive) && { color: COLORS.deepIndigo, fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {stage}
              </Text>
            </View>
            {!isLast && (
              <View
                style={[
                  styles.timelineHConnector,
                  { backgroundColor: index < currentIndex ? COLORS.successGreen : COLORS.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

// ============================================================
// ACTIVE INCIDENTS LIST
// ============================================================
function IncidentListRow({
  item,
  selected,
  onPress,
}: {
  item: ApiIncident;
  selected: boolean;
  onPress: () => void;
}) {
  const riskPalette = RISK_COLORS[item.risk] ?? { bg: COLORS.surfaceMuted, text: COLORS.mutedText, dot: COLORS.mutedText };
  const stagePalette = STAGE_BADGE_STYLE[item.stageLabel] ?? { bg: COLORS.surfaceMuted, text: COLORS.mutedText };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.nearbyRow, selected && styles.nearbyRowSelected]}
    >
      <View style={[styles.nearbyIconWrap, { backgroundColor: riskPalette.bg }]}>
        <MaterialCommunityIcons name="fire" size={12} color={riskPalette.text} />
      </View>
      <View style={styles.flex1}>
        <View style={styles.nearbyTopRow}>
          <Text style={styles.nearbyTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.riskBadgeSmall, { backgroundColor: riskPalette.bg }]}>
            <Text style={[styles.riskBadgeSmallText, { color: riskPalette.text }]}>{item.risk}</Text>
          </View>
        </View>
        <Text style={styles.nearbySubtitle}>
          Barangay {item.barangay}{item.distanceKm != null ? ` · ${item.distanceKm} km away` : ''}
        </Text>
        <View style={styles.nearbyBottomRow}>
          <Text style={styles.nearbyTimestamp}>{item.reportedAgo ?? ''}</Text>
          <View style={[styles.stagePillSmall, { backgroundColor: stagePalette.bg }]}>
            <Text style={[styles.stagePillSmallText, { color: stagePalette.text }]}>{item.stageLabel}</Text>
          </View>
        </View>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={COLORS.primaryOrange} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
export default function ResponseSupportScreen() {
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const { unreadCount } = useNotifications();
  const [showAllIncidents, setShowAllIncidents] = useState(false);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All');

  const [incidents, setIncidents] = useState<ApiIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  // ── Pinned incident coming from Incidents → "Start Response" button ──
  const routeParams = useLocalSearchParams<{ incidentId?: string }>();
  const pinnedIncidentId = Array.isArray(routeParams.incidentId)
    ? routeParams.incidentId[0]
    : routeParams.incidentId;
  const consumedPinnedIdRef = useRef<string | null>(null);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [navigateModalVisible, setNavigateModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [mapView, setMapView] = useState<MapViewMode>('street');
  const [advancing, setAdvancing] = useState(false);

  const routeMapRef = useRef<WebView>(null);
  const modalRouteMapRef = useRef<WebView>(null);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.bfpResponseList);
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to load incidents');
      const data: ApiIncident[] = json.data ?? [];
      setIncidents(data);
      setSelectedIncidentId((prev) => {
        // Prioritize an incident pinned via navigation params (e.g. "Start Response"
        // button sa Incidents screen), pero isang beses lang bawat bagong param value —
        // hindi na ito papalitan ang manual selection ng user sa mga susunod na refresh.
        if (
          pinnedIncidentId &&
          consumedPinnedIdRef.current !== pinnedIncidentId &&
          data.some((i) => i.id === pinnedIncidentId)
        ) {
          consumedPinnedIdRef.current = pinnedIncidentId;
          return pinnedIncidentId;
        }
        if (prev && data.some((i) => i.id === prev)) return prev;
        return data.length > 0 ? data[0].id : null;
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [pinnedIncidentId]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const incident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) ?? null,
    [incidents, selectedIncidentId]
  );

  const riskFilteredIncidents = useMemo(
    () => (riskFilter === 'All' ? incidents : incidents.filter((i) => i.risk === riskFilter)),
    [incidents, riskFilter]
  );

  const incidentPoint: RoutePoint | null = incident && incident.lat != null && incident.lng != null
    ? { lat: incident.lat, lng: incident.lng }
    : null;

  const routeHtml = useMemo(
    () => (incidentPoint ? buildRouteHtml(STATION_POINT, incidentPoint, mapView) : ''),
    [incident?.id, incidentPoint?.lat, incidentPoint?.lng]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  );

  const currentStageIndex = incident?.stageIndex ?? 0;
  const isFinalStage = currentStageIndex >= WORKFLOW_STAGES.length - 1;
  const nextStage = !isFinalStage ? WORKFLOW_STAGES[currentStageIndex + 1] : null;

  async function confirmAdvanceStage() {
    if (isFinalStage || !incident || !nextStage || advancing) return;
    setAdvancing(true);
    try {
      const res = await fetch(API_ENDPOINTS.bfpResponseUpdateStatus, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident_id: incident.id, next_stage: nextStage }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || 'Failed to update status');

      setIncidents((prev) =>
        prev.map((i) => {
          if (i.id !== incident.id) return i;
          return {
            ...i,
            stageIndex: json.data.stageIndex,
            stageLabel: json.data.stage,
            stageTimestamps: json.data.stageTimestamps,
          };
        })
      );
      setStatusModalVisible(false);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Something went wrong.');
    } finally {
      setAdvancing(false);
    }
  }

  function handleChangeMapView(view: MapViewMode) {
    setMapView(view);
    const js = `switchMapView('${view}'); true;`;
    routeMapRef.current?.injectJavaScript(js);
    modalRouteMapRef.current?.injectJavaScript(js);
  }

  function handleSelectIncident(id: string) {
    setSelectedIncidentId(id);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <View style={styles.centerFill}>
          <ActivityIndicator color={COLORS.primaryOrange} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={32} color={COLORS.criticalRed} />
          <Text style={styles.errorFillText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchIncidents}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!incident) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <View style={styles.centerFill}>
          <Ionicons name="checkmark-done-circle-outline" size={32} color={COLORS.successGreen} />
          <Text style={styles.errorFillText}>Walang active incidents sa ngayon.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <NotificationsModal visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} />

      <ScrollView
        style={styles.flex1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <BfpHeader unreadNotifCount={unreadCount} onBellPress={() => setNotifModalVisible(true)}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTitleGroup}>
              <Text style={styles.heroLabel}>BFP LIAN FIRE STATION</Text>
              <Text style={styles.heroTitle}>Response Support</Text>
            </View>
            <TouchableOpacity
              style={styles.heroIconButton}
              activeOpacity={0.7}
              onPress={() => setContactModalVisible(true)}
            >
              <Ionicons name="call" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatBox}>
              <Text style={[styles.heroStatValue, { color: COLORS.criticalRed }]}>
                {incident.etaMinutes ?? '—'}
              </Text>
              <Text style={styles.heroStatLabel}>ETA (min)</Text>
            </View>
            <View style={styles.heroStatBox}>
              <Text style={[styles.heroStatValue, { color: COLORS.primaryOrange }]}>
                {incident.distanceKm ?? '—'}
              </Text>
              <Text style={styles.heroStatLabel}>Distance (km)</Text>
            </View>
            <View style={styles.heroStatBox}>
              <Text style={[styles.heroStatValue, { color: COLORS.successGreen }]}>
                {currentStageIndex + 1}/{WORKFLOW_STAGES.length}
              </Text>
              <Text style={styles.heroStatLabel}>Stage Progress</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroSubtitle}>Incident #{incident.referenceId ?? incident.id}</Text>
            <RiskBadge risk={incident.risk} dark />
          </View>
        </BfpHeader>

        <View style={styles.body}>
          {/* Route Map — ngayon nasa taas na */}
          <SectionCard style={styles.firstCard}>
            <View style={styles.routeHeaderRow}>
              <Text style={styles.sectionLabel}>Suggested Navigation Route</Text>
              <View style={styles.etaPill}>
                <Ionicons name="navigate" size={12} color={COLORS.primaryOrange} />
                <Text style={styles.etaPillText}>{incident.etaMinutes ?? '—'} min</Text>
              </View>
            </View>

            <View style={styles.mapContainer}>
              {incidentPoint ? (
                <WebView
                  key={incident.id}
                  ref={routeMapRef}
                  originWhitelist={['*']}
                  source={{ html: routeHtml }}
                  style={styles.webview}
                  javaScriptEnabled
                  domStorageEnabled
                  startInLoadingState
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.mapLoading}>
                  <Text style={styles.notAssignedText}>Walang GPS coordinates para sa incident na ito.</Text>
                </View>
              )}

              {incidentPoint && <MapViewSwitcher active={mapView} onChange={handleChangeMapView} />}

              {incidentPoint && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.mapExpandCta}
                  onPress={() => setNavigateModalVisible(true)}
                >
                  <Ionicons name="expand-outline" size={13} color={COLORS.deepIndigo} />
                  <Text style={styles.mapExpandCtaText}>Tap to navigate</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.routeLegendRow}>
              <View style={styles.routeLegendItem}>
                <View style={[styles.routeLegendDot, { backgroundColor: COLORS.accentViolet }]} />
                <Text style={styles.routeLegendText}>BFP Lian Station</Text>
              </View>
              <View style={styles.routeLegendItem}>
                <View style={[styles.routeLegendDot, { backgroundColor: COLORS.criticalRed }]} />
                <Text style={styles.routeLegendText}>Incident Site</Text>
              </View>
            </View>

            <View style={styles.routeStatsRow}>
              <View style={styles.routeStatBox}>
                <Ionicons name="time" size={16} color={COLORS.slateText} />
                <Text style={styles.routeStatValue}>{incident.etaMinutes ?? '—'} min</Text>
                <Text style={styles.routeStatLabel}>ETA</Text>
              </View>
              <View style={styles.routeStatDivider} />
              <View style={styles.routeStatBox}>
                <Ionicons name="speedometer" size={16} color={COLORS.slateText} />
                <Text style={styles.routeStatValue}>{incident.distanceKm ?? '—'} km</Text>
                <Text style={styles.routeStatLabel}>Distance</Text>
              </View>
              <View style={styles.routeStatDivider} />
              <View style={styles.routeStatBox}>
                <MaterialCommunityIcons name="fire-station" size={16} color={COLORS.slateText} />
                <Text style={styles.routeStatValue}>BFP Lian</Text>
                <Text style={styles.routeStatLabel}>Origin</Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.navigateBtn, !incidentPoint && styles.btnDisabled]}
              onPress={() => incidentPoint && setNavigateModalVisible(true)}
              disabled={!incidentPoint}
            >
              <Ionicons name="navigate" size={16} color="#FFFFFF" />
              <Text style={styles.navigateBtnText}>Open Navigation Options</Text>
            </TouchableOpacity>

            {/* Response Workflow */}
            <View style={styles.workflowDivider} />
            <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>Response Workflow</Text>
            <WorkflowTimeline currentIndex={currentStageIndex} stageTimestamps={incident.stageTimestamps} />
          </SectionCard>

          {/* Current Incident */}
          <SectionCard>
            <View style={styles.incidentHeaderRow}>
              <View style={styles.incidentIconWrap}>
                <MaterialCommunityIcons name="fire" size={22} color={COLORS.criticalRed} />
              </View>
              <View style={styles.flex1}>
                <Text style={styles.incidentTitle}>{incident.title}</Text>
                <Text style={styles.incidentSubtitle}>Barangay {incident.barangay}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <Ionicons name="location" size={14} color={COLORS.mutedText} />
              <Text style={styles.detailText}>{incident.address || 'No address details'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time" size={14} color={COLORS.mutedText} />
              <Text style={styles.detailText}>Reported {incident.reportedAgo ?? incident.reportedAt}</Text>
            </View>
            <View style={[styles.detailRow, { marginBottom: 0 }]}>
              <Ionicons name="person" size={14} color={COLORS.mutedText} />
              <Text style={styles.detailText}>{incident.reporterName}</Text>
            </View>
          </SectionCard>

          {/* Assigned Responder + Truck */}
          <View style={styles.assignedRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => incident.responder && setContactModalVisible(true)}
              disabled={!incident.responder}
            >
              <SectionCard style={styles.assignedCard}>
                <Text style={styles.assignedLabel}>Assigned Responder</Text>
                {incident.responder ? (
                  <>
                    <View style={styles.responderRow}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>{incident.responder.photoInitials}</Text>
                      </View>
                      <View style={styles.flex1}>
                        <Text style={styles.responderName}>{incident.responder.name}</Text>
                        <Text style={styles.responderRank}>{incident.responder.rank ?? ''}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={12} color={COLORS.mutedText} />
                      <Text style={styles.detailTextSm}>{incident.responder.contactNumber ?? 'No contact number'}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.notAssignedText}>Not yet assigned</Text>
                )}
              </SectionCard>
            </TouchableOpacity>

            <SectionCard style={styles.assignedCard}>
              <Text style={styles.assignedLabel}>Assigned Fire Truck</Text>
              {incident.truck ? (
                <>
                  <View style={styles.responderRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: COLORS.surfaceMuted }]}>
                      <MaterialCommunityIcons name="fire-truck" size={20} color={COLORS.primaryOrange} />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.responderName}>{incident.truck.unitCode}</Text>
                      <Text style={styles.responderRank}>{incident.truck.type ?? ''}</Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="person" size={12} color={COLORS.mutedText} />
                    <Text style={styles.detailTextSm}>{incident.truck.driver ?? 'No driver assigned'}</Text>
                  </View>
                </>
              ) : (
                <Text style={styles.notAssignedText}>Not yet assigned</Text>
              )}
            </SectionCard>
          </View>

          {/* Active Incidents — ngayon nasa ilalim na */}
          <SectionCard>
            <View style={styles.routeHeaderRow}>
              <Text style={styles.sectionLabel}>Active Incidents</Text>
              <View style={styles.nearbyCountPill}>
                <Text style={styles.nearbyCountPillText}>{riskFilteredIncidents.length}</Text>
              </View>
            </View>

            {/* Risk filter pills */}
            <View style={styles.riskFilterRow}>
              {RISK_FILTERS.map((f) => {
                const active = riskFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    activeOpacity={0.8}
                    style={[styles.riskFilterPill, active && styles.riskFilterPillActive]}
                    onPress={() => setRiskFilter(f)}
                  >
                    {f !== 'All' && (
                      <View style={[styles.riskFilterDot, { backgroundColor: RISK_COLORS[f].dot }]} />
                    )}
                    <Text style={[styles.riskFilterPillText, active && styles.riskFilterPillTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {riskFilteredIncidents.length === 0 ? (
              <Text style={styles.notAssignedText}>Walang incidents sa risk level na ito.</Text>
            ) : (
              <>
                <View style={{ maxHeight: showAllIncidents ? 280 : undefined }}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {(showAllIncidents ? riskFilteredIncidents : riskFilteredIncidents.slice(0, 2)).map((item, index) => {
                          const total = showAllIncidents
                            ? riskFilteredIncidents.length
                            : Math.min(2, riskFilteredIncidents.length);
                          const isNotLast = index < total - 1;

                          return (
                            <View key={item.id}>
                              <IncidentListRow
                                item={item}
                                selected={item.id === selectedIncidentId}
                                onPress={() => handleSelectIncident(item.id)}
                              />
                              {isNotLast && <View style={styles.divider} />}
                            </View>
                          );
                        })}
                  </ScrollView>
                </View>

                {riskFilteredIncidents.length > 2 && (
                  <TouchableOpacity
                    style={styles.seeAllBtn}
                    onPress={() => setShowAllIncidents(!showAllIncidents)}
                  >
                    <Text style={styles.seeAllBtnText}>
                      {showAllIncidents ? 'Show Less' : 'See All'}
                    </Text>
                    <Ionicons
                      name={showAllIncidents ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.primaryOrange}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </SectionCard>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setContactModalVisible(true)} activeOpacity={0.8}>
          <Ionicons name="call" size={18} color={COLORS.deepIndigo} />
          <Text style={styles.secondaryBtnText}>Contact Team</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryBtn, !incidentPoint && styles.btnDisabled]}
          onPress={() => incidentPoint && setNavigateModalVisible(true)}
          activeOpacity={0.8}
          disabled={!incidentPoint}
        >
          <Ionicons name="navigate" size={18} color={COLORS.deepIndigo} />
          <Text style={styles.secondaryBtnText}>Navigate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStatusModalVisible(true)} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Update Status</Text>
        </TouchableOpacity>
      </View>

      {/* ── Contact Team Modal ── */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setContactModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Contact Team</Text>
              <TouchableOpacity onPress={() => setContactModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>

            {incident.responder ? (
              <>
                <View style={styles.contactPersonRow}>
                  <View style={styles.avatarCircleLg}>
                    <Text style={styles.avatarTextLg}>{incident.responder.photoInitials}</Text>
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.contactName}>{incident.responder.name}</Text>
                    <Text style={styles.contactRank}>{incident.responder.rank ?? ''}</Text>
                    <Text style={styles.contactNumber}>{incident.responder.contactNumber ?? 'No contact number'}</Text>
                  </View>
                </View>

                <View style={styles.contactActionsRow}>
                  <TouchableOpacity
                    style={styles.contactActionBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!incident.responder?.contactNumber) return;
                      setContactModalVisible(false);
                      callNumber(incident.responder.contactNumber);
                    }}
                  >
                    <View style={[styles.contactActionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                      <Ionicons name="call" size={18} color={COLORS.successGreen} />
                    </View>
                    <Text style={styles.contactActionLabel}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.contactActionBtn}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!incident.responder?.contactNumber) return;
                      setContactModalVisible(false);
                      textNumber(incident.responder.contactNumber);
                    }}
                  >
                    <View style={[styles.contactActionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                      <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.accentViolet} />
                    </View>
                    <Text style={styles.contactActionLabel}>Message</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.notAssignedText}>Walang naka-assign na responder sa incident na ito.</Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.assignedLabel}>Fire Truck Driver</Text>
            {incident.truck ? (
              <View style={styles.contactPersonRow}>
                <View style={[styles.avatarCircleLg, { backgroundColor: COLORS.surfaceMuted }]}>
                  <MaterialCommunityIcons name="fire-truck" size={22} color={COLORS.primaryOrange} />
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.contactName}>{incident.truck.driver ?? 'No driver assigned'}</Text>
                  <Text style={styles.contactRank}>
                    {incident.truck.unitCode}{incident.truck.plateNumber ? ` · ${incident.truck.plateNumber}` : ''}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.notAssignedText}>Walang naka-assign na truck.</Text>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Navigate Modal ── */}
      <Modal
        visible={navigateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNavigateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNavigateModalVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Navigate to Incident</Text>
              <TouchableOpacity onPress={() => setNavigateModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>

            {incidentPoint && (
              <>
                <View style={styles.navigateMapPreview}>
                  <WebView
                    key={incident.id}
                    ref={modalRouteMapRef}
                    originWhitelist={['*']}
                    source={{ html: routeHtml }}
                    style={styles.webview}
                    javaScriptEnabled
                    domStorageEnabled
                    startInLoadingState
                  />
                  <MapViewSwitcher active={mapView} onChange={handleChangeMapView} />
                </View>

                <View style={styles.routeStatsRow}>
                  <View style={styles.routeStatBox}>
                    <Ionicons name="time" size={16} color={COLORS.slateText} />
                    <Text style={styles.routeStatValue}>{incident.etaMinutes ?? '—'} min</Text>
                    <Text style={styles.routeStatLabel}>ETA</Text>
                  </View>
                  <View style={styles.routeStatDivider} />
                  <View style={styles.routeStatBox}>
                    <Ionicons name="speedometer" size={16} color={COLORS.slateText} />
                    <Text style={styles.routeStatValue}>{incident.distanceKm ?? '—'} km</Text>
                    <Text style={styles.routeStatLabel}>Distance</Text>
                  </View>
                </View>

                <Text style={[styles.assignedLabel, { marginTop: 16, marginBottom: 10 }]}>Open turn-by-turn in</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.navAppBtn}
                  onPress={() => {
                    setNavigateModalVisible(false);
                    openInGoogleMaps(STATION_POINT, incidentPoint);
                  }}
                >
                  <View style={[styles.navAppIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="map" size={18} color={COLORS.accentViolet} />
                  </View>
                  <Text style={styles.navAppLabel}>Google Maps</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.navAppBtn}
                  onPress={() => {
                    setNavigateModalVisible(false);
                    openInWaze(incidentPoint);
                  }}
                >
                  <View style={[styles.navAppIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="navigate" size={18} color={COLORS.primaryOrange} />
                  </View>
                  <Text style={styles.navAppLabel}>Waze</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Update Status Modal ── */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStatusModalVisible(false)} />
          <View style={styles.detailSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <TouchableOpacity onPress={() => setStatusModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>

            {isFinalStage ? (
              <View style={styles.statusResolvedBox}>
                <Ionicons name="checkmark-done-circle" size={28} color={COLORS.successGreen} />
                <Text style={styles.statusResolvedText}>
                  This incident has already reached the final stage.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.detailText}>
                  Current stage: <Text style={{ fontWeight: '800', color: COLORS.deepIndigo }}>{WORKFLOW_STAGES[currentStageIndex]}</Text>
                </Text>
                <View style={styles.statusArrowRow}>
                  <View style={styles.statusStagePill}>
                    <Text style={styles.statusStagePillText}>{WORKFLOW_STAGES[currentStageIndex]}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.mutedText} />
                  <View style={[styles.statusStagePill, styles.statusStagePillNext]}>
                    <Text style={[styles.statusStagePillText, { color: '#FFFFFF' }]}>{nextStage}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  style={[styles.primaryBtnFull, advancing && styles.btnDisabled]}
                  onPress={confirmAdvanceStage}
                  disabled={advancing}
                >
                  {advancing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>Confirm — Mark as {nextStage}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 30, backgroundColor: COLORS.background },
  errorFillText: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, textAlign: 'center' },
  retryBtn: { backgroundColor: COLORS.primaryOrange, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FONT_SIZES.caption },
  notAssignedText: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, fontStyle: 'italic' },
  btnDisabled: { opacity: 0.5 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  heroHeader: { backgroundColor: COLORS.deepIndigo, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 22 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  heroTitleGroup: { flex: 1 },
  heroLabel: {
    fontSize: 10.5, fontWeight: '700', color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2,
  },
  heroTitle: { fontSize: FONT_SIZES.cardTitle + 2, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  heroIconButton: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  heroStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  heroStatBox: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  heroStatValue: { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  heroStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.55)', textAlign: 'center' },

  heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroSubtitle: { fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },

  body: { backgroundColor: COLORS.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 16, paddingTop: 18, marginTop: -14 },

  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  firstCard: { marginTop: 0 },
  sectionLabel: { ...TYPOGRAPHY.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 8 },

  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskBadgeDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  riskDot: { width: 6, height: 6, borderRadius: 3 },
  riskBadgeText: { fontSize: FONT_SIZES.caption, fontWeight: '700' },
  riskBadgeTextDark: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  riskBadgeSmall: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  riskBadgeSmallText: { fontSize: 10, fontWeight: '700' },

  riskFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  riskFilterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, height: 32, borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  riskFilterPillActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  riskFilterDot: { width: 6, height: 6, borderRadius: 3 },
  riskFilterPillText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.slateText },
  riskFilterPillTextActive: { color: '#FFFFFF' },

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

  assignedRow: { flexDirection: 'row', gap: 12, marginTop: 0 },
  assignedCard: { flex: 1, marginTop: 8 },
  assignedLabel: {
    color: COLORS.mutedText,
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
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
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.deepIndigo,
    position: 'relative',
  },
  webview: { flex: 1, backgroundColor: COLORS.deepIndigo },

  mapViewSwitcher: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 11, padding: 3, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  mapViewButton: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8,
  },
  mapViewButtonActive: { backgroundColor: COLORS.deepIndigo },
  mapViewButtonText: { fontSize: 10, fontWeight: '700', color: COLORS.deepIndigo },
  mapViewButtonTextActive: { color: '#FFFFFF' },

  mapExpandCta: {
    position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapExpandCtaText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },

  routeLegendRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  routeLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeLegendDot: { width: 8, height: 8, borderRadius: 4 },
  routeLegendText: { color: COLORS.slateText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },

  routeStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  routeStatBox: { flex: 1, alignItems: 'center', gap: 4 },
  routeStatValue: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.secondary, fontWeight: '800' },
  routeStatLabel: { color: COLORS.mutedText, fontSize: FONT_SIZES.tiny, fontWeight: '600' },
  routeStatDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.deepIndigo, borderRadius: 14, paddingVertical: 13, marginTop: 14,
  },
  navigateBtnText: { color: '#FFFFFF', fontSize: FONT_SIZES.caption, fontWeight: '700' },

  workflowDivider: { height: 1, backgroundColor: COLORS.border, marginTop: 18, marginBottom: 14 },

  timelineHorizontalWrap: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  timelineHStep: { alignItems: 'center', width: 56 },
  timelineHDot: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineHActivePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  timelineHLabel: { color: COLORS.mutedText, fontSize: 9.5, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  timelineHConnector: { flex: 1, height: 2, marginTop: 11, borderRadius: 1 },

  nearbyCountPill: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  nearbyCountPillText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },
  nearbyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12,
    paddingHorizontal: 10, borderRadius: 14, marginBottom: 2,
  },
  nearbyRowSelected: { backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.primaryOrange },
  nearbyIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  nearbyTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5, marginBottom: 3 },
  nearbyTitle: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo, flex: 1 },
  nearbySubtitle: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, marginBottom: 4 },
  nearbyBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nearbyTimestamp: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText },
  stagePillSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  stagePillSmallText: { fontSize: 10, fontWeight: '700' },

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
  primaryBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingVertical: 14, marginTop: 18,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '85%',
  },
  detailSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, flex: 1, marginRight: 8 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },

  contactPersonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarCircleLg: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.deepIndigo,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarTextLg: { color: '#FFFFFF', fontSize: FONT_SIZES.secondary, fontWeight: '800' },
  contactName: { color: COLORS.deepIndigo, fontSize: FONT_SIZES.body, fontWeight: '800' },
  contactRank: { color: COLORS.mutedText, fontSize: FONT_SIZES.caption, marginTop: 2 },
  contactNumber: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, marginTop: 3, fontWeight: '600' },
  contactActionsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  contactActionBtn: {
    flex: 1, alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceMuted, borderRadius: 16,
    paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  contactActionIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  contactActionLabel: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },

  navigateMapPreview: {
    height: 320, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.deepIndigo, marginBottom: 14, position: 'relative',
  },
  navAppBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surfaceMuted,
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10,
  },
  navAppIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  navAppLabel: { flex: 1, fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },

  statusArrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 4 },
  statusStagePill: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  statusStagePillNext: { backgroundColor: COLORS.primaryOrange, borderColor: COLORS.primaryOrange },
  statusStagePillText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },
  statusResolvedBox: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  statusResolvedText: { color: COLORS.slateText, fontSize: FONT_SIZES.caption, textAlign: 'center', paddingHorizontal: 20 },

  seeAllBtn: {
    marginTop: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  seeAllBtnText: {
    color: COLORS.primaryOrange,
    fontWeight: '700',
    fontSize: FONT_SIZES.caption,
  },
});