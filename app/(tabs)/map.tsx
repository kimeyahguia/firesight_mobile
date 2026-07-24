import AppHeader from '@/components/common/AppHeader';
import RiskMapView from '@/components/shared/riskMapView';
import {
  ALERT_COLORS,
  AlertType,
  COLORS,
  RISK_COLORS
} from '@/constants/theme';
import * as riskMapService from '@/services/riskMap';
import type { RecentActivityItem, RiskBarangay, RiskMarker } from '@/types/riskMap';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { WebView } from 'react-native-webview';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type FilterOption = 'All' | 'Low Risk' | 'Moderate Risk' | 'High Risk';
type MapViewMode = 'street' | 'flat' | 'satellite';

// Local extension only — does not touch the shared RecentActivityItem type.
type ActivityItemExtended = RecentActivityItem & {
  barangay?: string;
  severity?: string;
  status?: string;
  created_at?: string;
  time_ago?: string;
};

// Local extension only — does not touch the shared RiskBarangay type.
// If/when the backend starts returning thisWeek/thisMonth/trend/insight,
// these fields populate automatically; otherwise the card falls back
// to values derived from existing fields (verifiedIncidents, lastIncidentAt).
type BarangayExtended = RiskBarangay & {
  thisWeek?: number;
  thisMonth?: number;
  trend?: 'increasing' | 'stable' | 'decreasing';
  insight?: string;
};

const FILTERS: FilterOption[] = ['All', 'Low Risk', 'Moderate Risk', 'High Risk'];

const MAP_VIEWS: { key: MapViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'flat', label: 'Flat', icon: 'square-outline' },
  { key: 'street', label: 'Street', icon: 'navigate-outline' },
  { key: 'satellite', label: 'Satellite', icon: 'globe-outline' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CAROUSEL_CARD_SPACING = 16;
const CAROUSEL_SNAP = CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_SPACING;

const RISK_METER_PERCENT: Record<string, number> = { Low: 0.3, Moderate: 0.55, High: 0.8, Critical: 1 };

// ────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'No updates yet';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return 'No updates yet';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function trendIcon(trend?: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  if (trend === 'increasing') return { name: 'trending-up-outline', color: '#DC2626' };
  if (trend === 'decreasing') return { name: 'trending-down-outline', color: '#16A34A' };
  if (trend === 'stable') return { name: 'remove-outline', color: COLORS.mutedText };
  return { name: 'help-circle-outline', color: COLORS.mutedText };
}

function getInsight(item: BarangayExtended): string {
  if (item.insight) return item.insight;
  if (item.verifiedIncidents === 0) return 'No verified incidents recorded';
  if (!item.lastIncidentAt) return 'No recent incident data';
  const d = new Date(item.lastIncidentAt.replace(' ', 'T'));
  if (!isNaN(d.getTime())) {
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 7) return 'Recent incident activity this week';
    if (item.risk === 'High' || item.risk === 'Critical') return 'Elevated risk — monitor closely';
  }
  return 'No incidents in the last 7 days';
}

