import BfpHeader from '@/components/bfp/bfpHeader';
import ConfirmModal from '@/components/common/confirmModal';
import { toastError, toastSuccess, toastWarning } from '@/components/common/toast';
import { API_ENDPOINTS } from '@/constants/api';
import {
  ALERT_COLORS,
  COLORS,
  FONT_SIZES,
  RISK_COLORS,
  type AlertType,
  type RiskLevel,
} from '@/constants/theme';
import apiClient from '@/services/apiClient';
import type { BarangayData } from '@/services/riskMap';
import * as riskMapService from '@/services/riskMap';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerActions } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRouter } from 'expo-router';
import { MotiView } from 'moti';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from 'react-native-modal';
import { WebView } from 'react-native-webview';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;
type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

type IncidentStatus = 'Active' | 'Responding' | 'Verified' | 'Resolved';
type MapViewMode = 'street' | 'flat' | 'satellite';

interface Incident {
  id: string;
  type: string;
  barangay: string;
  timeAgo: string;
  severity: RiskLevel;
  status: IncidentStatus;
  reportedBy: string;
  lat: number | null;
  lng: number | null;
  referenceId?: string;
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: IoniconName;
  color: string;
  bg: string;
}

interface ActivityItem {
  id: string;
  responder: string;
  initials: string;
  action: string;
  target: string;
  timeAgo: string;
  iconBg: string;
  iconColor: string;
  icon: IoniconName;
}

type QuickActionId = 'incidents' | 'riskmap' | 'notifications' | 'callstation';

interface QuickAction {
  id: QuickActionId;
  label: string;
  icon: MCIName | IoniconName;
  useMCI?: boolean;
  bg: string;
  color: string;
}

interface NearbyRiskArea {
  id: string;
  name: string;
  risk: RiskLevel;
  distance: string;
  incidents: number;
}

type NotifCategory = 'emergency' | 'assigned' | 'verification' | 'dispatch' | 'status';

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

interface PersonnelProfile {
  id: string;
  fullName: string;
  rankTitle: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  position: string | null;
  badgeNumber: string | null;
  isVerified: boolean;
  memberSince: string;
  status?: 'On Duty' | 'Off Duty' | string;
}


// ────────────────────────────────────────────────────────────
// Static data (walang backend endpoint pa para dito)
// ───────────────────────────────────────────────────────────
const STATION_POINT =  { lat: 14.0369, lng: 120.65257};

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'incidents', label: 'View Incidents', icon: 'fire', useMCI: true, bg: '#FEF2F2', color: COLORS.criticalRed },
  { id: 'riskmap', label: 'Risk Map', icon: 'map', useMCI: false, bg: '#EEF2FF', color: COLORS.accentViolet },
  { id: 'notifications', label: 'Notifications', icon: 'notifications', useMCI: false, bg: '#FFFBEB', color: COLORS.warningAmber },
  { id: 'callstation', label: 'Call Station', icon: 'call', useMCI: false, bg: '#ECFDF5', color: COLORS.successGreen },
];

const RISK_MAP_ROUTE = '/(bfp)/alerts';
const INCIDENTS_ROUTE = '/(bfp)/incidents';
const STATION_PHONE_NUMBER = '0437401234';

const STATUS_FLOW: Record<IncidentStatus, IncidentStatus | null> = {
  Active: 'Responding',
  Responding: 'Verified',
  Verified: 'Resolved',
  Resolved: null,
};

const STATUS_NEXT_LABEL: Record<IncidentStatus, string> = {
  Active: 'Mark as Responding',
  Responding: 'Mark as Verified',
  Verified: 'Mark as Resolved',
  Resolved: 'Already Resolved',
};

const MAP_VIEWS: { key: MapViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'flat', label: 'Flat', icon: 'square-outline' },
  { key: 'street', label: 'Street', icon: 'navigate-outline' },
  { key: 'satellite', label: 'Satellite', icon: 'globe-outline' },
];

const STATUS_TO_MARKER_COLOR: Record<IncidentStatus, string> = {
  Active: COLORS.criticalRed,
  Responding: COLORS.warningAmber,
  Verified: COLORS.accentViolet,
  Resolved: COLORS.successGreen,
};

const RISK_DOT: Record<RiskLevel, string> = {
  Low: '#16A34A',
  Moderate: '#F59E0B',
  High: '#DC2626',
  Critical: '#991B1B',
};

const STAT_ICON_MAP: Record<string, { icon: IoniconName; color: string; bg: string }> = {
  Active: { icon: 'flame', color: COLORS.criticalRed, bg: '#FEF2F2' },
  Verified: { icon: 'shield-checkmark', color: COLORS.accentViolet, bg: '#EEF2FF' },
  Responding: { icon: 'car', color: COLORS.warningAmber, bg: '#FFFBEB' },
  Resolved: { icon: 'checkmark-circle', color: COLORS.successGreen, bg: '#ECFDF5' },
};

