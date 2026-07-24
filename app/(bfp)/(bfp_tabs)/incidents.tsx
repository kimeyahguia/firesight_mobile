import BfpHeader from '@/components/bfp/bfpHeader';
import NotificationsModal from '@/components/bfp/NotificationModal';
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api';
import { COLORS, FONT_SIZES, RISK_COLORS, type RiskLevel } from '@/constants/theme';
import { useNotifications } from '@/context/NotificationsContext';
import apiClient from '@/services/apiClient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ────────────────────────────────────────────────────────────
// ⚠️ CONFIG — i-verify/i-update kung iba ang actual route ng Response tab
// sa app/(bfp)/ folder mo. Ito ang tinutumbok ng "Start Response" button.
// ────────────────────────────────────────────────────────────
const RESPONSE_SCREEN_PATH = '/(bfp)/response';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IncidentStatus = 'Pending' | 'Verified' | 'Responding' | 'Resolved';
type FilterChip = 'All' | IncidentStatus;

type TimelineStep = 'Reported' | 'Verified' | 'Dispatched' | 'On Scene' | 'Resolved';

interface TimelineItem {
  step: TimelineStep;
  done: boolean;
  active: boolean;
  timestamp?: string;
  actor?: string;
}

interface IncidentPhoto {
  url: string;
  caption?: string | null;
  createdAt?: string | null;
}

interface ActionEntry {
  id: string;
  actionType: string;
  note: string | null;
  personnel: string;
  photos: string[];
  createdAt: string;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  update: 'Update',
  arrived: 'Arrived on Scene',
  note: 'Note',
  resources: 'Additional Resources',
  contained: 'Fire Contained',
};

function actionTypeLabel(type: string): string {
  return ACTION_TYPE_LABELS[type] ?? (type.charAt(0).toUpperCase() + type.slice(1));
}

interface Incident {
  id: string;
  refId: string;
  reporter: string;
  reporterPhone: string;
  reporterBarangay: string;
  barangay: string;
  location: string;
  type: string;
  dateTime: string;
  status: IncidentStatus;
  severity: RiskLevel;
  description: string;
  photoAttached: boolean;
  photoUrl?: string | null;
  photos: IncidentPhoto[];
  actions: ActionEntry[];
  causeOfFire?: string;
  findings?: string;
  additionalNotes?: string;
  latitude: number;
  longitude: number;
  timeline: TimelineItem[];
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  peopleAtRisk?: string | number | null;
  fireActive?: boolean | null;
  respondersOnSite?: string | number | null;
}

// Raw shape na ibinabalik ng incidents.php
interface RawIncident {
  id: string;
  refId: string;
  reporter: string | null;
  reporterPhone: string | null;
  reporterBarangay: string | null;
  barangay: string | null;
  location: string | null;
  type: string | null;
  dateTime: string;
  status: string;
  severity: string | null;
  description: string | null;
  photoAttached: boolean;
  photoUrl: string | null;
  photos?: { url: string; caption: string | null; createdAt: string | null }[] | null;
  actions?: ActionEntry[] | null;
  causeOfFire: string | null;
  findings: string | null;
  additionalNotes: string | null;
  latitude: number | null;
  longitude: number | null;
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  peopleAtRisk?: string | number | boolean | null;
  fireActive?: string | number | boolean | null;
  respondersOnSite?: string | number | boolean | null;
}

// Nagko-convert ng loosely-typed boolean values (0/1, "true"/"false", atbp.) mula sa PHP
function normalizeBoolean(raw: string | number | boolean | null | undefined): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  const s = String(raw).trim().toLowerCase();
  if (s === '1' || s === 'true' || s === 'yes') return true;
  if (s === '0' || s === 'false' || s === 'no') return false;
  return null;
}

// palitan ng:
function resolvePhotoUri(photoUrl?: string | null): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('data:')) return photoUrl; // base64 data URI galing sa longblob, ready na
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const cleanBase = API_BASE_URL.replace(/\/$/, '');
  const cleanPath = photoUrl.replace(/^\//, '');
  return `${cleanBase}/${cleanPath}`;
}

// ────────────────────────────────────────────────────────────
// Single-marker Leaflet map (Incident Location) — ginagamit sa parehong
// inline preview at sa full-screen map modal
// ────────────────────────────────────────────────────────────

function buildIncidentLocationMapHtml(
  lat: number,
  lng: number,
  label: string,
  initialView: 'street' | 'flat' | 'satellite'
): string {
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
    .pin-incident {
      width: 30px; height: 30px; border-radius: 15px;
      display: flex; align-items: center; justify-content: center;
      border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      font-size: 15px; background: ${COLORS.criticalRed};
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lng}], 16);

    var streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    });
    var flatLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap, &copy; CARTO'
    });
    var satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19, attribution: 'Tiles &copy; Esri'
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

    const incidentIcon = L.divIcon({
      className: '',
      html: '<div class="pin-incident">🔥</div>',
      iconSize: [30, 30], iconAnchor: [15, 15],
    });

    L.marker([${lat}, ${lng}], { icon: incidentIcon })
      .addTo(map)
      .bindPopup(${JSON.stringify(label)});
  </script>