// Small reusable press-scale wrapper for native-feeling microinteractions.
function usePressScale(toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function FilterChip({ label, active, onPress }: { label: FilterOption; active: boolean; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.filterChip, active && styles.filterChipActive]}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

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
            <Ionicons name={v.icon} size={13} color={isActive ? '#FFFFFF' : COLORS.deepIndigo} />
            <Text style={[styles.mapViewButtonText, isActive && styles.mapViewButtonTextActive]}>{v.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Risk Intelligence Dashboard card — Apple Health / Wallet / Stripe Analytics hybrid.
function BarangayAnalyticsCard({
  item,
  selected,
  onPress,
}: {
  item: BarangayExtended;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = RISK_COLORS[item.risk];
  const selectedScale = useRef(new Animated.Value(selected ? 1 : 0.94)).current;
  const { scale: pressScale, onPressIn, onPressOut } = usePressScale(0.97);

  useEffect(() => {
    Animated.spring(selectedScale, {
      toValue: selected ? 1 : 0.94,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();
  }, [selected, selectedScale]);

  const trend = trendIcon(item.trend);
  const meterPct = RISK_METER_PERCENT[item.risk] ?? 0.5;
  const insight = getInsight(item);

  return (
    <Animated.View
      style={[
        styles.carouselCardWrap,
        { transform: [{ scale: selectedScale }, { scale: pressScale }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.carouselCard, selected && styles.carouselCardSelected]}
      >
        <LinearGradient
          colors={[palette.bg, COLORS.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.carouselHeaderRow}>
          <View style={styles.carouselNameGroup}>
            <View style={[styles.barangayDot, { backgroundColor: palette.dot }]} />
            <Text style={styles.carouselName} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={[styles.riskBadgeSmall, styles.carouselRiskBadge, { backgroundColor: palette.bg, borderColor: palette.dot }]}>
            <Text style={[styles.riskBadgeSmallText, { color: palette.text }]}>{item.risk.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.carouselStatRow}>
          <Text style={styles.carouselStatNumber}>{item.verifiedIncidents}</Text>
          <Text style={styles.carouselStatLabel}>Verified{'\n'}Incidents</Text>
        </View>

        <View style={styles.carouselMeterTrack}>
          <View style={[styles.carouselMeterFill, { width: `${meterPct * 100}%`, backgroundColor: palette.dot }]} />
        </View>

        <View style={styles.carouselTrendRow}>
          <Ionicons name={trend.name} size={14} color={trend.color} />
          <Text style={[styles.carouselTrendText, { color: trend.color }]}>
            {item.trend ? item.trend.charAt(0).toUpperCase() + item.trend.slice(1) : 'Trend N/A'}
          </Text>
        </View>

        <View style={styles.carouselMiniStatsRow}>
          <View style={styles.carouselMiniStat}>
            <Text style={styles.carouselMiniStatValue}>{item.thisWeek ?? '—'}</Text>
            <Text style={styles.carouselMiniStatLabel}>This Week</Text>
          </View>
          <View style={styles.carouselMiniStatDivider} />
          <View style={styles.carouselMiniStat}>
            <Text style={styles.carouselMiniStatValue}>{item.thisMonth ?? '—'}</Text>
            <Text style={styles.carouselMiniStatLabel}>This Month</Text>
          </View>
          <View style={styles.carouselMiniStatDivider} />
          <View style={styles.carouselMiniStat}>
            <Text style={styles.carouselMiniStatValue}>{item.verifiedIncidents}</Text>
            <Text style={styles.carouselMiniStatLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.carouselInsightRow}>
          <Ionicons name="bulb-outline" size={13} color={COLORS.primaryOrange} />
          <Text style={styles.carouselInsightText} numberOfLines={2}>{insight}</Text>
        </View>

        <Text style={styles.carouselUpdatedText}>Updated {formatTimeAgo(item.lastIncidentAt)}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ActivityRow({ item }: { item: ActivityItemExtended }) {
  const palette = ALERT_COLORS[item.type as AlertType] ?? ALERT_COLORS[Object.keys(ALERT_COLORS)[0] as AlertType];
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityRowTop}>
        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
        {!!item.type && (
          <View style={[styles.activityBadge, { backgroundColor: palette.bg }]}>
            <Text style={[styles.activityBadgeText, { color: palette.text }]}>{item.type}</Text>
          </View>
        )}
      </View>

      <View style={styles.activityMetaRow}>
        {!!item.barangay && (
          <View style={styles.activityMetaItem}>
            <Ionicons name="location-outline" size={12} color={COLORS.mutedText} />
            <Text style={styles.activityMetaText}>{item.barangay}</Text>
          </View>
        )}
        {!!item.severity && (
          <View style={styles.activityMetaItem}>
            <Ionicons name="warning-outline" size={12} color={COLORS.mutedText} />
            <Text style={styles.activityMetaText}>{item.severity}</Text>
          </View>
        )}
        {!!item.status && (
          <View style={styles.activityMetaItem}>
            <Ionicons name="checkmark-circle-outline" size={12} color={COLORS.mutedText} />
            <Text style={styles.activityMetaText}>{item.status}</Text>
          </View>
        )}
      </View>

      <Text style={styles.activityTimestamp}>
        {item.created_at ? formatDate(item.created_at) : ''}{item.time_ago ? ` · ${item.time_ago}` : ''}
      </Text>
    </View>
  );
}

function InlineErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.inlineErrorBanner}>
      <Ionicons name="alert-circle-outline" size={16} color="#B45309" />
      <Text style={styles.inlineErrorText} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onRetry} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.inlineErrorRetry}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// Incident History bottom sheet — scoped to the selected barangay.
function IncidentHistorySheet({
  visible,
  onClose,
  barangayName,
  loading,
  error,
  data,
  onRetry,
}: {
  visible: boolean;
  onClose: () => void;
  barangayName: string;
  loading: boolean;
  error: string | null;
  data: riskMapService.IncidentHistoryItem[];
  onRetry: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <View>
              <Text style={styles.sheetEyebrow}>Incident History</Text>
              <Text style={styles.sheetTitle}>{barangayName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color={COLORS.mutedText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.sheetCenterState}>
                <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                <Text style={styles.sheetCenterStateText}>Loading history…</Text>
              </View>
            ) : error ? (
              <InlineErrorBanner message={error} onRetry={onRetry} />
            ) : data.length === 0 ? (
              <Text style={styles.emptyText}>No incident history recorded for this barangay.</Text>
            ) : (
              data.map((incident, index) => (
                <View key={incident.id}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyDateCol}>
                      <Text style={styles.historyDateText}>{formatDate(incident.incident_date)}</Text>
                    </View>
                    <View style={styles.historyContentCol}>
                      <Text style={styles.historyRowTitle}>{incident.title}</Text>
                      <Text style={styles.historyRowCategory}>{incident.category}</Text>
                      <View style={[styles.riskBadgeSmall, styles.riskBadgeInline, { backgroundColor: 'rgba(120,120,140,0.10)' }]}>
                        <Text style={[styles.riskBadgeSmallText, { color: COLORS.deepIndigo }]}>
                          {incident.status?.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {index < data.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function MapScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [selectedId, setSelectedId] = useState<string>('');
  const [barangays, setBarangays] = useState<RiskBarangay[]>([]);
  const [markers, setMarkers] = useState<RiskMarker[]>([]);
  const [activity, setActivity] = useState<ActivityItemExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapView, setMapView] = useState<MapViewMode>('street');
  const [outerScrollEnabled, setOuterScrollEnabled] = useState(true);

  const [fatalErrorMsg, setFatalErrorMsg] = useState<string | null>(null);
  const [barangaysError, setBarangaysError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Incident History sheet state
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<riskMapService.IncidentHistoryItem[]>([]);

  const webViewRef = useRef<WebView>(null);
  const carouselRef = useRef<ScrollView>(null);

  const historyPress = usePressScale(0.96);
  const reportPress = usePressScale(0.96);
  const ctaPress = usePressScale(0.97);
  const locatePress = usePressScale(0.9);

  const loadRiskMap = useCallback(async () => {
    try {
      const { barangays: data, markers: markerData } = await riskMapService.fetchRiskMap();
      setBarangays(data);
      setMarkers(markerData);
      setBarangaysError(null);
      setSelectedId((prev) => {
        if (prev && data.some((b) => b.id === prev)) return prev;
        return data[0]?.id ?? '';
      });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load barangay data.';
      setBarangaysError(message);
      return false;
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      const data = await riskMapService.fetchRecentIncidents();
      setActivity(data as ActivityItemExtended[]);
      setActivityError(null);
      return true;
    } catch (err) {
      const message = err instanceof riskMapService.RiskMapApiError
        ? err.message
        : 'Failed to load recent activity.';
      setActivityError(message);
      return false;
    }
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFatalErrorMsg(null);

    const [barangaysOk, activityOk] = await Promise.all([loadRiskMap(), loadActivity()]);

    if (!barangaysOk && !activityOk) {
      setFatalErrorMsg('Unable to load map data. Please check your connection and try again.');
    }

    setLoading(false);
    setRefreshing(false);
  }, [loadRiskMap, loadActivity]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selected = barangays.find((b) => b.id === selectedId) ?? barangays[0];

  const filteredBarangays = barangays.filter((b) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Low Risk') return b.risk === 'Low';
    if (activeFilter === 'Moderate Risk') return b.risk === 'Moderate';
    if (activeFilter === 'High Risk') return b.risk === 'High' || b.risk === 'Critical';
    return true;
  });

  const filteredMarkers = markers.filter((m) =>
    filteredBarangays.some((b) => b.name === m.barangay)
  );

  const scrollToBarangay = useCallback((id: string) => {
    const index = filteredBarangays.findIndex((b) => b.id === id);
    if (index === -1 || !carouselRef.current) return;
    carouselRef.current.scrollTo({ x: index * CAROUSEL_SNAP, animated: true });
  }, [filteredBarangays]);

  const handleSelectBarangay = useCallback((id: string, opts?: { scroll?: boolean }) => {
    setSelectedId(id);
    const b = barangays.find((x) => x.id === id);
    if (b && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.focusBarangay) { window.focusBarangay('${b.id}', ${b.lat}, ${b.lng}, 16); }
        true;
      `);
    }
    if (opts?.scroll !== false) {
      scrollToBarangay(id);
    }
  }, [barangays, scrollToBarangay]);

  const handleCarouselMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.max(0, Math.min(Math.round(offsetX / CAROUSEL_SNAP), filteredBarangays.length - 1));
    const b = filteredBarangays[index];
    if (b && b.id !== selectedId) {
      handleSelectBarangay(b.id, { scroll: false });
    }
  };

  const handleChangeMapView = (view: MapViewMode) => {
    setMapView(view);
    webViewRef.current?.injectJavaScript(`switchMapView('${view}'); true;`);
  };

  const loadHistory = useCallback(async () => {
    if (!selected) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await riskMapService.fetchIncidentHistory(selected.id);
      setHistoryData(data);
    } catch (err) {
      const message = err instanceof riskMapService.RiskMapApiError
        ? err.message
        : 'Failed to load incident history.';
      setHistoryError(message);
    } finally {
      setHistoryLoading(false);
    }
  }, [selected]);

  const handleIncidentHistory = () => {
    if (!selected) return;
    setHistoryVisible(true);
    loadHistory();
  };

  const handleBellPress = () => {
    // TODO: wire actual notifications
  };

  if (loading && barangays.length === 0 && activity.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <AppHeader title="Risk Map" subtitle="Lian, Batangas" showLocation showBell onBellPress={handleBellPress} showBrand />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.centerStateText}>Loading risk map…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fatalErrorMsg && barangays.length === 0 && activity.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        <AppHeader title="Risk Map" subtitle="Lian, Batangas" showLocation showBell onBellPress={handleBellPress} showBrand />
        <View style={styles.centerState}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.mutedText} />
          <Text style={styles.centerStateText}>{fatalErrorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={outerScrollEnabled}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLORS.primaryOrange} />
        }
      >
        <View style={styles.headerWrap}>
          <AppHeader
            title="Risk Map"
            subtitle="Lian, Batangas"
            showLocation
            showBell
            onBellPress={handleBellPress}
            showBrand
          />
        </View>

        {barangaysError && barangays.length > 0 && (
          <InlineErrorBanner message={barangaysError} onRetry={loadRiskMap} />
        )}
        {activityError && activity.length > 0 && (
          <InlineErrorBanner message={activityError} onRetry={loadActivity} />
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
          {FILTERS.map((f) => (
            <FilterChip key={f} label={f} active={activeFilter === f} onPress={() => setActiveFilter(f)} />
          ))}
        </ScrollView>

        <View
          style={styles.mapCard}
          onTouchStart={() => setOuterScrollEnabled(false)}
          onTouchEnd={() => setOuterScrollEnabled(true)}
          onTouchCancel={() => setOuterScrollEnabled(true)}
        >
          <RiskMapView
            ref={webViewRef}
            barangays={filteredBarangays}
            markers={filteredMarkers}
            selectedName={selected?.id ?? null}
            showMarkers
            baseLayer={mapView}
            style={styles.mapWebView}
          />

          <MapViewSwitcher active={mapView} onChange={handleChangeMapView} />

          {selected && (
            <Animated.View style={[styles.locateButtonWrap, { transform: [{ scale: locatePress.scale }] }]}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={locatePress.onPressIn}
                onPressOut={locatePress.onPressOut}
                style={styles.locateButton}
                onPress={() => {
                  webViewRef.current?.injectJavaScript(`
                    map.setView([${selected.lat}, ${selected.lng}], 15, { animate: true });
                    true;
                  `);
                }}
              >
                <Ionicons name="locate" size={18} color={COLORS.deepIndigo} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        {selected && (
          <LinearGradient
            colors={[COLORS.deepIndigo, '#2D2A6E', '#161339']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.detailCard}
          >
            <View style={styles.detailOrbLarge} pointerEvents="none" />
            <View style={styles.detailOrbSmall} pointerEvents="none" />

            <View style={styles.detailTopRow}>
              <View style={styles.detailTitleGroup}>
                <View style={styles.detailPinWrap}>
                  <Ionicons name="location" size={14} color={COLORS.primaryOrange} />
                </View>
                <Text style={styles.detailName}>{selected.name}</Text>
              </View>
              <View style={[styles.riskBadgeSmall, { backgroundColor: RISK_COLORS[selected.risk].bg }]}>
                <Text style={[styles.riskBadgeSmallText, { color: RISK_COLORS[selected.risk].text }]}>
                  {selected.risk} Risk
                </Text>
              </View>
            </View>

            <Text style={styles.detailNote}>{selected.note}</Text>

            <View style={styles.detailDivider} />

            <View style={styles.detailMetaRow}>
              <View style={styles.detailMetaItem}>
                <MaterialCommunityIcons name="fire-alert" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={styles.detailMetaText}>
                  {selected.verifiedIncidents} verified {selected.verifiedIncidents === 1 ? 'incident' : 'incidents'}
                </Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.55)" />
                <Text style={styles.detailMetaText}>Updated {formatTimeAgo(selected.lastIncidentAt)}</Text>
              </View>
            </View>

            <View style={styles.detailActionsRow}>
              <Animated.View style={[styles.detailButtonFlex, { transform: [{ scale: historyPress.scale }] }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={historyPress.onPressIn}
                  onPressOut={historyPress.onPressOut}
                  style={styles.detailSecondaryButton}
                  onPress={handleIncidentHistory}
                >
                  <Ionicons name="time-outline" size={15} color={COLORS.deepIndigo} />
                  <Text style={styles.detailSecondaryButtonText}>Incident History</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={[styles.detailButtonFlex, { transform: [{ scale: reportPress.scale }] }]}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={reportPress.onPressIn}
                  onPressOut={reportPress.onPressOut}
                  style={styles.detailPrimaryButton}
                  onPress={() => router.push('/(tabs)/report' as any)}
                >
                  <Ionicons name="flame" size={15} color="#FFFFFF" />
                  <Text style={styles.detailPrimaryButtonText}>Report Fire Here</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </LinearGradient>
        )}

        <Text style={styles.sectionTitle}>Barangay Risk Snapshot</Text>
        {barangays.length === 0 && barangaysError ? (
          <Text style={styles.emptyText}>{barangaysError}</Text>
        ) : filteredBarangays.length === 0 ? (
          <Text style={styles.emptyText}>No barangays match this filter.</Text>
        ) : (
          <ScrollView
            ref={carouselRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CAROUSEL_SNAP}
            decelerationRate="fast"
            snapToAlignment="start"
            onMomentumScrollEnd={handleCarouselMomentumEnd}
            contentContainerStyle={styles.carouselContent}
            style={styles.carouselScroll}
          >
            {filteredBarangays.map((item) => (
              <BarangayAnalyticsCard
                key={item.id}
                item={item as BarangayExtended}
                selected={item.id === selectedId}
                onPress={() => handleSelectBarangay(item.id)}
              />
            ))}
          </ScrollView>
        )}

        <Text style={styles.sectionTitle}>Recent Incident Activity</Text>
        <View style={styles.activityCard}>
          {activity.length === 0 && activityError ? (
            <Text style={styles.emptyText}>{activityError}</Text>
          ) : activity.length === 0 ? (
            <Text style={styles.emptyText}>No fire incidents recorded in the last 14 days.</Text>
          ) : (
            activity.map((item, index) => (
              <View key={item.id}>
                <ActivityRow item={item} />
                {index < activity.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        <LinearGradient
          colors={['rgba(249,115,22,0.14)', 'rgba(30,27,75,0.06)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaCard}
        >
          <View style={styles.ctaIconWrap}>
            <LinearGradient
              colors={[COLORS.primaryOrange, '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaIconGradient}
            >
              <Ionicons name="alert-circle" size={26} color="#FFFFFF" />
            </LinearGradient>
          </View>
          <View style={styles.ctaTextGroup}>
            <Text style={styles.ctaTitle}>Notice a fire nearby?</Text>
            <Text style={styles.ctaSubtitle}>Report it immediately so responders can act fast.</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: ctaPress.scale }] }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPressIn={ctaPress.onPressIn}
              onPressOut={ctaPress.onPressOut}
              onPress={() => router.push('/(tabs)/report' as any)}
            >
              <LinearGradient
                colors={[COLORS.deepIndigo, '#2D2A6E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaButtonText}>Report</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        <View style={{ height: 40 }} />
      </ScrollView>

      <IncidentHistorySheet
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        barangayName={selected?.name ?? ''}
        loading={historyLoading}
        error={historyError}
        data={historyData}
        onRetry={loadHistory}
      />
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },

  headerWrap: { marginBottom: 6 },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 14 },
  centerStateText: { fontSize: 14, color: COLORS.slateText, textAlign: 'center', lineHeight: 20, letterSpacing: 0.1 },
  retryButton: {
    marginTop: 6, backgroundColor: COLORS.primaryOrange, borderRadius: 16,
    paddingHorizontal: 24, paddingVertical: 12,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 3,
  },
  retryButtonText: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  emptyText: { fontSize: 13, color: COLORS.mutedText, textAlign: 'center', paddingVertical: 22, lineHeight: 18 },

  inlineErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF6E9', borderRadius: 18, borderWidth: 1, borderColor: '#FBE7C6',
    paddingHorizontal: 16, paddingVertical: 13, marginBottom: 16,
    shadowColor: '#B45309', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 1,
  },
  inlineErrorText: { flex: 1, fontSize: 12.5, color: '#92400E', lineHeight: 17 },
  inlineErrorRetry: { fontSize: 12.5, fontWeight: '700', color: '#B45309', letterSpacing: 0.1 },

  filterScrollContent: { gap: 10, paddingRight: 8, paddingVertical: 2, marginBottom: 20 },
  filterChip: {
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999,
    backgroundColor: 'rgba(120,120,140,0.08)',
    borderWidth: 1, borderColor: 'rgba(120,120,140,0.12)',
  },
  filterChipActive: {
    backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 3,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: COLORS.slateText, letterSpacing: 0.1 },
  filterChipTextActive: { color: '#FFFFFF', fontWeight: '700' },

  mapCard: {
    borderRadius: 30, marginBottom: 24, overflow: 'hidden', height: 460, position: 'relative',
    borderWidth: 1, borderColor: 'rgba(120,120,140,0.10)',
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.12, shadowRadius: 28, elevation: 6,
    backgroundColor: COLORS.card,
  },
  mapWebView: { flex: 1, backgroundColor: '#E9EBEF' },

  mapViewSwitcher: {
  position: 'absolute', top: 14, right: 14,
  flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.9)',
  borderRadius: 16, padding: 4, gap: 2,
  borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
  shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4,
  },
  mapViewButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  mapViewButtonActive: {
    backgroundColor: COLORS.deepIndigo,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 2,
  },
  mapViewButtonText: { fontSize: 11.5, fontWeight: '700', color: COLORS.deepIndigo, letterSpacing: 0.1 },
  mapViewButtonTextActive: { color: '#FFFFFF' },

  locateButtonWrap: { position: 'absolute', bottom: 14, right: 14 },
  locateButton: {
    width: 44, height: 44, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },

  detailCard: {
    borderRadius: 28, padding: 22, marginBottom: 28,
    position: 'relative', overflow: 'hidden',
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 26, elevation: 6,
  },
  detailOrbLarge: {
    position: 'absolute', top: -70, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(249,115,22,0.16)',
  },
  detailOrbSmall: {
    position: 'absolute', bottom: -50, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  detailTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  detailTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailPinWrap: {
    width: 26, height: 26, borderRadius: 9, backgroundColor: 'rgba(249,115,22,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  detailName: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },
  detailNote: { fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 20, marginBottom: 16 },
  detailDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)', marginBottom: 16 },
  detailMetaRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailMetaText: { fontSize: 12, color: 'rgba(255,255,255,0.58)', fontWeight: '500', letterSpacing: 0.1 },
  detailActionsRow: { flexDirection: 'row', gap: 12 },
  detailButtonFlex: { flex: 1 },
  detailSecondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16, paddingVertical: 13,
  },
  detailSecondaryButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.deepIndigo, letterSpacing: 0.1 },
  detailPrimaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: COLORS.primaryOrange, borderRadius: 16, paddingVertical: 13,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 3,
  },
  detailPrimaryButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.1 },

  sectionTitle: { fontSize: 19, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 16, letterSpacing: 0.2 },

  riskBadgeSmall: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 },
  riskBadgeInline: { alignSelf: 'flex-start', marginBottom: 12 },
  riskBadgeSmallText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },

  barangayDot: { width: 8, height: 8, borderRadius: 4 },

  // Risk Intelligence Dashboard carousel
  carouselScroll: { marginBottom: 28 },
  carouselContent: { paddingHorizontal: (SCREEN_WIDTH - CAROUSEL_CARD_WIDTH) / 2, paddingVertical: 8 },
  carouselCardWrap: { width: CAROUSEL_CARD_WIDTH, marginRight: CAROUSEL_CARD_SPACING },
  carouselCard: {
    borderRadius: 28, padding: 22, minHeight: 300,
    borderWidth: 1, borderColor: 'rgba(120,120,140,0.12)',
    backgroundColor: COLORS.card, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 20, elevation: 3,
  },
  carouselCardSelected: {
    borderColor: COLORS.primaryOrange, borderWidth: 1.5,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 26, elevation: 6,
  },
  carouselHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  carouselNameGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  carouselName: { fontSize: 17, fontWeight: '700', color: COLORS.deepIndigo, letterSpacing: 0.1, flexShrink: 1 },
  carouselRiskBadge: { borderWidth: 1 },
  carouselStatRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 14 },
  carouselStatNumber: { fontSize: 44, fontWeight: '800', color: COLORS.deepIndigo, letterSpacing: -1, lineHeight: 46 },
  carouselStatLabel: { fontSize: 11, fontWeight: '600', color: COLORS.mutedText, lineHeight: 14, marginBottom: 6, letterSpacing: 0.1 },
  carouselMeterTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(120,120,140,0.14)', overflow: 'hidden', marginBottom: 14 },
  carouselMeterFill: { height: '100%', borderRadius: 3 },
  carouselTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  carouselTrendText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.1 },
  carouselMiniStatsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(120,120,140,0.06)', borderRadius: 16, paddingVertical: 12, marginBottom: 14,
  },
  carouselMiniStat: { flex: 1, alignItems: 'center' },
  carouselMiniStatValue: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 2 },
  carouselMiniStatLabel: { fontSize: 10, color: COLORS.mutedText, fontWeight: '600', letterSpacing: 0.1 },
  carouselMiniStatDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(120,120,140,0.2)' },
  carouselInsightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 10 },
  carouselInsightText: { flex: 1, fontSize: 12, color: COLORS.slateText, lineHeight: 16.5 },
  carouselUpdatedText: { fontSize: 11, color: COLORS.mutedText, letterSpacing: 0.1 },

  // Activity — Apple Health-style timeline.
  activityCard: {
    backgroundColor: COLORS.card, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(120,120,140,0.10)', marginBottom: 28, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2,
  },
  activityRow: { paddingVertical: 16 },
  activityRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 10 },
  activityTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, flex: 1, letterSpacing: 0.1 },
  activityBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  activityBadgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },
  activityMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  activityMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activityMetaText: { fontSize: 12, color: COLORS.slateText, letterSpacing: 0.1 },
  activityTimestamp: { fontSize: 11.5, color: COLORS.mutedText, letterSpacing: 0.1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(120,120,140,0.16)' },

  ctaCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 28, padding: 20, gap: 16,
    borderWidth: 1, borderColor: 'rgba(249,115,22,0.18)',
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.14, shadowRadius: 26, elevation: 4,
    overflow: 'hidden',
  },
  ctaIconWrap: {
    width: 56, height: 56, borderRadius: 20,
    shadowColor: COLORS.primaryOrange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 14, elevation: 4,
  },
  ctaIconGradient: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ctaTextGroup: { flex: 1, paddingRight: 2 },
  ctaTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 4, letterSpacing: 0.1 },
  ctaSubtitle: { fontSize: 12.5, color: COLORS.slateText, lineHeight: 17.5 },
  ctaButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13,
    shadowColor: COLORS.deepIndigo, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 14, elevation: 3,
  },
  ctaButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  // Incident History bottom sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,15,25,0.45)' },
  sheetContainer: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, maxHeight: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10,
  },
  sheetHandle: {
    width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(120,120,140,0.25)',
    alignSelf: 'center', marginBottom: 14,
  },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sheetEyebrow: { fontSize: 11.5, fontWeight: '700', color: COLORS.primaryOrange, letterSpacing: 0.4, marginBottom: 2 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.deepIndigo, letterSpacing: 0.1 },
  sheetScroll: { maxHeight: 460 },
  sheetCenterState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  sheetCenterStateText: { fontSize: 13, color: COLORS.mutedText },

  historyRow: { flexDirection: 'row', gap: 14, paddingVertical: 16 },
  historyDateCol: { width: 76 },
  historyDateText: { fontSize: 12, fontWeight: '600', color: COLORS.mutedText, letterSpacing: 0.1 },
  historyContentCol: { flex: 1 },
  historyRowTitle: { fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, marginBottom: 3 },
  historyRowCategory: { fontSize: 12.5, color: COLORS.slateText, marginBottom: 10 },
});