const STATUS_STYLE: Record<IncidentStatus, { bg: string; text: string; dot: string }> = {
  Active: { bg: '#FEF2F2', text: COLORS.criticalRed, dot: COLORS.criticalRed },
  Responding: { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber },
  Verified: { bg: '#EEF2FF', text: COLORS.accentViolet, dot: COLORS.accentViolet },
  Resolved: { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen },
};

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayString(): string {
  return new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ── Normalization helpers — sinisiguradong tumutugma ang status/severity
// mula sa backend papunta sa eksaktong literal keys ng STATUS_STYLE/RISK_COLORS ──
function normalizeDashboardStatus(raw: string): IncidentStatus {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'active' || s === 'pending') return 'Active';
  if (s === 'responding' || s === 'dispatched' || s === 'on_scene' || s === 'on scene') return 'Responding';
  if (s === 'verified') return 'Verified';
  if (s === 'resolved') return 'Resolved';
  return 'Active';
}

function normalizeDashboardSeverity(raw: string): RiskLevel {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'moderate') return 'Moderate';
  if (s === 'low') return 'Low';
  if (s === 'critical') return 'Critical';
  return 'Moderate';
}

async function callNumber(number: string) {
  const url = `tel:${number}`;
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    Linking.openURL(url);
  } else {
    toastError('Unable to call', 'This device cannot place phone calls.');
  }
}

function categoryIcon(cat: NotifCategory): IoniconName {
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
}

async function fetchJson<T = any>(url: string): Promise<T> {
  try {
    const { data } = await apiClient.get(url);
    if (!data.success) {
      throw new Error(`[${url}] ${data.message || 'Request failed'}`);
    }
    return data.data;
  } catch (err: any) {
    // Ilagay yung endpoint sa error message para malinaw kung aling call
    // ang nag-fail (lalo na sa Promise.all na sabay-sabay tumatakbo).
    if (err?.message?.startsWith('[')) throw err;
    const status = err?.response?.status;
    const serverMsg = err?.response?.data?.message;
    throw new Error(`[${url}] ${serverMsg || err?.message || 'Request failed'}${status ? ` (HTTP ${status})` : ''}`);
  }
}