</body>
</html>
  `;
}

// ────────────────────────────────────────────────────────────
// Timeline builder — dahil hindi nag-eexpose ng timeline steps ang backend,
// buo natin client-side base sa current status
// ────────────────────────────────────────────────────────────

const TIMELINE_ORDER: TimelineStep[] = ['Reported', 'Verified', 'Dispatched', 'On Scene', 'Resolved'];

const STATUS_TO_STEP_INDEX: Record<IncidentStatus, number> = {
  Pending: 0,    // Reported lang ang tapos, Verified ang kasalukuyan
  Verified: 1,
  Responding: 2, // Dispatched
  Resolved: 4,
};

function buildTimeline(incident: { status: IncidentStatus; dateTime: string; verifiedByName?: string | null; verifiedAt?: string | null }): TimelineItem[] {
  const { status, dateTime, verifiedByName, verifiedAt } = incident;
  const activeIndex = STATUS_TO_STEP_INDEX[status] ?? 0;
  return TIMELINE_ORDER.map((step, index) => {
    const done = status === 'Resolved' ? true : index < activeIndex;
    const active = status === 'Resolved' ? step === 'Resolved' : index === activeIndex;

    let timestamp: string | undefined;
    let actor: string | undefined;

    if (index === 0) {
      timestamp = dateTime;
    } else if (step === 'Verified' && (done || active) && verifiedAt) {
      timestamp = verifiedAt;
      actor = verifiedByName ?? undefined;
    }

    return { step, done, active, timestamp, actor };
  });
}

function normalizeStatus(raw: string): IncidentStatus {
  const s = raw.trim().toLowerCase();
  if (s === 'pending') return 'Pending';
  if (s === 'verified') return 'Verified';
  if (s === 'responding' || s === 'dispatched' || s === 'on_scene' || s === 'on scene') return 'Responding';
  if (s === 'resolved') return 'Resolved';
  return 'Pending';
}

function normalizeSeverity(raw: string | null): RiskLevel {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'high') return 'High';
  if (s === 'moderate') return 'Moderate';
  if (s === 'low') return 'Low';
  if (s === 'critical') return 'Critical';
  return 'Moderate';
}

function mapRawIncident(raw: RawIncident): Incident {
  const status = normalizeStatus(raw.status);
  const base = {
    id: raw.id,
    refId: raw.refId,
    reporter: raw.reporter ?? 'Unknown',
    reporterPhone: raw.reporterPhone ?? '',
    reporterBarangay: raw.reporterBarangay ?? raw.barangay ?? '',
    barangay: raw.barangay ?? '',
    location: raw.location ?? '',
    type: raw.type ?? 'Fire Incident',
    dateTime: raw.dateTime,
    status,
    severity: normalizeSeverity(raw.severity),
    description: raw.description ?? '',
    photoAttached: !!raw.photoAttached,
    photoUrl: raw.photoUrl,
    photos:
      raw.photos && raw.photos.length > 0
        ? raw.photos.map((p) => ({ url: p.url, caption: p.caption, createdAt: p.createdAt }))
        : raw.photoUrl
        ? [{ url: raw.photoUrl, caption: null, createdAt: null }]
        : [],
    actions: raw.actions ?? [],
    causeOfFire: raw.causeOfFire ?? undefined,
    findings: raw.findings ?? undefined,
    additionalNotes: raw.additionalNotes ?? undefined,
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    verifiedByName: raw.verifiedByName ?? null,
    verifiedAt: raw.verifiedAt ?? null,
    peopleAtRisk: typeof raw.peopleAtRisk === 'boolean' ? null : (raw.peopleAtRisk ?? null),
    fireActive: normalizeBoolean(raw.fireActive),
    respondersOnSite: typeof raw.respondersOnSite === 'boolean' ? null : (raw.respondersOnSite ?? null),
  };
  return { ...base, timeline: buildTimeline(base) };
}

const FILTER_CHIPS: FilterChip[] = ['All', 'Pending', 'Verified', 'Responding', 'Resolved'];

const TIMELINE_ICONS: Record<TimelineStep, keyof typeof Ionicons.glyphMap> = {
  Reported: 'alert-circle',
  Verified: 'shield-checkmark',
  Dispatched: 'car',
  'On Scene': 'flame',
  Resolved: 'checkmark-circle',
};

// ────────────────────────────────────────────────────────────
// Status / helper config
// ────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<IncidentStatus, { bg: string; text: string; dot: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Pending: { bg: '#FFF7ED', text: '#C2410C', dot: COLORS.primaryOrange, icon: 'time-outline' },
  Verified: { bg: '#EEF2FF', text: COLORS.accentViolet, dot: COLORS.accentViolet, icon: 'shield-checkmark-outline' },
  Responding: { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber, icon: 'car-outline' },
  Resolved: { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen, icon: 'checkmark-circle-outline' },
};

const FILTER_COUNT = (incidents: Incident[], filter: FilterChip) =>
  filter === 'All' ? incidents.length : incidents.filter((i) => i.status === filter).length;

type DateRangePreset = 'all' | 'today' | 'week' | 'month';

const DATE_RANGE_OPTIONS: { key: DateRangePreset; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

function parseIncidentDate(dateTimeStr: string): Date | null {
  const datePart = dateTimeStr.split('·')[0]?.trim() ?? dateTimeStr;
  const d = new Date(datePart);
  return isNaN(d.getTime()) ? null : d;
}

function matchesDateRange(dateTimeStr: string, preset: DateRangePreset): boolean {
  if (preset === 'all') return true;
  const d = parseIncidentDate(dateTimeStr);
  if (!d) return true; // huwag itago kung hindi ma-parse
  const now = new Date();
  if (preset === 'today') return d.toDateString() === now.toDateString();
  if (preset === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo && d <= now;
  }
  if (preset === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return d >= monthAgo && d <= now;
  }
  return true;
}

// ────────────────────────────────────────────────────────────
// Shared small components
// ────────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: RiskLevel }) {
  const palette = RISK_COLORS[level];
  return (
    <View style={[shared.severityBadge, { backgroundColor: palette.bg }]}>
      <View style={[shared.severityDot, { backgroundColor: palette.dot }]} />
      <Text style={[shared.severityText, { color: palette.text }]}>{level}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: IncidentStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={[shared.statusBadge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.dot} />
      <Text style={[shared.statusText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

const shared = StyleSheet.create({
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  severityDot: { width: 5, height: 5, borderRadius: 3 },
  severityText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: { fontSize: FONT_SIZES.tiny, fontWeight: '700' },
});

// ────────────────────────────────────────────────────────────
// Single zoomable page — ginagamit sa loob ng gallery viewer
// ────────────────────────────────────────────────────────────

function ZoomableImagePage({ uri }: { uri: string | null }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setLoadFailed(false);
    setLoading(true);
  }, [uri, retryKey]);

  return (
    <ScrollView
      style={{ width: SCREEN_WIDTH, height: '100%' }}
      contentContainerStyle={[photoViewerStyles.zoomPageContent, { minHeight: '100%' }]}
      maximumZoomScale={4}
      minimumZoomScale={1}
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    >
      <View style={photoViewerStyles.imageWrap}>
        {uri && !loadFailed ? (
          <>
            <Image
              key={retryKey}
              source={{ uri }}
              style={photoViewerStyles.fullImage}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadFailed(true);
              }}
            />
            {loading && (
              <View style={photoViewerStyles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
          </>
        ) : (
          <View style={photoViewerStyles.imagePlaceholder}>
            <Ionicons name={loadFailed ? 'alert-circle-outline' : 'image-outline'} size={48} color="rgba(255,255,255,0.6)" />
            <Text style={photoViewerStyles.imagePlaceholderText}>
              {loadFailed ? 'Failed to load photo' : 'No photo available'}
            </Text>
            {loadFailed && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={photoViewerStyles.retryButton}
                onPress={() => setRetryKey((k) => k + 1)}
              >
                <Ionicons name="refresh" size={14} color="#FFFFFF" />
                <Text style={photoViewerStyles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────
// Photo Viewer Modal — swipeable gallery, pinch-to-zoom bawat larawan
// ────────────────────────────────────────────────────────────

function PhotoViewerModal({
  visible,
  photoUris,
  initialIndex = 0,
  onClose,
}: {
  visible: boolean;
  photoUris: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const listRef = React.useRef<FlatList<string>>(null);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ offset: initialIndex * SCREEN_WIDTH, animated: false });
      });
    }
  }, [visible, initialIndex]);

  function goTo(next: number) {
    if (next < 0 || next >= photoUris.length) return;
    setIndex(next);
    listRef.current?.scrollToOffset({ offset: next * SCREEN_WIDTH, animated: true });
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={photoViewerStyles.overlay}>
        <TouchableOpacity style={photoViewerStyles.closeButton} activeOpacity={0.8} onPress={onClose}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {photoUris.length > 1 && (
          <View style={photoViewerStyles.counterBadge}>
            <Text style={photoViewerStyles.navCounter}>{index + 1} / {photoUris.length}</Text>
          </View>
        )}

        {photoUris.length === 0 ? (
          <View style={{ width: SCREEN_WIDTH, height: '78%' }}>
            <ZoomableImagePage uri={null} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            style={{ width: SCREEN_WIDTH, height: '78%' }}
            data={photoUris}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setIndex(newIndex);
            }}
            renderItem={({ item }) => <ZoomableImagePage uri={item} />}
          />
        )}

        {photoUris.length > 1 && (
          <View style={photoViewerStyles.navRow}>
            <TouchableOpacity
              style={[photoViewerStyles.navButton, index === 0 && { opacity: 0.35 }]}
              activeOpacity={0.8}
              disabled={index === 0}
              onPress={() => goTo(index - 1)}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={photoViewerStyles.navCounter}>{index + 1} of {photoUris.length}</Text>
            <TouchableOpacity
              style={[photoViewerStyles.navButton, index === photoUris.length - 1 && { opacity: 0.35 }]}
              activeOpacity={0.8}
              disabled={index === photoUris.length - 1}
              onPress={() => goTo(index + 1)}
            >
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Evidence Gallery — scrollable thumbnail carousel na ginagamit sa Details modal
// ────────────────────────────────────────────────────────────

function EvidenceGallery({
  photos,
  onOpenAt,
}: {
  photos: string[];
  onOpenAt: (index: number) => void;
}) {
  const [failedMap, setFailedMap] = useState<Record<number, boolean>>({});

  if (photos.length === 0) {
    return (
      <View style={detailStyles.photoThumbLarge}>
        <View style={detailStyles.photoThumbInner}>
          <Ionicons name="image-outline" size={22} color={COLORS.mutedText} />
          <Text style={detailStyles.photoThumbLabel}>No evidence photo submitted</Text>
        </View>
      </View>
    );
  }

  if (photos.length === 1) {
    const failed = failedMap[0];
    return (
      <TouchableOpacity activeOpacity={0.85} style={detailStyles.photoThumbLarge} onPress={() => onOpenAt(0)}>
        {!failed ? (
          <Image
            source={{ uri: photos[0] }}
            style={detailStyles.photoThumbImage}
            resizeMode="cover"
            onError={() => setFailedMap((m) => ({ ...m, 0: true }))}
          />
        ) : (
          <View style={detailStyles.photoThumbInner}>
            <Ionicons name="alert-circle-outline" size={22} color={COLORS.mutedText} />
            <Text style={detailStyles.photoThumbLabel}>Photo failed to load</Text>
          </View>
        )}
        <View style={detailStyles.photoExpandBadge}>
          <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {photos.map((uri, i) => {
        const failed = failedMap[i];
        return (
          <TouchableOpacity
            key={`${uri}-${i}`}
            activeOpacity={0.85}
            style={detailStyles.galleryThumb}
            onPress={() => onOpenAt(i)}
          >
            {!failed ? (
              <Image
                source={{ uri }}
                style={detailStyles.photoThumbImage}
                resizeMode="cover"
                onError={() => setFailedMap((m) => ({ ...m, [i]: true }))}
              />
            ) : (
              <View style={detailStyles.photoThumbInner}>
                <Ionicons name="alert-circle-outline" size={18} color={COLORS.mutedText} />
              </View>
            )}
            {i === 0 && (
              <View style={detailStyles.primaryPhotoBadge}>
                <Text style={detailStyles.primaryPhotoBadgeText}>Main</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────
// Add Update Modal — responder action log + optional evidence photo(s)
// ────────────────────────────────────────────────────────────

interface PickedPhoto {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}

const ACTION_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'update', label: 'Update' },
  { key: 'arrived', label: 'Arrived on Scene' },
  { key: 'note', label: 'Note' },
  { key: 'resources', label: 'Additional Resources' },
  { key: 'contained', label: 'Fire Contained' },
];

function AddUpdateModal({
  visible,
  incidentRefId,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  incidentRefId: string;
  onClose: () => void;
  onSubmit: (payload: { actionType: string; note: string; photos: PickedPhoto[] }) => Promise<void>;
}) {
  const [actionType, setActionType] = useState('update');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setActionType('update');
      setNote('');
      setPhotos([]);
      setSubmitting(false);
    }
  }, [visible]);

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Payagan ang camera access para makakuha ng litrato.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPhotos((prev) => [...prev, { uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType }]);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Gallery permission needed', 'Payagan ang photo library access para makapili ng litrato.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (!result.canceled && result.assets?.length) {
      setPhotos((prev) => [
        ...prev,
        ...result.assets.map((a) => ({ uri: a.uri, fileName: a.fileName, mimeType: a.mimeType })),
      ]);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!note.trim() && photos.length === 0) {
      Alert.alert('Kulang na impormasyon', 'Maglagay ng note o photo bago mag-submit.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ actionType, note: note.trim(), photos });
    } catch (err: any) {
      Alert.alert('Hindi Na-submit', err?.response?.data?.message ?? err?.message ?? 'May naganap na error. Subukan ulit.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={addUpdateStyles.overlay}>
        <TouchableOpacity style={addUpdateStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={addUpdateStyles.sheet}>
          <View style={addUpdateStyles.handle} />
          <View style={addUpdateStyles.header}>
            <Text style={addUpdateStyles.title}>Add Update · {incidentRefId}</Text>
            <TouchableOpacity activeOpacity={0.7} style={addUpdateStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={addUpdateStyles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={addUpdateStyles.label}>Action Type</Text>
            <View style={addUpdateStyles.chipRow}>
              {ACTION_TYPE_OPTIONS.map((opt) => {
                const active = actionType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    activeOpacity={0.8}
                    style={[addUpdateStyles.chip, active && addUpdateStyles.chipActive]}
                    onPress={() => setActionType(opt.key)}
                  >
                    <Text style={[addUpdateStyles.chipText, active && addUpdateStyles.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[addUpdateStyles.label, { marginTop: 18 }]}>Notes</Text>
            <TextInput
              style={addUpdateStyles.noteInput}
              placeholder="Ilarawan ang kasalukuyang sitwasyon o update..."
              placeholderTextColor={COLORS.mutedText}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Text style={[addUpdateStyles.label, { marginTop: 18 }]}>Evidence Photo(s)</Text>
            <View style={addUpdateStyles.photoPickRow}>
              <TouchableOpacity activeOpacity={0.85} style={addUpdateStyles.photoPickBtn} onPress={pickFromCamera}>
                <Ionicons name="camera-outline" size={18} color={COLORS.accentViolet} />
                <Text style={addUpdateStyles.photoPickBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={addUpdateStyles.photoPickBtn} onPress={pickFromGallery}>
                <Ionicons name="images-outline" size={18} color={COLORS.accentViolet} />
                <Text style={addUpdateStyles.photoPickBtnText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>

            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, marginTop: 12 }}>
                {photos.map((p, i) => (
                  <View key={`${p.uri}-${i}`} style={addUpdateStyles.previewThumbWrap}>
                    <Image source={{ uri: p.uri }} style={addUpdateStyles.previewThumb} resizeMode="cover" />
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={addUpdateStyles.previewRemoveBtn}
                      onPress={() => removePhoto(i)}
                    >
                      <Ionicons name="close" size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ height: 12 }} />
          </ScrollView>

          <View style={addUpdateStyles.footer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[addUpdateStyles.submitBtn, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={addUpdateStyles.submitBtnText}>Submit Update</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Incident Details Modal
// ────────────────────────────────────────────────────────────

function IncidentDetailsModal({
  incident: incidentProp,
  visible,
  onClose,
  onVerify,
  verifying,
  onUpdateStatus,
  updating,
  loadingDetails,
  personnelId,
  onActionAdded,
}: {
  incident: Incident | null;
  visible: boolean;
  onClose: () => void;
  onVerify: (incidentId: string) => void;
  verifying: boolean;
  onUpdateStatus: (incidentId: string, status: 'Responding' | 'Resolved') => void;
  updating: boolean;
  loadingDetails?: boolean;
  personnelId?: string | null;
  onActionAdded?: (incidentId: string, action: ActionEntry) => void;
}) {
  const router = useRouter();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoModalIndex, setPhotoModalIndex] = useState(0);
  const [galleryPhotoUris, setGalleryPhotoUris] = useState<string[]>([]);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<'street' | 'flat' | 'satellite'>('street');
  const [addUpdateVisible, setAddUpdateVisible] = useState(false);

  if (!incidentProp) return null;

  const incident = incidentProp; // narrowed, di na null dito pababa
  const photoUri = resolvePhotoUri(incident.photoUrl);
  const evidencePhotoUris = incident.photos
    .map((p) => resolvePhotoUri(p.url))
    .filter((u): u is string => !!u);

  function handleAction(label: string) {
    Alert.alert(label, `Action: ${label} for ${incident.refId}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: 'default' },
    ]);
  }

  function handleVerifyPress() {
    Alert.alert('Verify Report', `Mark ${incident.refId} as Verified?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', style: 'default', onPress: () => onVerify(incident.id) },
    ]);
  }

  function openPhoto() {
    setGalleryPhotoUris(photoUri ? [photoUri] : []);
    setPhotoModalIndex(0);
    setPhotoModalVisible(true);
  }

  function openGalleryAt(uris: string[], index: number) {
    setGalleryPhotoUris(uris);
    setPhotoModalIndex(index);
    setPhotoModalVisible(true);
  }

  function handleStartResponse() {
    onClose();
    router.push({ pathname: RESPONSE_SCREEN_PATH as any, params: { incidentId: incident.id } });
  }

  const hasCoords = incident.latitude !== 0 && incident.longitude !== 0;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={detailStyles.overlay}>
          {/* Backdrop */}
          <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={onClose} />

          <SafeAreaView style={detailStyles.sheet}>
            {/* Handle */}
            <View style={detailStyles.handle} />

            {/* Sheet header */}
            <View style={detailStyles.sheetHeader}>
              <View style={detailStyles.sheetHeaderLeft}>
                <Text style={detailStyles.sheetRefId}>{incident.refId}</Text>
                <View style={detailStyles.sheetBadgeRow}>
                  <StatusBadge status={incident.status} />
                  <SeverityBadge level={incident.severity} />
                </View>
              </View>
              {loadingDetails && (
                <ActivityIndicator size="small" color={COLORS.accentViolet} style={{ marginRight: 10 }} />
              )}
              <TouchableOpacity activeOpacity={0.7} style={detailStyles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={20} color={COLORS.slateText} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={detailStyles.scrollView}
              contentContainerStyle={detailStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* ── Incident Info card ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#FFF1E6' }]}>
                    <MaterialCommunityIcons name="fire-alert" size={16} color={COLORS.primaryOrange} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Incident Information</Text>
                </View>

                <Text style={detailStyles.incidentTypeTitle}>{incident.type}</Text>
                <Text style={detailStyles.incidentDesc}>{incident.description}</Text>

                <View style={detailStyles.infoGrid}>
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Location</Text>
                    <Text style={detailStyles.infoValue}>
                      {[incident.location, incident.barangay].filter(Boolean).join(', ')}, Lian, Batangas
                    </Text>
                  </View>
                  <View style={detailStyles.infoDivider} />
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="time-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Date & Time</Text>
                    <Text style={detailStyles.infoValue}>{incident.dateTime}</Text>
                  </View>
                  {incident.causeOfFire && (
                    <>
                      <View style={detailStyles.infoDivider} />
                      <View style={detailStyles.infoRow}>
                        <Ionicons name="flame-outline" size={14} color={COLORS.mutedText} />
                        <Text style={detailStyles.infoLabel}>Cause</Text>
                        <Text style={detailStyles.infoValue}>{incident.causeOfFire}</Text>
                      </View>
                    </>
                  )}
                  {(incident.findings || incident.additionalNotes) && (
                    <>
                      <View style={detailStyles.infoDivider} />
                      <View style={detailStyles.infoRow}>
                        <Ionicons name="document-text-outline" size={14} color={COLORS.mutedText} />
                        <Text style={detailStyles.infoLabel}>Report</Text>
                        <Text style={detailStyles.infoValue}>
                          {[incident.findings, incident.additionalNotes].filter(Boolean).join(' • ')}
                        </Text>
                      </View>
                    </>
                  )}
                  {incident.verifiedByName && (
                    <>
                      <View style={detailStyles.infoDivider} />
                      <View style={detailStyles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.accentViolet} />
                        <Text style={detailStyles.infoLabel}>Verified By</Text>
                        <Text style={detailStyles.infoValue}>
                          {incident.verifiedByName}{incident.verifiedAt ? ` · ${incident.verifiedAt}` : ''}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>

              {/* ── Situation Report card ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="alert-circle-outline" size={16} color={COLORS.criticalRed} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Situation Report</Text>
                </View>

                <View style={detailStyles.infoGrid}>
                  <View style={detailStyles.infoRow}>
                    <MaterialCommunityIcons name="fire" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Fire Status</Text>
                    <Text style={detailStyles.infoValue}>
                      {incident.fireActive === true
                        ? 'Still Active'
                        : incident.fireActive === false
                        ? 'Contained / Out'
                        : 'Not reported'}
                    </Text>
                  </View>
                  <View style={detailStyles.infoDivider} />
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="people-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>People at Risk</Text>
                    <Text style={detailStyles.infoValue}>
                      {incident.peopleAtRisk !== null && incident.peopleAtRisk !== undefined && incident.peopleAtRisk !== ''
                        ? String(incident.peopleAtRisk)
                        : 'Not reported'}
                    </Text>
                  </View>
                  <View style={detailStyles.infoDivider} />
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="people-circle-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Responders</Text>
                    <Text style={detailStyles.infoValue}>
                      {incident.respondersOnSite !== null && incident.respondersOnSite !== undefined && incident.respondersOnSite !== ''
                        ? String(incident.respondersOnSite)
                        : 'None on site yet'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Reporter Info card ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="person-outline" size={16} color={COLORS.accentViolet} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Reporter Information</Text>
                </View>

                <View style={detailStyles.reporterRow}>
                  <View style={detailStyles.reporterAvatar}>
                    <Text style={detailStyles.reporterAvatarText}>
                      {incident.reporter.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </Text>
                  </View>
                  <View style={detailStyles.reporterMeta}>
                    <Text style={detailStyles.reporterName}>{incident.reporter}</Text>
                    <Text style={detailStyles.reporterSub}>{incident.reporterBarangay}, Lian</Text>
                  </View>
                  <TouchableOpacity activeOpacity={0.85} style={detailStyles.callButton}>
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={detailStyles.infoGrid}>
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="call-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Phone</Text>
                    <Text style={detailStyles.infoValue}>{incident.reporterPhone}</Text>
                  </View>
                  <View style={detailStyles.infoDivider} />
                  <View style={detailStyles.infoRow}>
                    <Ionicons name="camera-outline" size={14} color={COLORS.mutedText} />
                    <Text style={detailStyles.infoLabel}>Photo</Text>
                    <Text style={detailStyles.infoValue}>
                      {incident.photoAttached ? 'Attached (camera-captured)' : 'Not attached'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── Report Evidence card ── */}
              {(incident.photoAttached || loadingDetails) && (
                <View style={detailStyles.sectionCard}>
                  <View style={detailStyles.sectionTitleRow}>
                    <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#F4F3FB' }]}>
                      <Ionicons name="images-outline" size={16} color={COLORS.accentViolet} />
                    </View>
                    <Text style={detailStyles.sectionTitle}>Report Evidence</Text>
                    {evidencePhotoUris.length > 1 && (
                      <View style={detailStyles.countPill}>
                        <Text style={detailStyles.countPillText}>{evidencePhotoUris.length} photos</Text>
                      </View>
                    )}
                  </View>

                  {loadingDetails && evidencePhotoUris.length === 0 ? (
                    <View style={[detailStyles.photoThumbLarge, detailStyles.skeletonBlock]} />
                  ) : (
                    <EvidenceGallery
                      photos={evidencePhotoUris}
                      onOpenAt={(i) => openGalleryAt(evidencePhotoUris, i)}
                    />
                  )}

                  <Text style={detailStyles.photoCaptureNote}>
                    <Ionicons name="shield-checkmark-outline" size={11} color={COLORS.mutedText} />
                    {' '}Photo(s) captured directly via camera by the reporter. Tap any photo to view in full screen with zoom.
                  </Text>
                </View>
              )}

              {/* ── Location card — real interactive map ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="map-outline" size={16} color={COLORS.successGreen} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Incident Location</Text>
                </View>

                {hasCoords ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={detailStyles.mapPreviewLarge}
                    onPress={() => setMapModalVisible(true)}
                  >
                    <WebView
                      style={{ flex: 1 }}
                      source={{
                        html: buildIncidentLocationMapHtml(
                          incident.latitude,
                          incident.longitude,
                          `${incident.type} · ${incident.barangay}`,
                          mapViewMode
                        ),
                      }}
                      scrollEnabled={false}
                      pointerEvents="none"
                    />
                    <View style={detailStyles.mapExpandCta}>
                      <Ionicons name="expand-outline" size={13} color={COLORS.deepIndigo} />
                      <Text style={detailStyles.mapExpandText}>Tap to view full screen</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[detailStyles.mapPreviewLarge, detailStyles.mapUnavailable]}>
                    <Ionicons name="location-outline" size={22} color={COLORS.mutedText} />
                    <Text style={detailStyles.photoThumbLabel}>No GPS coordinates on file for this report</Text>
                  </View>
                )}

                <View style={detailStyles.coordRow}>
                  <Ionicons name="navigate-outline" size={13} color={COLORS.mutedText} />
                  <Text style={detailStyles.coordText}>
                    {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
                  </Text>
                  {hasCoords && (
                    <View style={detailStyles.gpsLockedBadge}>
                      <View style={detailStyles.gpsLockedDot} />
                      <Text style={detailStyles.gpsLockedText}>GPS Locked</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── Incident Timeline card ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#FFF1E6' }]}>
                    <Ionicons name="git-branch-outline" size={16} color={COLORS.primaryOrange} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Incident Timeline</Text>
                </View>

                <View style={detailStyles.timeline}>
                  {incident.timeline.map((item, index) => {
                    const isLast = index === incident.timeline.length - 1;
                    const iconColor = item.done
                      ? COLORS.successGreen
                      : item.active
                      ? COLORS.primaryOrange
                      : COLORS.mutedText;
                    const iconBg = item.done
                      ? '#ECFDF5'
                      : item.active
                      ? '#FFF1E6'
                      : COLORS.surfaceMuted;
                    const iconName = item.done
                      ? 'checkmark-circle'
                      : item.active
                      ? TIMELINE_ICONS[item.step]
                      : 'ellipse-outline';

                    return (
                      <View key={item.step} style={detailStyles.timelineRow}>
                        {/* Left: icon + connector line */}
                        <View style={detailStyles.timelineLeft}>
                          <View style={[detailStyles.timelineIcon, { backgroundColor: iconBg }]}>
                            <Ionicons name={iconName} size={16} color={iconColor} />
                          </View>
                          {!isLast && (
                            <View
                              style={[
                                detailStyles.timelineLine,
                                { backgroundColor: item.done ? COLORS.successGreen : COLORS.border },
                              ]}
                            />
                          )}
                        </View>

                        {/* Right: content */}
                        <View style={[detailStyles.timelineContent, !isLast && { paddingBottom: 20 }]}>
                          <Text
                            style={[
                              detailStyles.timelineStep,
                              item.active && { color: COLORS.primaryOrange },
                              item.done && { color: COLORS.successGreen },
                              !item.done && !item.active && { color: COLORS.mutedText },
                            ]}
                          >
                            {item.step}
                            {item.active && !item.done && (
                              <Text style={detailStyles.timelineActivePill}>{' '}● Current</Text>
                            )}
                          </Text>
                          {item.timestamp ? (
                            <Text style={detailStyles.timelineMeta}>
                              {item.timestamp}
                              {item.actor ? ` · ${item.actor}` : ''}
                            </Text>
                          ) : (
                            <Text style={detailStyles.timelinePending}>Awaiting</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ── Responder Updates card — action log + evidence photos ── */}
              <View style={detailStyles.sectionCard}>
                <View style={detailStyles.sectionTitleRow}>
                  <View style={[detailStyles.sectionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="chatbox-ellipses-outline" size={16} color={COLORS.accentViolet} />
                  </View>
                  <Text style={detailStyles.sectionTitle}>Responder Updates</Text>
                  {incident.actions.length > 0 && (
                    <View style={detailStyles.countPill}>
                      <Text style={detailStyles.countPillText}>{incident.actions.length}</Text>
                    </View>
                  )}
                </View>

                {loadingDetails && incident.actions.length === 0 ? (
                  <View style={[detailStyles.skeletonBlock, { height: 60, borderRadius: 12 }]} />
                ) : incident.actions.length === 0 ? (
                  <Text style={detailStyles.timelinePending}>Wala pang update na naitala. Gamitin ang "Add Update / Evidence" sa baba para magdagdag.</Text>
                ) : (
                  <View style={{ gap: 14 }}>
                    {incident.actions.map((action) => {
                      const actionPhotoUris = action.photos
                        .map((p) => resolvePhotoUri(p))
                        .filter((u): u is string => !!u);
                      return (
                        <View key={action.id} style={detailStyles.actionEntry}>
                          <View style={detailStyles.actionEntryHeader}>
                            <View style={detailStyles.actionTypeBadge}>
                              <Text style={detailStyles.actionTypeBadgeText}>{actionTypeLabel(action.actionType)}</Text>
                            </View>
                            <Text style={detailStyles.actionEntryTime}>{action.createdAt}</Text>
                          </View>
                          <Text style={detailStyles.actionEntryPersonnel}>{action.personnel}</Text>
                          {action.note ? (
                            <Text style={detailStyles.actionEntryNote}>{action.note}</Text>
                          ) : null}
                          {actionPhotoUris.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                              {actionPhotoUris.map((uri, i) => (
                                <TouchableOpacity
                                  key={`${action.id}-${i}`}
                                  activeOpacity={0.85}
                                  style={detailStyles.actionPhotoThumb}
                                  onPress={() => openGalleryAt(actionPhotoUris, i)}
                                >
                                  <Image source={{ uri }} style={detailStyles.photoThumbImage} resizeMode="cover" />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* ── Action Buttons ── */}
              <View style={detailStyles.actionsCard}>
                <Text style={detailStyles.actionsTitle}>Responder Actions</Text>

                {incident.status === 'Pending' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[detailStyles.actionPrimary, verifying && { opacity: 0.7 }]}
                    onPress={handleVerifyPress}
                    disabled={verifying}
                  >
                    {verifying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark" size={19} color="#FFFFFF" />
                        <Text style={detailStyles.actionPrimaryText}>Verify Report</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {(incident.status === 'Verified' || incident.status === 'Responding') && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={detailStyles.actionStartResponse}
                    onPress={handleStartResponse}
                  >
                    <MaterialCommunityIcons name="fire-truck" size={19} color="#FFFFFF" />
                    <Text style={detailStyles.actionPrimaryText}>
                      {incident.status === 'Verified' ? 'Start Response' : 'View in Response Tab'}
                    </Text>
                  </TouchableOpacity>
                )}

                {(incident.status === 'Verified') && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[detailStyles.actionDispatch, updating && { opacity: 0.7 }]}
                    onPress={() => onUpdateStatus(incident.id, 'Responding')}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="car" size={19} color="#FFFFFF" />
                        <Text style={detailStyles.actionPrimaryText}>Dispatch Team</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {incident.status !== 'Resolved' && incident.status !== 'Pending' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[detailStyles.actionUpdate, updating && { opacity: 0.7 }]}
                    onPress={() => onUpdateStatus(incident.id, 'Resolved')}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color={COLORS.deepIndigo} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done-outline" size={17} color={COLORS.deepIndigo} />
                        <Text style={detailStyles.actionUpdateText}>Mark as Resolved</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {incident.status !== 'Pending' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={detailStyles.actionEvidence}
                    onPress={() => setAddUpdateVisible(true)}
                  >
                    <Ionicons name="camera-outline" size={17} color={COLORS.accentViolet} />
                    <Text style={detailStyles.actionEvidenceText}>Add Update / Evidence</Text>
                  </TouchableOpacity>
                )}

                {incident.status === 'Pending' && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={detailStyles.actionFalse}
                    onPress={() => handleAction('Mark as False Report')}
                  >
                    <Ionicons name="close-circle-outline" size={17} color={COLORS.criticalRed} />
                    <Text style={detailStyles.actionFalseText}>Mark as False Report</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      <PhotoViewerModal
        visible={photoModalVisible}
        photoUris={galleryPhotoUris}
        initialIndex={photoModalIndex}
        onClose={() => setPhotoModalVisible(false)}
      />

      {hasCoords && (
        <Modal
          visible={mapModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMapModalVisible(false)}
        >
          <View style={detailStyles.overlay}>
            <TouchableOpacity style={detailStyles.backdrop} activeOpacity={1} onPress={() => setMapModalVisible(false)} />
            <SafeAreaView style={detailStyles.mapModalSheet}>
              <View style={detailStyles.handle} />
              <View style={detailStyles.mapModalHeader}>
                <Text style={detailStyles.sheetRefId}>{incident.refId} · Location</Text>
                <TouchableOpacity activeOpacity={0.7} style={detailStyles.closeButton} onPress={() => setMapModalVisible(false)}>
                  <Ionicons name="close" size={20} color={COLORS.slateText} />
                </TouchableOpacity>
              </View>

              <View style={detailStyles.mapViewSwitcherRow}>
                {(['flat', 'street', 'satellite'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    activeOpacity={0.85}
                    onPress={() => setMapViewMode(v)}
                    style={[detailStyles.mapViewButton, mapViewMode === v && detailStyles.mapViewButtonActive]}
                  >
                    <Text style={[detailStyles.mapViewButtonText, mapViewMode === v && detailStyles.mapViewButtonTextActive]}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={detailStyles.mapModalMapWrap}>
                <WebView
                  style={{ flex: 1 }}
                  source={{
                    html: buildIncidentLocationMapHtml(
                      incident.latitude,
                      incident.longitude,
                      `${incident.type} · ${incident.barangay}`,
                      mapViewMode
                    ),
                  }}
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      )}

      <AddUpdateModal
        visible={addUpdateVisible}
        incidentRefId={incident.refId}
        onClose={() => setAddUpdateVisible(false)}
        onSubmit={async (payload) => {
          const formData = new FormData();
          formData.append('incident_id', incident.id);
          formData.append('personnel_id', personnelId ?? '');
          formData.append('action_type', payload.actionType);
          formData.append('note', payload.note);
          payload.photos.forEach((photo, i) => {
            formData.append('photos[]', {
              uri: photo.uri,
              name: photo.fileName ?? `evidence_${i}.jpg`,
              type: photo.mimeType ?? 'image/jpeg',
            } as any);
          });

          const { data } = await apiClient.post(API_ENDPOINTS.bfpIncidentsAddAction, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (!data.success) throw new Error(data.message || 'Failed to submit update');

          const newAction: ActionEntry = {
            id: data.data.id,
            actionType: data.data.actionType,
            note: data.data.note,
            personnel: data.data.personnel,
            photos: data.data.photos ?? [],
            createdAt: data.data.createdAt,
          };
          onActionAdded?.(incident.id, newAction);
          setAddUpdateVisible(false);
        }}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Incident Card (list item)
// ────────────────────────────────────────────────────────────

function IncidentCard({
  incident,
  onViewDetails,
  onVerify,
  verifyingId,
  onUpdateStatus,
  updatingId,
}: {
  incident: Incident;
  onViewDetails: (incident: Incident) => void;
  onVerify: (incidentId: string) => void;
  verifyingId: string | null;
  onUpdateStatus: (incidentId: string, status: 'Responding' | 'Resolved') => void;
  updatingId: string | null;
}) {
  function handleUpdate() {
    const options =
      incident.status === 'Verified'
        ? [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Responding', onPress: () => onUpdateStatus(incident.id, 'Responding') },
            { text: 'Resolved', onPress: () => onUpdateStatus(incident.id, 'Resolved') },
          ]
        : [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Resolved', onPress: () => onUpdateStatus(incident.id, 'Resolved') },
          ];
    Alert.alert('Update Status', `Update status for ${incident.refId}`, options);
  }

  function handleVerify() {
    Alert.alert('Verify Incident', `Mark ${incident.refId} as Verified?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', style: 'default', onPress: () => onVerify(incident.id) },
    ]);
  }

  const isVerifyingThis = verifyingId === incident.id;
  const isUpdatingThis = updatingId === incident.id;

  const primaryAction =
    incident.status === 'Pending'
      ? { label: isVerifyingThis ? 'Verifying...' : 'Verify', icon: 'shield-checkmark-outline' as const, onPress: handleVerify, style: listStyles.actionButtonVerify, textStyle: listStyles.actionButtonVerifyText, loading: isVerifyingThis }
      : incident.status !== 'Resolved'
      ? { label: isUpdatingThis ? 'Updating...' : 'Update', icon: 'refresh-outline' as const, onPress: handleUpdate, style: listStyles.actionButtonUpdate, textStyle: listStyles.actionButtonUpdateText, loading: isUpdatingThis }
      : null;

  return (
    <View style={listStyles.incidentCard}>
      <View style={[listStyles.cardStrip, { backgroundColor: RISK_COLORS[incident.severity].dot }]} />
      <View style={listStyles.cardInner}>

        {/* Top row */}
        <View style={listStyles.cardTopRow}>
          <View style={listStyles.cardTopLeft}>
            <Text style={listStyles.refId}>{incident.refId}</Text>
            <View style={listStyles.badgeRow}>
              <StatusBadge status={incident.status} />
              <SeverityBadge level={incident.severity} />
            </View>
          </View>
          {incident.photoAttached && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={listStyles.photoBadge}
              onPress={() => onViewDetails(incident)}
            >
              <Ionicons name="camera" size={13} color={COLORS.accentViolet} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={listStyles.incidentType}>{incident.type}</Text>
        <Text style={listStyles.incidentDescription} numberOfLines={2}>
          {incident.description}
        </Text>

        {/* Meta row */}
        <View style={listStyles.metaRow}>
          <View style={listStyles.metaChip}>
            <Ionicons name="person-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.reporter}</Text>
          </View>
          <View style={listStyles.metaChip}>
            <Ionicons name="location-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.barangay}</Text>
          </View>
          <View style={listStyles.metaChip}>
            <Ionicons name="time-outline" size={12} color={COLORS.mutedText} />
            <Text style={listStyles.metaChipText}>{incident.dateTime.split('·')[1]?.trim() ?? incident.dateTime}</Text>
          </View>
        </View>

        {/* Actions: secondary (outline) + at most one primary action */}
        <View style={listStyles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={listStyles.actionButtonOutline}
            onPress={() => onViewDetails(incident)}
          >
            <Ionicons name="eye-outline" size={15} color={COLORS.deepIndigo} />
            <Text style={listStyles.actionButtonOutlineText}>View Details</Text>
          </TouchableOpacity>

          {primaryAction && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={primaryAction.style}
              onPress={primaryAction.onPress}
              disabled={primaryAction.loading}
            >
              {primaryAction.loading ? (
                <ActivityIndicator size="small" color={incident.status === 'Pending' ? COLORS.accentViolet : '#FFFFFF'} />
              ) : (
                <Ionicons name={primaryAction.icon} size={15} color={incident.status === 'Pending' ? COLORS.accentViolet : '#FFFFFF'} />
              )}
              <Text style={primaryAction.textStyle}>{primaryAction.label}</Text>
            </TouchableOpacity>
          )}

          {incident.status === 'Resolved' && (
            <View style={listStyles.resolvedTag}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.successGreen} />
              <Text style={listStyles.resolvedTagText}>Closed</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Filter Modal
// ────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  onClose,
  barangayOptions,
  selectedBarangays,
  onToggleBarangay,
  dateRangePreset,
  onSelectDateRange,
  onReset,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  barangayOptions: string[];
  selectedBarangays: string[];
  onToggleBarangay: (name: string) => void;
  dateRangePreset: DateRangePreset;
  onSelectDateRange: (preset: DateRangePreset) => void;
  onReset: () => void;
  onApply: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={filterStyles.overlay}>
        <TouchableOpacity style={filterStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={filterStyles.sheet}>
          <View style={filterStyles.handle} />
          <View style={filterStyles.sheetHeader}>
            <Text style={filterStyles.sheetTitle}>Filter Incidents</Text>
            <TouchableOpacity activeOpacity={0.7} style={filterStyles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={COLORS.slateText} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={filterStyles.scrollView}
            contentContainerStyle={filterStyles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={filterStyles.groupLabel}>Date Range</Text>
            <View style={filterStyles.presetRow}>
              {DATE_RANGE_OPTIONS.map((p) => {
                const active = dateRangePreset === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    activeOpacity={0.8}
                    style={[filterStyles.presetChip, active && filterStyles.presetChipActive]}
                    onPress={() => onSelectDateRange(p.key)}
                  >
                    <Text style={[filterStyles.presetChipText, active && filterStyles.presetChipTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[filterStyles.groupLabel, { marginTop: 22 }]}>
              Barangay {selectedBarangays.length > 0 ? `(${selectedBarangays.length} selected)` : ''}
            </Text>
            {barangayOptions.length === 0 ? (
              <Text style={filterStyles.emptyNote}>No barangay data available.</Text>
            ) : (
              <View style={filterStyles.checklist}>
                {barangayOptions.map((name) => {
                  const checked = selectedBarangays.includes(name);
                  return (
                    <TouchableOpacity
                      key={name}
                      activeOpacity={0.8}
                      style={filterStyles.checklistRow}
                      onPress={() => onToggleBarangay(name)}
                    >
                      <View style={[filterStyles.checkbox, checked && filterStyles.checkboxChecked]}>
                        {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>
                      <Text style={filterStyles.checklistText}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={filterStyles.footerRow}>
            <TouchableOpacity activeOpacity={0.8} style={filterStyles.resetBtn} onPress={onReset}>
              <Text style={filterStyles.resetBtnText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={filterStyles.applyBtn} onPress={onApply}>
              <Text style={filterStyles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function IncidentsScreen() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('All');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // ── Live data mula sa incidents.php ──
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Verify state ──
  const [personnelId, setPersonnelId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // ── Status update state ──
  const [updatingId, setUpdatingId] = useState<string | null>(null);

// ── Notifications state ──
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const { unreadCount } = useNotifications();

  // ── Advanced filter state (barangay + date range) ──
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedBarangays, setSelectedBarangays] = useState<string[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [draftBarangays, setDraftBarangays] = useState<string[]>([]);
  const [draftDateRange, setDraftDateRange] = useState<DateRangePreset>('all');

  useEffect(() => {
    AsyncStorage.getItem('user_id').then(setPersonnelId);
  }, []);

  const fetchIncidents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMsg(null);

    try {
      const { data } = await apiClient.get(API_ENDPOINTS.bfpIncidentsList);
      if (!data.success) throw new Error(data.message || 'Failed to load incidents');
      const mapped: Incident[] = (data.data as RawIncident[]).map(mapRawIncident);
      setIncidents(mapped);
    } catch (err: any) {
      console.error('Failed to load incidents:', err);
      setErrorMsg('Hindi na-load ang incidents. Pull down para subukan ulit.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const handleVerify = useCallback(async (incidentId: string) => {
    if (!personnelId) {
      Alert.alert('Error', 'Walang naka-store na personnel ID. Mag-login muli.');
      return;
    }

    setVerifyingId(incidentId);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.bfpIncidentsVerify, {
        incident_id: incidentId,
        personnel_id: personnelId,
      });

      if (!data.success) throw new Error(data.message || 'Failed to verify incident');

      const { verifiedByName, verifiedAt } = data.data;

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          const updated: Incident = { ...inc, status: 'Verified', verifiedByName, verifiedAt };
          return { ...updated, timeline: buildTimeline(updated) };
        })
      );

      setSelectedIncident((prev) => {
        if (!prev || prev.id !== incidentId) return prev;
        const updated: Incident = { ...prev, status: 'Verified', verifiedByName, verifiedAt };
        return { ...updated, timeline: buildTimeline(updated) };
      });
    } catch (err: any) {
      console.error('Failed to verify incident:', err);
      Alert.alert('Hindi Na-verify', err?.message ?? 'May naganap na error. Subukan ulit.');
    } finally {
      setVerifyingId(null);
    }
  }, [personnelId]);

  const handleUpdateStatus = useCallback(async (incidentId: string, newStatus: 'Responding' | 'Resolved') => {
    setUpdatingId(incidentId);
    try {
      const { data } = await apiClient.post(API_ENDPOINTS.bfpIncidentsUpdateStatus, {
        incident_id: incidentId,
        status: newStatus,
        personnel_id: personnelId,
      });

      if (!data.success) throw new Error(data.message || 'Failed to update status');

      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== incidentId) return inc;
          const updated: Incident = { ...inc, status: newStatus };
          return { ...updated, timeline: buildTimeline(updated) };
        })
      );

      setSelectedIncident((prev) => {
        if (!prev || prev.id !== incidentId) return prev;
        const updated: Incident = { ...prev, status: newStatus };
        return { ...updated, timeline: buildTimeline(updated) };
      });
    } catch (err: any) {
      console.error('Failed to update status:', err);
      Alert.alert('Hindi Na-update', err?.response?.data?.message ?? err?.message ?? 'May naganap na error. Subukan ulit.');
    } finally {
      setUpdatingId(null);
    }
  }, [personnelId]);

  const handleActionAdded = useCallback((incidentId: string, action: ActionEntry) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, actions: [...inc.actions, action] } : inc))
    );
    setSelectedIncident((prev) =>
      prev && prev.id === incidentId ? { ...prev, actions: [...prev.actions, action] } : prev
    );
  }, []);

const barangayOptions = useMemo(() => {
    const set = new Set(incidents.map((i) => i.barangay).filter(Boolean));
    return Array.from(set).sort();
  }, [incidents]);


     function compareIncidentsForDisplay(a: Incident, b: Incident): number {
        const aResolved = a.status === 'Resolved' ? 1 : 0;
        const bResolved = b.status === 'Resolved' ? 1 : 0;
        if (aResolved !== bResolved) return aResolved - bResolved;

        const aDate = parseIncidentDate(a.dateTime);
        const bDate = parseIncidentDate(b.dateTime);
        if (aDate && bDate) return bDate.getTime() - aDate.getTime();
        if (aDate) return -1;
        if (bDate) return 1;
        return 0;
      }
            // Ginagamit para sa chip/summary counts — ay dapat naka-apply ang barangay/date/search
      // pero HINDI ang status filter, para tama ang bilang bawat status chip
      const baseFilteredForChips = useMemo(() => {
        let list = incidents;
        if (selectedBarangays.length > 0) {
          list = list.filter((i) => selectedBarangays.includes(i.barangay));
        }
        if (dateRangePreset !== 'all') {
          list = list.filter((i) => matchesDateRange(i.dateTime, dateRangePreset));
        }
        if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (i) =>
            i.refId.toLowerCase().includes(q) ||
            i.reporter.toLowerCase().includes(q) ||
            i.barangay.toLowerCase().includes(q) ||
            i.type.toLowerCase().includes(q)
        );
      }
      return [...list].sort(compareIncidentsForDisplay);
    }, [incidents, search, activeFilter, selectedBarangays, dateRangePreset]);

  const filtered = useMemo(() => {
    let list = incidents;
    if (activeFilter !== 'All') {
      list = list.filter((i) => i.status === activeFilter);
    }
    if (selectedBarangays.length > 0) {
      list = list.filter((i) => selectedBarangays.includes(i.barangay));
    }
    if (dateRangePreset !== 'all') {
      list = list.filter((i) => matchesDateRange(i.dateTime, dateRangePreset));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.refId.toLowerCase().includes(q) ||
          i.reporter.toLowerCase().includes(q) ||
          i.barangay.toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q)
      );
    }
    return list;
  }, [incidents, search, activeFilter, selectedBarangays, dateRangePreset]);

  const activeFilterCount = (selectedBarangays.length > 0 ? 1 : 0) + (dateRangePreset !== 'all' ? 1 : 0);

  function openFilterModal() {
    setDraftBarangays(selectedBarangays);
    setDraftDateRange(dateRangePreset);
    setFilterModalVisible(true);
  }

  function toggleDraftBarangay(name: string) {
    setDraftBarangays((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function applyFilters() {
    setSelectedBarangays(draftBarangays);
    setDateRangePreset(draftDateRange);
    setFilterModalVisible(false);
  }

  function resetFilters() {
      setDraftBarangays([]);
      setDraftDateRange('all');
      setSelectedBarangays([]);
      setDateRangePreset('all');
    }

  async function handleViewDetails(incident: Incident) {
    // Ipakita agad ang modal gamit ang cached data mula sa list para instant ang feel
    setSelectedIncident(incident);
    setDetailsVisible(true);
    setDetailsLoading(true);

    console.log('Fetching details for incident id:', incident.id);
    
    try {
       const { data } = await apiClient.get(API_ENDPOINTS.bfpIncidentDetails, {
        params: { id: incident.id },
      });
      if (!data.success) throw new Error(data.message || 'Failed to load incident details');

      const fresh = mapRawIncident(data.data as RawIncident);
      setSelectedIncident(fresh);

      // I-sync din sa list para updated ang card kapag nagbago ang laman (hal. photo, status)
      setIncidents((prev) => prev.map((inc) => (inc.id === fresh.id ? fresh : inc)));
    } catch (err: any) {
      console.error('Failed to load incident details:', err);
      // Cached data pa rin ang nakadisplay; hindi na natin i-block ang user
    } finally {
      setDetailsLoading(false);
    }
  }

  return (
    <SafeAreaView style={listStyles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <NotificationsModal visible={notifModalVisible} onClose={() => setNotifModalVisible(false)} />

      <ScrollView
        style={listStyles.scrollView}
        contentContainerStyle={listStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchIncidents(true)} tintColor={COLORS.deepIndigo} />
        }
      >
        <BfpHeader unreadNotifCount={unreadCount} onBellPress={() => setNotifModalVisible(true)}>
        <View style={listStyles.headerTopRow}>
          <View>
            <Text style={listStyles.headerEyebrow}>BFP Lian Fire Station</Text>
            <Text style={listStyles.headerTitle}>Incidents</Text>
          </View>
          <TouchableOpacity activeOpacity={0.8} style={listStyles.headerIconButton} onPress={openFilterModal}>
            <Ionicons name="funnel-outline" size={19} color="rgba(255,255,255,0.9)" />
            {activeFilterCount > 0 && <View style={listStyles.bellDot} />}
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={listStyles.summaryStrip}>
          {(['Pending', 'Responding', 'Verified', 'Resolved'] as IncidentStatus[]).map((s, index, arr) => (
            <React.Fragment key={s}>
              <View style={listStyles.summaryItem}>
                <Text style={[listStyles.summaryValue, { color: STATUS_STYLE[s].dot }]}>
                  {FILTER_COUNT(baseFilteredForChips, s)}
                </Text>
                <Text style={listStyles.summaryLabel}>{s}</Text>
              </View>
              {index < arr.length - 1 && <View style={listStyles.summaryDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Search bar */}
        <View style={listStyles.searchBar}>
          <Ionicons name="search-outline" size={17} color="rgba(255,255,255,0.6)" />
          <TextInput
            style={listStyles.searchInput}
            placeholder="Search by ID, reporter, barangay..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </BfpHeader>

      {/* ── Filter chips ── */}
      <View style={listStyles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={listStyles.filtersScroll}
        >
          {FILTER_CHIPS.map((chip) => {
            const active = activeFilter === chip;
            const count = FILTER_COUNT(baseFilteredForChips, chip);
            return (
              <TouchableOpacity
                key={chip}
                activeOpacity={0.8}
                style={[listStyles.filterChip, active && listStyles.filterChipActive]}
                onPress={() => setActiveFilter(chip)}
              >
                <Text style={[listStyles.filterChipText, active && listStyles.filterChipTextActive]}>
                  {chip}
                </Text>
                <View style={[listStyles.filterChipCount, active && listStyles.filterChipCountActive]}>
                  <Text style={[listStyles.filterChipCountText, active && listStyles.filterChipCountTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>


      {/* ── Incident list ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        {loading ? (
          <View style={listStyles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.deepIndigo} />
            <Text style={[listStyles.emptySubtitle, { marginTop: 12 }]}>Loading incidents...</Text>
          </View>
        ) : errorMsg ? (
          <View style={listStyles.emptyState}>
            <View style={listStyles.emptyIconWrap}>
              <Ionicons name="cloud-offline-outline" size={36} color={COLORS.mutedText} />
            </View>
            <Text style={listStyles.emptyTitle}>Hindi ma-load</Text>
            <Text style={listStyles.emptySubtitle}>{errorMsg}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={listStyles.emptyState}>
            <View style={listStyles.emptyIconWrap}>
              <MaterialCommunityIcons name="fire-off" size={36} color={COLORS.mutedText} />
            </View>
            <Text style={listStyles.emptyTitle}>No incidents found</Text>
            <Text style={listStyles.emptySubtitle}>
              {search
                ? 'Try a different search term.'
                : `No ${activeFilter.toLowerCase()} incidents at the moment.`}
            </Text>
          </View>
        ) : (
          <>
            <Text style={listStyles.resultCount}>
              {filtered.length} incident{filtered.length !== 1 ? 's' : ''}
              {activeFilter !== 'All' ? ` · ${activeFilter}` : ''}
            </Text>
            {filtered.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                onViewDetails={handleViewDetails}
                onVerify={handleVerify}
                verifyingId={verifyingId}
                onUpdateStatus={handleUpdateStatus}
                updatingId={updatingId}
              />
            ))}
          </>
      )}
        <View style={{ height: 32 }} />
      </View>
      </ScrollView>

{/* ── Details Modal ── */}
      <IncidentDetailsModal
        incident={selectedIncident}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        onVerify={handleVerify}
        verifying={!!selectedIncident && verifyingId === selectedIncident.id}
        onUpdateStatus={handleUpdateStatus}
        updating={!!selectedIncident && updatingId === selectedIncident.id}
        loadingDetails={detailsLoading}
        personnelId={personnelId}
        onActionAdded={handleActionAdded}
      />

      {/* ── Filter Modal ── */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        barangayOptions={barangayOptions}
        selectedBarangays={draftBarangays}
        onToggleBarangay={toggleDraftBarangay}
        dateRangePreset={draftDateRange}
        onSelectDateRange={setDraftDateRange}
        onReset={resetFilters}
        onApply={applyFilters}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// List Styles
// ────────────────────────────────────────────────────────────

const listStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.deepIndigo },
  header: {
    backgroundColor: COLORS.deepIndigo,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: FONT_SIZES.sectionHeading,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bellDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    borderWidth: 1.5,
    borderColor: COLORS.deepIndigo,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 13,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 3 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 },
  summaryValue: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800' },
  summaryLabel: { fontSize: FONT_SIZES.tiny, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchInput: { flex: 1, fontSize: FONT_SIZES.secondary, color: '#FFFFFF', padding: 0 },
  filtersWrap: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    marginTop: -4,
  },
  filtersScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 14 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterChipText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.slateText },
  filterChipTextActive: { color: '#FFFFFF' },
  filterChipCount: { backgroundColor: COLORS.border, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  filterChipCountActive: { backgroundColor: 'rgba(255,255,255,0.18)' },
  filterChipCountText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.slateText },
  filterChipCountTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingTop: 0 },
  resultCount: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.mutedText,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incidentCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardStrip: { width: 4 },
  cardInner: { flex: 1, padding: 16, gap: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTopLeft: { flex: 1, gap: 8 },
  refId: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.accentViolet, letterSpacing: 0.4 },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  photoBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  incidentType: { fontSize: FONT_SIZES.body, fontWeight: '800', color: COLORS.deepIndigo },
  incidentDescription: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: { fontSize: FONT_SIZES.tiny, color: COLORS.slateText, fontWeight: '600', maxWidth: 120 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButtonOutline: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  actionButtonOutlineText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },
  actionButtonVerify: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: 'rgba(109,91,208,0.25)',
  },
  actionButtonVerifyText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.accentViolet },
  actionButtonUpdate: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12,
    backgroundColor: COLORS.deepIndigo,
  },
  actionButtonUpdateText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: '#FFFFFF' },
  resolvedTag: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 44, borderRadius: 12, backgroundColor: '#ECFDF5',
  },
  resolvedTagText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.successGreen },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: FONT_SIZES.secondary, color: COLORS.mutedText, textAlign: 'center', lineHeight: 20 },
});

// ────────────────────────────────────────────────────────────
// Detail Modal Styles
// ────────────────────────────────────────────────────────────

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.90,   // dating 0.85
    minHeight: SCREEN_HEIGHT * 0.65,   // dating 0.45
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetHeaderLeft: { flex: 1 },
  sheetRefId: { fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.accentViolet, letterSpacing: 0.4, marginBottom: 8 },
  sheetBadgeRow: { flexDirection: 'row', gap: 6 },
  closeButton: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },

  incidentTypeTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 6 },
  incidentDesc: { fontSize: FONT_SIZES.secondary, color: COLORS.slateText, lineHeight: 21, marginBottom: 16 },
  infoGrid: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 12 },
  infoLabel: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontWeight: '600', width: 68 },
  infoValue: { fontSize: FONT_SIZES.caption, color: COLORS.deepIndigo, fontWeight: '700', flex: 1, lineHeight: 18 },
  infoDivider: { height: 1, backgroundColor: COLORS.border },

  reporterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  reporterAvatar: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(109,91,208,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  reporterAvatarText: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.accentViolet },
  reporterMeta: { flex: 1 },
  reporterName: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  reporterSub: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  callButton: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: COLORS.successGreen, alignItems: 'center', justifyContent: 'center',
  },

  photosRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoThumb: {
    flex: 1, height: 90, borderRadius: 14, overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  photoThumbInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoThumbLabel: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  photoThumbLarge: {
    height: 190, borderRadius: 16, overflow: 'hidden', marginBottom: 10,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
    position: 'relative',
  },
  photoThumbImage: { width: '100%', height: '100%' },
  photoExpandBadge: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(17,24,39,0.55)', borderRadius: 999, padding: 7,
  },
  primaryPhotoBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.deepIndigo, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
  },
  primaryPhotoBadgeText: { fontSize: FONT_SIZES.tiny, color: '#FFFFFF', fontWeight: '700' },
  photoCaptureNote: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, lineHeight: 16 },

  mapPreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  mapBg: {
    height: 130, backgroundColor: '#EEF2FF', position: 'relative', overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  mapGridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(109,91,208,0.12)' },
  mapGridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(109,91,208,0.12)' },
  mapPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.criticalRed, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#FFFFFF',
    shadowColor: COLORS.criticalRed, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  mapExpandCta: {
    position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mapExpandText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coordText: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, fontWeight: '500', flex: 1 },
  gpsLockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5,
  },
  gpsLockedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.successGreen },
  gpsLockedText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.successGreen },

  timeline: { paddingTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineLeft: { alignItems: 'center', width: 32 },
  timelineIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4, borderRadius: 1 },
  timelineContent: { flex: 1, paddingBottom: 4 },
  timelineStep: { fontSize: FONT_SIZES.secondary, fontWeight: '700', marginBottom: 3 },
  timelineActivePill: { fontSize: FONT_SIZES.tiny, color: COLORS.primaryOrange, fontWeight: '700' },
  timelineMeta: { fontSize: FONT_SIZES.caption, color: COLORS.slateText },
  timelinePending: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontStyle: 'italic' },

  actionsCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.border, padding: 16, marginBottom: 16, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  actionsTitle: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: COLORS.deepIndigo, marginBottom: 4 },
  actionPrimary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accentViolet, borderRadius: 14, height: 52,
    shadowColor: COLORS.accentViolet, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionDispatch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.criticalRed, borderRadius: 14, height: 52,
    shadowColor: COLORS.criticalRed, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  actionPrimaryText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: '#FFFFFF' },
  actionUpdate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14, height: 48,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionUpdateText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  actionEvidence: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EEF2FF', borderRadius: 14, height: 48,
    borderWidth: 1, borderColor: 'rgba(109,91,208,0.2)',
  },
  actionEvidenceText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.accentViolet },
  actionFalse: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'transparent', borderRadius: 14, height: 48,
    borderWidth: 1.5, borderColor: 'rgba(220,38,38,0.3)',
  },
  actionFalseText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.criticalRed },
  actionStartResponse: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.successGreen, borderRadius: 14, height: 52,
    shadowColor: COLORS.successGreen, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },

  // ── Gallery / count pill ──
  countPill: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border, marginLeft: 'auto',
  },
  countPillText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.deepIndigo },
  galleryThumb: {
    width: 130, height: 130, borderRadius: 14, overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border, position: 'relative',
  },
  skeletonBlock: { backgroundColor: COLORS.surfaceMuted },

  // ── Real interactive map ──
  mapPreviewLarge: {
    height: 220, borderRadius: 16, overflow: 'hidden', marginBottom: 12,
    backgroundColor: COLORS.deepIndigo, position: 'relative', borderWidth: 1, borderColor: COLORS.border,
  },
  mapUnavailable: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.surfaceMuted },
  mapModalSheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    height: SCREEN_HEIGHT * 0.88,
  },
  mapModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  mapViewSwitcherRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  mapViewButton: {
    paddingHorizontal: 16, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  mapViewButtonActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  mapViewButtonText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo },
  mapViewButtonTextActive: { color: '#FFFFFF' },
  mapModalMapWrap: { flex: 1, marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },

  // ── Responder Updates entries ──
  actionEntry: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12,
  },
  actionEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actionTypeBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  actionTypeBadgeText: { fontSize: FONT_SIZES.tiny, fontWeight: '700', color: COLORS.accentViolet },
  actionEntryTime: { fontSize: FONT_SIZES.tiny, color: COLORS.mutedText, fontWeight: '600' },
  actionEntryPersonnel: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4 },
  actionEntryNote: { fontSize: FONT_SIZES.caption, color: COLORS.slateText, lineHeight: 18 },
  actionPhotoThumb: {
    width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
});