// ────────────────────────────────────────────────────────────
// Leaflet HTML
// ────────────────────────────────────────────────────────────

    function buildDashboardMapHtml(
      incidents: Incident[],
      initialView: MapViewMode,
      barangays: BarangayData[]
    ): string {

      // Ilan sa incidents ay walang laman ang latitude/longitude sa DB —
      // i-filter muna bago i-plot para hindi masira ang center calculation
      // (dating sanhi kung bakit blangko/walang lumalabas na marker sa map).
      const plottableIncidents = incidents.filter(
        (i): i is Incident & { lat: number; lng: number } =>
          typeof i.lat === 'number' && typeof i.lng === 'number' && !Number.isNaN(i.lat) && !Number.isNaN(i.lng)
      );

      const STATION_POINT = {lat: 14.0369, lng: 120.65257 };
      const points = [STATION_POINT, ...plottableIncidents.map((i) => ({ lat: i.lat, lng: i.lng }))];
      const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
      const centerLng = points.reduce((s, p) => s + p.lng, 0) / points.length;

    const polygonsJS = barangays
      .filter((b) => Array.isArray(b.boundary) && b.boundary.length >= 3)
      .map((b) => {
        const color = RISK_COLORS[b.risk].dot;
        const latlngs = JSON.stringify(b.boundary);
        return `
          L.polygon(${latlngs}, {
            color: '${color}',
            weight: 1.5,
            fillColor: '${color}',
            fillOpacity: 0.22,
          }).addTo(map).bindPopup('<b>${b.name}</b><br/><span style="color:${color};font-weight:700;">${b.risk} Risk</span><br/>${b.incidents} incident(s)');
        `;
      })
      .join('\n');

  const markersJS = plottableIncidents
    .map((inc) => {
      const color = STATUS_TO_MARKER_COLOR[inc.status];
      return `
        var icon_${inc.id} = L.divIcon({
          className: '',
          html: '<div style="width:18px;height:18px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        L.marker([${inc.lat}, ${inc.lng}], { icon: icon_${inc.id} })
          .addTo(map)
          .bindPopup('<b>${inc.type}</b><br/>Barangay ${inc.barangay}<br/><span style="color:${color};font-weight:700;">${inc.status}</span>');
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
    html, body, #map { width: 100%; height: 100%; background: #E5E7EB; }
    .leaflet-control-attribution { display: none; }
    .leaflet-control-zoom { margin-top: 54px !important; }
    .leaflet-popup-content-wrapper { border-radius: 12px; font-family: -apple-system, sans-serif; font-size: 12px; }
    .leaflet-popup-tip-container { display: none; }
    .station-pin {
      width: 30px; height: 30px; border-radius: 10px; background: #fff;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid ${COLORS.deepIndigo}; box-shadow: 0 2px 6px rgba(0,0,0,0.35); font-size: 14px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([${centerLat}, ${centerLng}], 12);

    var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
    var flatLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' });
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });

    var layers = { street: streetLayer, flat: flatLayer, satellite: satelliteLayer };
    var currentKey = '${initialView}';
    layers[currentKey].addTo(map);

    function switchMapView(key) {
      if (!layers[key] || key === currentKey) return;
      map.removeLayer(layers[currentKey]);
      currentKey = key;
      layers[currentKey].addTo(map);
    }

    ${polygonsJS}

    var stationIcon = L.divIcon({
      className: '',
      html: '<div class="station-pin">🚒</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    L.marker([${STATION_POINT.lat}, ${STATION_POINT.lng}], { icon: stationIcon })
      .addTo(map)
      .bindPopup('<b>BFP Lian Fire Station</b>');

    ${markersJS}
  </script>
</body>
</html>
  `;
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionLabelWrap}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function RowDivider() {
  return <View style={styles.rowDivider} />;
}

function MapViewSwitcher({ active, onChange, compact }: { active: MapViewMode; onChange: (v: MapViewMode) => void; compact?: boolean }) {
  return (
    <View style={styles.mapViewSwitcher}>
      {MAP_VIEWS.map((v) => {
        const isActive = v.key === active;
        return (
          <TouchableOpacity
            key={v.key}
            activeOpacity={0.85}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(v.key);
            }}
            style={[styles.mapViewButton, isActive && styles.mapViewButtonActive]}
          >
            <Ionicons name={v.icon} size={11} color={isActive ? '#FFFFFF' : COLORS.deepIndigo} />
            {!compact && (
              <Text style={[styles.mapViewButtonText, isActive && styles.mapViewButtonTextActive]}>{v.label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StatCardItem({ stat, index }: { stat: StatCard; index: number }) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 260, delay: index * 60 }}
      style={styles.statCard}
    >
      <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
        <Ionicons name={stat.icon} size={14} color={stat.color} />
      </View>
      <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
    </MotiView>
  );
}

function IncidentRow({ incident, onPress, index }: { incident: Incident; onPress: (incident: Incident) => void; index: number }) {
  const riskPalette = RISK_COLORS[incident.severity];
  const statusPalette = STATUS_STYLE[incident.status];

  return (
    <MotiView
      from={{ opacity: 0, translateX: 14 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 260, delay: index * 50 }}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.incidentRow}
        onPress={() => {
          Haptics.selectionAsync();
          onPress(incident);
        }}
      >
        <View style={[styles.incidentStrip, { backgroundColor: riskPalette.dot }]} />
        <View style={styles.incidentBody}>
          <View style={styles.incidentTopRow}>
            <Text style={styles.incidentType}>{incident.type}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusPalette.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusPalette.dot }]} />
              <Text style={[styles.statusText, { color: statusPalette.text }]}>
                {incident.status}
              </Text>
            </View>
          </View>
          <View style={styles.incidentMetaRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.mutedText} />
            <Text style={styles.incidentMeta}>{incident.barangay}</Text>
            <Text style={styles.incidentMetaDot}>·</Text>
            <Text style={styles.incidentMeta}>{incident.timeAgo}</Text>
            <Text style={styles.incidentMetaDot}>·</Text>
            <Text style={styles.incidentMeta}>by {incident.reportedBy}</Text>
          </View>
          <View style={[styles.severityTag, { backgroundColor: riskPalette.bg }]}>
            <Text style={[styles.severityTagText, { color: riskPalette.text }]}>
              {incident.severity} Severity
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
      </TouchableOpacity>
    </MotiView>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityAvatar, { backgroundColor: item.iconBg }]}>
        <Text style={[styles.activityInitials, { color: item.iconColor }]}>{item.initials}</Text>
      </View>
      <View style={styles.activityBody}>
        <Text style={styles.activityResponder}>{item.responder}</Text>
        <Text style={styles.activityDetail}>
          {item.action}{' '}
          <Text style={styles.activityTarget}>{item.target}</Text>
        </Text>
      </View>
      <View style={styles.activityRight}>
        <View style={[styles.activityIconWrap, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.icon} size={13} color={item.iconColor} />
        </View>
        <Text style={styles.activityTime}>{item.timeAgo}</Text>
      </View>
    </View>
  );
}

function NearbyRiskRow({ area }: { area: NearbyRiskArea }) {
  const palette = RISK_COLORS[area.risk];
  return (
    <View style={styles.nearbyRow}>
      <View style={[styles.nearbyDot, { backgroundColor: palette.dot }]} />
      <View style={styles.nearbyBody}>
        <Text style={styles.nearbyName}>{area.name}</Text>
        <Text style={styles.nearbyMeta}>
          {area.distance} away · {area.incidents} incident{area.incidents === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={[styles.nearbyRiskBadge, { backgroundColor: palette.bg }]}>
        <Text style={[styles.nearbyRiskText, { color: palette.text }]}>{area.risk}</Text>
      </View>
    </View>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const ac = ALERT_COLORS[item.alertType];
  return (
    <View style={[styles.notifCard, item.unread && styles.notifCardUnread]}>
      {item.unread && <View style={styles.unreadDot} />}
      <View style={[styles.notifIconWrap, { backgroundColor: ac.bg }]}>
        <Ionicons name={categoryIcon(item.category)} size={18} color={ac.text} />
      </View>
      <View style={styles.notifBody}>
        <View style={styles.notifTopRow}>
          <Text style={[styles.notifTitle, item.unread && styles.notifTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notifTimestamp}>{item.timestamp}</Text>
        </View>
        <Text style={styles.notifDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={[styles.notifStatusBadge, { backgroundColor: ac.bg }]}>
          <Text style={[styles.notifStatusText, { color: ac.text }]}>{item.status}</Text>
        </View>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ResponderDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [personnelId, setPersonnelId] = useState<string | null>(null);

  const [stats, setStats] = useState<StatCard[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [nearbyRisk, setNearbyRisk] = useState<NearbyRiskArea[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [barangays, setBarangays] = useState<BarangayData[]>([]);
  const [profile, setProfile] = useState<PersonnelProfile | null>(null);

  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [mapView, setMapView] = useState<MapViewMode>('street');
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);

  const router = useRouter();
  const navigation = useNavigation();

  const previewMapRef = useRef<WebView>(null);
  const modalMapRef = useRef<WebView>(null);

  const activeIncidentCount = stats.find((s) => s.label === 'Active')?.value ?? 0;
  const respondingCount = stats.find((s) => s.label === 'Responding')?.value ?? 0;
  const resolvedCount = stats.find((s) => s.label === 'Resolved')?.value ?? 0;
  const dutyStatus = profile?.status === 'Off Duty' ? 'Off Duty' : 'On Duty';

  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  const badgeLabel = useMemo(() => {
    if (!profile) return 'BFP Personnel';
    const rank = profile.rankTitle?.trim();
    const badgeNum = profile.badgeNumber?.trim();
    if (rank && badgeNum) return `${rank} · Badge #${badgeNum}`;
    if (rank) return rank;
    if (profile.position) return profile.position;
    return 'BFP Personnel';
  }, [profile]);

  const loadDashboard = async (pid: string) => {
    const [statsRes, incidentsRes, activityRes, nearbyRes, notifRes, profileRes] = await Promise.allSettled([
      fetchJson(API_ENDPOINTS.bfpDashboardStats),
      fetchJson(API_ENDPOINTS.bfpDashboardIncidents),
      fetchJson(API_ENDPOINTS.bfpDashboardActivity),
      fetchJson(API_ENDPOINTS.bfpDashboardNearbyRisk),
      fetchJson(`${API_ENDPOINTS.bfpNotificationsList}?personnel_id=${pid}`),
      fetchJson(`${API_ENDPOINTS.bfpProfileRead}?personnel_id=${pid}`),
    ]);

    const failedEndpoints: string[] = [];

    if (statsRes.status === 'fulfilled') {
      const mappedStats: StatCard[] = statsRes.value.map((s: any) => ({
        id: s.id,
        label: s.label,
        value: s.value,
        icon: STAT_ICON_MAP[s.label]?.icon ?? 'stats-chart',
        color: STAT_ICON_MAP[s.label]?.color ?? COLORS.slateText,
        bg: STAT_ICON_MAP[s.label]?.bg ?? COLORS.surfaceMuted,
      }));
      setStats(mappedStats);
    } else {
      failedEndpoints.push('stats');
      console.error('bfpDashboardStats failed:', statsRes.reason);
    }

    if (incidentsRes.status === 'fulfilled') {
      // Normalize status/severity papunta sa eksaktong literal keys na
      // ginagamit ng STATUS_STYLE at RISK_COLORS — dito galing yung
      // dating "Cannot read property 'bg' of undefined" na error.
      const normalizedIncidents: Incident[] = (incidentsRes.value as any[])
        .map((inc) => ({
          ...inc,
          status: normalizeDashboardStatus(inc.status),
          severity: normalizeDashboardSeverity(inc.severity),
        }))
        .slice(0, 5);
      setIncidents(normalizedIncidents);
    } else {
      failedEndpoints.push('incidents');
      console.error('bfpDashboardIncidents failed:', incidentsRes.reason);
    }

    if (activityRes.status === 'fulfilled') {
      setActivity(activityRes.value);
    } else {
      failedEndpoints.push('activity');
      console.error('bfpDashboardActivity failed:', activityRes.reason);
    }

    if (nearbyRes.status === 'fulfilled') {
      setNearbyRisk(nearbyRes.value);
    } else {
      failedEndpoints.push('nearby risk');
      console.error('bfpDashboardNearbyRisk failed:', nearbyRes.reason);
    }

    if (notifRes.status === 'fulfilled') {
      setNotifications(notifRes.value);
    } else {
      failedEndpoints.push('notifications');
      console.error('bfpNotificationsList failed:', notifRes.reason);
    }

    if (profileRes.status === 'fulfilled') {
      setProfile(profileRes.value);
    } else {
      failedEndpoints.push('profile');
      console.error('bfpProfileRead failed:', profileRes.reason);
    }

    if (failedEndpoints.length > 0) {
      console.error('Dashboard sections that failed to load:', failedEndpoints.join(', '));
      toastWarning('Some data failed to load', `Could not load: ${failedEndpoints.join(', ')}`);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const pid = await AsyncStorage.getItem('user_id');
      console.log('🔥 BFP Dashboard — user_id from AsyncStorage:', pid);
      setPersonnelId(pid);

      if (pid) {
        await loadDashboard(pid);
      } else {
        console.warn('⚠️ Walang user_id sa AsyncStorage — hindi tatakbo yung loadDashboard.');
      }

     riskMapService.fetchRiskMap()
        .then(({ barangays: rows }) => {
          console.log('🗺️ shared risk map result:', JSON.stringify(rows)?.slice(0, 500));
          const data: BarangayData[] = rows.map((b) => ({
            id: b.id,
            name: b.name,
            risk: b.risk,
            boundary: b.boundary,
            incidents: b.verifiedIncidents,
          }));
          if (data.length === 0) {
            console.warn('⚠️ shared risk map returned walang laman — hindi lalabas ang borders/risk sa map.');
          } else {
            const withBoundary = data.filter((b) => Array.isArray(b.boundary) && b.boundary.length >= 3);
            console.log(`🗺️ ${withBoundary.length} / ${data.length} barangay(s) may valid boundary (>=3 points).`);
            if (withBoundary.length === 0) {
              console.warn('⚠️ Walang barangay na may valid "boundary" array — kaya walang polygon/border na lumalabas sa map.');
            }
          }
          setBarangays(data);
        })
        .catch((err) => {
          console.error('❌ shared risk map fetch failed:', err);
        });

      setLoading(false);
    })();
  }, []);

  function openDrawer() {
    navigation.dispatch(DrawerActions.openDrawer());
  }

  function openMapModal() {
    setMapModalVisible(true);
  }

  function goToFullRiskMap() {
    setMapModalVisible(false);
    router.push(RISK_MAP_ROUTE as any);
  }

  function goToIncidents() {
    router.push(INCIDENTS_ROUTE as any);
  }

  async function openNotificationsModal() {
    setNotifModalVisible(true);
  }

  function openIncidentDetail(incident: Incident) {
    setSelectedIncident(incident);
  }

  function closeIncidentDetail() {
    setSelectedIncident(null);
  }

  function handleChangeMapView(view: MapViewMode) {
    setMapView(view);
    const js = `switchMapView('${view}'); true;`;
    previewMapRef.current?.injectJavaScript(js);
    modalMapRef.current?.injectJavaScript(js);
  }

  async function advanceIncidentStatus(incidentId: string) {
    const target = incidents.find((i) => i.id === incidentId);
    if (!target) return;
    const next = STATUS_FLOW[target.status];
    if (!next) return;

    // optimistic update
    setIncidents((prev) => prev.map((inc) => (inc.id === incidentId ? { ...inc, status: next } : inc)));
    setSelectedIncident((prev) => (prev && prev.id === incidentId ? { ...prev, status: next } : prev));

    try {
      // ginamit yung existing incidents/report_status.php mo dito
      const { data } = await apiClient.post(API_ENDPOINTS.incidentsStatus, {
        incident_id: incidentId,
        status: next,
      });
      if (!data.success) throw new Error(data.message);
      toastSuccess('Status updated', `Marked as ${next}`);
    } catch (err) {
      toastError('Error', 'Failed to update incident status. Please try again.');
      // pwede mo idagdag dito yung revert kung gusto mong mas strict
    }
  }

  async function markNotificationRead(notifId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, unread: false } : n))
    );
    try {
      await apiClient.post(API_ENDPOINTS.bfpNotificationsMarkRead, {
        notification_id: notifId,
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  function handleQuickAction(id: QuickActionId) {
    Haptics.selectionAsync();
    switch (id) {
      case 'incidents':
        goToIncidents();
        break;
      case 'riskmap':
        openMapModal();
        break;
      case 'notifications':
        openNotificationsModal();
        break;
      case 'callstation':
        callNumber(STATION_PHONE_NUMBER);
        break;
    }
  }

  function handleLogout() {
    setLogoutConfirmVisible(true);
  }

  async function performLogout() {
    setLogoutConfirmVisible(false);
    try {
      if (personnelId) {
        // Mark responder as Off Duty bago tuluyang mag-end ang session
        await apiClient.post(API_ENDPOINTS.bfpProfileUpdateStatus, {
          personnel_id: personnelId,
          status: 'Off Duty',
        });
      }
    } catch (err) {
      console.error('Failed to update duty status on logout:', err);
    } finally {
      router.replace('/login');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      <BfpHeader
        unreadNotifCount={unreadNotifCount}
        onBellPress={openNotificationsModal}
        onLogoutPress={handleLogout}
      >
        <Text style={styles.greeting}>{getTimeOfDay()}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.responderName}>{profile?.fullName ?? 'Responder'}</Text>
          {profile?.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color={COLORS.successGreen} />
          )}
        </View>
        <View style={styles.responderBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.85)" />
          <Text style={styles.responderBadgeText}>{badgeLabel}</Text>
        </View>
        <Text style={styles.todayDate}>{getTodayString()}</Text>

        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{activeIncidentCount}</Text>
            <Text style={styles.summaryLabel}>Active Now</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{respondingCount}</Text>
            <Text style={styles.summaryLabel}>On Route</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{resolvedCount}</Text>
            <Text style={styles.summaryLabel}>Resolved</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={styles.summaryOnlineRow}>
              <View style={[styles.onlineDot, dutyStatus === 'Off Duty' && styles.offlineDot]} />
              <Text style={styles.summaryValue}>{dutyStatus}</Text>
            </View>
            <Text style={styles.summaryLabel}>Your Status</Text>
          </View>
        </View>
      </BfpHeader>

        <View style={styles.body}>
          {/* ── Quick Actions ── */}
          <View style={styles.quickPillsRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                activeOpacity={0.8}
                style={[styles.quickPill, { backgroundColor: action.bg }]}
                onPress={() => handleQuickAction(action.id)}
              >
                {action.useMCI ? (
                  <MaterialCommunityIcons name={action.icon as MCIName} size={16} color={action.color} />
                ) : (
                  <Ionicons name={action.icon as IoniconName} size={16} color={action.color} />
                )}
                <Text
                  style={[styles.quickPillLabel, { color: action.color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionLabel eyebrow="Overview" title="Today's Incident Summary" />
          <View style={styles.statGrid}>
            {stats.map((stat, index) => (
              <StatCardItem key={stat.id} stat={stat} index={index} />
            ))}
          </View>

          {/* ── Mini Map Preview ── */}
          <SectionLabel eyebrow="Coverage" title="Barangay Risk Map" />
          <View style={styles.mapCard}>
            <View style={styles.mapCardHeader}>
              <View style={styles.mapCardHeaderLeft}>
                <View style={styles.mapCardIconWrap}>
                  <Ionicons name="map" size={14} color={COLORS.accentViolet} />
                </View>
                <Text style={styles.mapCardHeaderTitle}>Live Risk Overview</Text>
              </View>
              <View style={styles.mapLiveBadge}>
                <View style={styles.mapLiveDot} />
                <Text style={styles.mapLiveBadgeText}>Live</Text>
              </View>
            </View>

            <View style={styles.mapBg}>
              <WebView
                ref={previewMapRef}
                originWhitelist={['*']}
                source={{ html: buildDashboardMapHtml(incidents, mapView, barangays) }}
                style={styles.mapWebView}
                javaScriptEnabled
                scrollEnabled={false}
                pointerEvents="none"
              />

              <MapViewSwitcher active={mapView} onChange={handleChangeMapView} compact />

              <TouchableOpacity activeOpacity={0.85} style={styles.mapOverlayCta} onPress={openMapModal}>
                <Ionicons name="expand-outline" size={14} color={COLORS.deepIndigo} />
                <Text style={styles.mapOverlayCtaText}>Open Full Map</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapLegend}>
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: COLORS.criticalRed }]} />
                <Text style={styles.mapLegendText}>Active</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: COLORS.warningAmber }]} />
                <Text style={styles.mapLegendText}>Responding</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: COLORS.successGreen }]} />
                <Text style={styles.mapLegendText}>Resolved</Text>
              </View>
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: COLORS.deepIndigo }]} />
                <Text style={styles.mapLegendText}>Station</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <SectionLabel eyebrow="Live Feed" title="Recent Incidents" />
            <TouchableOpacity activeOpacity={0.7} onPress={goToIncidents}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {incidents.map((incident, index) => (
              <View key={incident.id}>
                <IncidentRow incident={incident} onPress={openIncidentDetail} index={index} />
                {index < incidents.length - 1 && <RowDivider />}
              </View>
            ))}
          </View>

          <SectionLabel eyebrow="Team" title="Recent Responder Activity" />
          <View style={styles.card}>
            {activity.map((item, index) => (
              <View key={item.id}>
                <ActivityRow item={item} />
                {index < activity.length - 1 && <RowDivider />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Expanded Map Modal — full screen, slide animation ── */}
      <Modal
        isVisible={mapModalVisible}
        style={styles.fullScreenModalWrap}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0}
        useNativeDriver
        onBackButtonPress={() => setMapModalVisible(false)}
      >
        <View style={styles.fullMapScreen}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          <WebView
            ref={modalMapRef}
            originWhitelist={['*']}
            source={{ html: buildDashboardMapHtml(incidents, mapView, barangays) }}
            style={styles.fullMapWebView}
            javaScriptEnabled
          />

          <View style={styles.fullMapHeader}>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={styles.fullMapCloseBtn}>
              <Ionicons name="close" size={20} color={COLORS.deepIndigo} />
            </TouchableOpacity>
            <Text style={styles.fullMapHeaderTitle}>Barangay Risk Overview</Text>
            <View style={{ width: 38 }} />
          </View>

          <View style={styles.fullMapSwitcherWrap}>
            <MapViewSwitcher active={mapView} onChange={handleChangeMapView} />
          </View>

          <View style={styles.fullMapBottomPanel}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalSubTitle}>Nearby Risk Areas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyChipRow}
            >
              {nearbyRisk.map((area) => {
                const palette = RISK_COLORS[area.risk];
                return (
                  <View key={area.id} style={styles.nearbyChip}>
                    <View style={[styles.nearbyDot, { backgroundColor: palette.dot }]} />
                    <View>
                      <Text style={styles.nearbyChipName}>{area.name}</Text>
                      <Text style={styles.nearbyChipMeta}>
                        {area.distance} · {area.incidents} inc.
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity activeOpacity={0.9} style={styles.fullMapBtn} onPress={goToFullRiskMap}>
              <Ionicons name="map" size={16} color="#FFFFFF" />
              <Text style={styles.fullMapBtnText}>Open Full Risk Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Incident Detail Modal — blurred backdrop + moti scale-in ── */}
      <Modal
        isVisible={!!selectedIncident}
        style={styles.modalWrap}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropOpacity={0}
        useNativeDriver
        onBackdropPress={closeIncidentDetail}
        onBackButtonPress={closeIncidentDetail}
      >
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        {selectedIncident && (
          <MotiView
            from={{ opacity: 0, translateY: 24 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 240 }}
            style={styles.detailSheet}
          >
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{selectedIncident.type}</Text>
              <TouchableOpacity onPress={closeIncidentDetail} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.detailStatusBadge,
                { backgroundColor: STATUS_STYLE[selectedIncident.status].bg },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_STYLE[selectedIncident.status].dot },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: STATUS_STYLE[selectedIncident.status].text },
                ]}
              >
                {selectedIncident.status}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={COLORS.mutedText} />
              <Text style={styles.detailLabel}>Barangay</Text>
              <Text style={styles.detailValue}>{selectedIncident.barangay}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.mutedText} />
              <Text style={styles.detailLabel}>Reported</Text>
              <Text style={styles.detailValue}>{selectedIncident.timeAgo}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color={COLORS.mutedText} />
              <Text style={styles.detailLabel}>Reported By</Text>
              <Text style={styles.detailValue}>{selectedIncident.reportedBy}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.mutedText} />
              <Text style={styles.detailLabel}>Severity</Text>
              <Text style={styles.detailValue}>{selectedIncident.severity}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.fullMapBtn,
                selectedIncident.status === 'Resolved' && styles.fullMapBtnDisabled,
              ]}
              disabled={selectedIncident.status === 'Resolved'}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                advanceIncidentStatus(selectedIncident.id);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.fullMapBtnText}>
                {STATUS_NEXT_LABEL[selectedIncident.status]}
              </Text>
            </TouchableOpacity>
          </MotiView>
        )}
      </Modal>

      {/* ── Notifications Modal — bottom sheet slide ── */}
      <Modal
        isVisible={notifModalVisible}
        style={styles.modalWrap}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        backdropOpacity={0}
        useNativeDriver
        onBackdropPress={() => setNotifModalVisible(false)}
        onBackButtonPress={() => setNotifModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifModalVisible(false)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={18} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
            {notifications.map((item) => (
              <Pressable key={item.id} onPress={() => markNotificationRead(item.id)}>
                <NotificationRow item={item} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Logout confirm — reusable component ── */}
      <ConfirmModal
        visible={logoutConfirmVisible}
        title="Log out"
        message="Are you sure you want to log out?"
        confirmLabel="Log out"
        destructive
        onConfirm={performLogout}
        onCancel={() => setLogoutConfirmVisible(false)}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.background },
  loadingText: { fontSize: 13, color: COLORS.slateText },

  heroHeader: { backgroundColor: COLORS.deepIndigo, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 32 },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  logoutButton: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  brandLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIconWrap: { width: 28, height: 28, borderRadius: 9, backgroundColor: COLORS.primaryOrange, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.8 },
  brandAccent: { color: COLORS.primaryOrange },
  bellButton: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primaryOrange, borderWidth: 1.5, borderColor: COLORS.deepIndigo },
  greeting: { fontSize: FONT_SIZES.secondary, color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginBottom: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  responderName: { fontSize: FONT_SIZES.sectionHeading, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
 responderBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  responderBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.4 },
  todayDate: { fontSize: FONT_SIZES.caption, color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: 10, marginTop:5  },

  summaryStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
  summaryValue: { fontSize: FONT_SIZES.body, fontWeight: '800', color: '#FFFFFF' },
  summaryLabel: { fontSize: FONT_SIZES.tiny, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  summaryOnlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.successGreen },
  offlineDot: { backgroundColor: COLORS.mutedText },

  body: { backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 24, marginTop: -16 },

  sectionLabelWrap: { marginBottom: 14 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  sectionEyebrow: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.primaryOrange, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  sectionTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '700', color: COLORS.deepIndigo },
  seeAllText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.accentViolet, marginBottom: 2 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, overflow: 'hidden',
  },
  rowDivider: { height: 1, backgroundColor: COLORS.border },

  quickPillsRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, marginBottom: 20 },
  quickPill: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, paddingHorizontal: 4, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickPillLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  statGrid: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.deepIndigo, textAlign: 'center' },

  mapCard: {
    backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, marginBottom: 28,
    overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  mapCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  mapCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapCardIconWrap: { width: 26, height: 26, borderRadius: 9, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  mapCardHeaderTitle: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.deepIndigo },
  mapLiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  mapLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.successGreen },
  mapLiveBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '800', color: COLORS.successGreen },
  mapBg: { height: 190, backgroundColor: '#E5E7EB', position: 'relative', overflow: 'hidden' },
  mapWebView: { flex: 1, backgroundColor: '#E5E7EB' },

  mapViewSwitcher: {
    position: 'absolute', top: 10, left: 10,
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 10, padding: 3, gap: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  mapViewButton: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7,
  },
  mapViewButtonActive: { backgroundColor: COLORS.deepIndigo },
  mapViewButtonText: { fontSize: 10, fontWeight: '700', color: COLORS.deepIndigo },
  mapViewButtonTextActive: { color: '#FFFFFF' },

  mapOverlayCta: {
    position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapOverlayCtaText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },
  mapLegend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  mapLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  mapLegendDot: { width: 7, height: 7, borderRadius: 4 },
  mapLegendText: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, fontWeight: '600' },

  incidentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  incidentStrip: { width: 3, height: '80%', borderRadius: 2, alignSelf: 'center' },
  incidentBody: { flex: 1, gap: 5 },
  incidentTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  incidentType: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },
  incidentMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  incidentMeta: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  incidentMetaDot: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText },
  severityTag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  severityTagText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },

  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  activityAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityInitials: { fontSize: FONT_SIZES.caption, fontWeight: '800' },
  activityBody: { flex: 1 },
  activityResponder: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  activityDetail: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  activityTarget: { fontWeight: '700', color: COLORS.accentViolet },
  activityRight: { alignItems: 'flex-end', gap: 4 },
  activityIconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  activityTime: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '500' },

  modalWrap: { justifyContent: 'flex-end', margin: 0 },
  fullScreenModalWrap: { justifyContent: 'flex-end', margin: 0 },
  modalSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, flex: 1, marginRight: 8 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSubTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 10 },
  nearbyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  nearbyDot: { width: 8, height: 8, borderRadius: 4 },
  nearbyBody: { flex: 1 },
  nearbyName: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  nearbyMeta: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 2 },
  nearbyRiskBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  nearbyRiskText: { fontSize: FONT_SIZES.tiny, fontWeight: '800' },
  fullMapBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryOrange, borderRadius: 16, paddingVertical: 14,
  },
  fullMapBtnDisabled: { backgroundColor: COLORS.mutedText },
  fullMapBtnText: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: '#FFFFFF' },

  fullMapScreen: { flex: 1, backgroundColor: '#E5E7EB' },
  fullMapWebView: { flex: 1, backgroundColor: '#E5E7EB' },
  fullMapHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  fullMapCloseBtn: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  fullMapHeaderTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo },
  fullMapSwitcherWrap: { position: 'absolute', top: 116, right: 16 },
  fullMapBottomPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.card, borderTopLeftRadius: 26, borderTopRightRadius: 26,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 10,
  },
  nearbyChipRow: { gap: 10, paddingRight: 10, paddingBottom: 14 },
  nearbyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  nearbyChipName: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },
  nearbyChipMeta: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, marginTop: 1 },

  detailSheet: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
  },
  detailStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 16,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontWeight: '600', width: 90 },
  detailValue: { flex: 1, fontSize: FONT_SIZES.caption, color: COLORS.deepIndigo, fontWeight: '700', textAlign: 'right' },

  notifList: { maxHeight: 480 },
  notifCard: {
    flexDirection: 'row', gap: 12, backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, position: 'relative',
  },
  notifCardUnread: { borderColor: COLORS.accentViolet, backgroundColor: COLORS.surfaceMuted },
  unreadDot: {
    position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.accentViolet,
  },
  notifIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  notifBody: { flex: 1 },
  notifTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  notifTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.slateText, flex: 1, marginRight: 8 },
  notifTitleUnread: { color: COLORS.deepIndigo },
  notifTimestamp: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  notifDescription: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, marginTop: 4, lineHeight: 18 },
  notifStatusBadge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  notifStatusText: { fontSize: FONT_SIZES.tiny, fontWeight: '800' },
});