// ────────────────────────────────────────────────────────────
// Photo Viewer Styles
// ────────────────────────────────────────────────────────────

const photoViewerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  closeButton: {
    position: 'absolute', top: 54, right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  imageWrap: { width: '85%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%', borderRadius: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholder: {
    width: '100%', height: '100%', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  imagePlaceholderText: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.secondary, fontWeight: '600' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 24 },
  navButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
 navCounter: { color: '#FFFFFF', fontSize: FONT_SIZES.caption, fontWeight: '700' },
  counterBadge: {
    position: 'absolute', top: 54, left: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8, zIndex: 10,
  },
  zoomPageContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: FONT_SIZES.caption, fontWeight: '700' },
});

// ────────────────────────────────────────────────────────────
// Filter Modal Styles
// ────────────────────────────────────────────────────────────

const filterStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.85,
    minHeight: SCREEN_HEIGHT * 0.55,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetTitle: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo },
  closeButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surfaceMuted, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  groupLabel: {
    fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 14, height: 38, justifyContent: 'center', borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  presetChipActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  presetChipText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.slateText },
  presetChipTextActive: { color: '#FFFFFF' },

  checklist: {
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 4,
  },
  checklistRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 12, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceMuted,
  },
  checkboxChecked: { backgroundColor: COLORS.primaryOrange, borderColor: COLORS.primaryOrange },
  checklistText: { fontSize: FONT_SIZES.secondary, fontWeight: '600', color: COLORS.deepIndigo },
  emptyNote: { fontSize: FONT_SIZES.caption, color: COLORS.mutedText, fontStyle: 'italic' },

  footerRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  resetBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  resetBtnText: { fontSize: FONT_SIZES.secondary, fontWeight: '700', color: COLORS.deepIndigo },
  applyBtn: {
    flex: 1.4, alignItems: 'center', justifyContent: 'center', height: 50, borderRadius: 14,
    backgroundColor: COLORS.primaryOrange,
  },
  applyBtnText: { fontSize: FONT_SIZES.secondary, fontWeight: '800', color: '#FFFFFF' },
});

// ────────────────────────────────────────────────────────────
// Add Update Modal Styles
// ────────────────────────────────────────────────────────────

const addUpdateStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.55)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONT_SIZES.cardTitle, fontWeight: '800', color: COLORS.deepIndigo, flex: 1, marginRight: 8 },
  closeButton: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  label: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, height: 38, justifyContent: 'center', borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.accentViolet, borderColor: COLORS.accentViolet },
  chipText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.slateText },
  chipTextActive: { color: '#FFFFFF' },
  noteInput: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, fontSize: FONT_SIZES.secondary, color: COLORS.deepIndigo, minHeight: 100,
  },
  photoPickRow: { flexDirection: 'row', gap: 10 },
  photoPickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: 'rgba(109,91,208,0.2)',
  },
  photoPickBtnText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.accentViolet },
  previewThumbWrap: { width: 76, height: 76, borderRadius: 12, position: 'relative' },
  previewThumb: { width: '100%', height: '100%', borderRadius: 12 },
  previewRemoveBtn: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.criticalRed, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.background,
  },
  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accentViolet, borderRadius: 14, height: 52,
  },
  submitBtnText: { fontSize: FONT_SIZES.body, fontWeight: '700', color: '#FFFFFF' },
});