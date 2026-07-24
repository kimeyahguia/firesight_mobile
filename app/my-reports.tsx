import { API_ENDPOINTS } from '@/constants/api';
import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
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

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface MyReportItem {
  id: string;
  reference_id: string;
  title: string;
  description: string;
  what_is_on_fire: string;
  barangay: string;
  street_landmark: string;
  location_details: string;
  severity: string;
  incident_type: string;
  people_at_risk: string;
  fire_active: string;
  responders_on_site: string;
  status: string;
  created_at: string;
  photo_url?: string;
  photo?: string;
  photo_path?: string;
  latitude?: string;
  longitude?: string;
  verified_at?: string;
  responding_at?: string;
  resolved_at?: string;
  responder_name?: string;
  remarks?: string;
}

type StatusFilter = 'All' | 'Pending' | 'Verified' | 'Responding' | 'Resolved' | 'False Alarm';
type DateFilter = 'All' | 'Today' | 'This Week' | 'This Month';
type SortBy = 'newest' | 'oldest';

const TIMELINE_STAGES = ['Submitted', 'Verified', 'Responding', 'Resolved'] as const;

function getStageIndex(status: string): number {
  const key = (status || '').trim().toLowerCase();
  if (key === 'resolved' || key === 'closed') return 3;
  if (key === 'responding' || key === 'dispatched' || key === 'en route') return 2;
  if (key === 'verified') return 1;
  if (key === 'submitted' || key === 'pending' || key === 'active') return 0;
  return -1;
}

function isFalseAlarm(status: string): boolean {
  const key = (status || '').trim().toLowerCase();
  return key === 'false alarm' || key === 'rejected' || key === 'invalid';
}

function getEvidenceUrl(item: MyReportItem): string | null {
  const raw = item.photo_url || item.photo || item.photo_path;
  if (!raw) return null;
  return raw;
}

function statusStyleFor(status: string): { bg: string; text: string; dot: string } {
  const key = (status || '').trim().toLowerCase();
  if (key === 'resolved' || key === 'closed') {
    return { bg: '#ECFDF5', text: COLORS.successGreen, dot: COLORS.successGreen };
  }
  if (key === 'responding' || key === 'dispatched' || key === 'en route') {
    return { bg: '#FFFBEB', text: '#B45309', dot: COLORS.warningAmber };
  }
  if (key === 'verified') {
    return { bg: '#EEF2FF', text: COLORS.accentViolet, dot: COLORS.accentViolet };
  }
  if (key === 'submitted' || key === 'pending' || key === 'active') {
    return { bg: '#FEF2F2', text: COLORS.criticalRed, dot: COLORS.criticalRed };
  }
  return { bg: COLORS.surfaceMuted, text: COLORS.slateText, dot: COLORS.mutedText };
}

function usePressScale(toValue = 0.98) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

function formatDateTime(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw.replace(' ', 'T'));
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function ReportStatsBar({ reports }: { reports: MyReportItem[] }) {
  const stats = useMemo(() => {
    let pending = 0, verified = 0, responding = 0, resolved = 0, falseAlarm = 0;
    reports.forEach((r) => {
      if (isFalseAlarm(r.status)) { falseAlarm++; return; }
      const stage = getStageIndex(r.status);
      if (stage === 0) pending++;
      else if (stage === 1) verified++;
      else if (stage === 2) responding++;
      else if (stage === 3) resolved++;
    });
    return { total: reports.length, pending, verified, responding, resolved, falseAlarm };
  }, [reports]);

  const items: { label: string; value: number; color: string }[] = [
    { label: 'Total', value: stats.total, color: COLORS.deepIndigo },
    { label: 'Pending', value: stats.pending, color: COLORS.criticalRed },
    { label: 'Verified', value: stats.verified, color: COLORS.accentViolet },
    { label: 'Responding', value: stats.responding, color: COLORS.warningAmber },
    { label: 'Resolved', value: stats.resolved, color: COLORS.successGreen },
    { label: 'False Alarm', value: stats.falseAlarm, color: COLORS.mutedText },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
      {items.map((it) => (
        <View key={it.label} style={styles.statCard}>
          <Text style={[styles.statCardValue, { color: it.color }]}>{it.value}</Text>
          <Text style={styles.statCardLabel}>{it.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function ReportFilterBar({
  search, onSearch,
  statusFilter, onStatusFilter,
  dateFilter, onDateFilter,
  sortBy, onSortBy,
}: {
  search: string; onSearch: (v: string) => void;
  statusFilter: StatusFilter; onStatusFilter: (v: StatusFilter) => void;
  dateFilter: DateFilter; onDateFilter: (v: DateFilter) => void;
  sortBy: SortBy; onSortBy: (v: SortBy) => void;
}) {
  const statusOptions: StatusFilter[] = ['All', 'Pending', 'Verified', 'Responding', 'Resolved', 'False Alarm'];
  const dateOptions: DateFilter[] = ['All', 'Today', 'This Week', 'This Month'];

  return (
    <View style={styles.filterBarWrap}>
      <View style={styles.searchInputWrap}>
        <Ionicons name="search" size={16} color={COLORS.mutedText} />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search reference, barangay, incident type…"
          placeholderTextColor={COLORS.mutedText}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={COLORS.mutedText} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContent}>
        {statusOptions.map((opt) => (
          <TouchableOpacity
            key={opt}
            activeOpacity={0.85}
            onPress={() => onStatusFilter(opt)}
            style={[styles.filterPill, statusFilter === opt && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, statusFilter === opt && styles.filterPillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.filterSecondaryRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContent}>
          {dateOptions.map((opt) => (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.85}
              onPress={() => onDateFilter(opt)}
              style={[styles.filterPillSmall, dateFilter === opt && styles.filterPillActive]}
            >
              <Text style={[styles.filterPillTextSmall, dateFilter === opt && styles.filterPillTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSortBy(sortBy === 'newest' ? 'oldest' : 'newest')}
          style={styles.sortButton}
        >
          <Ionicons name={sortBy === 'newest' ? 'arrow-down' : 'arrow-up'} size={13} color={COLORS.deepIndigo} />
          <Text style={styles.sortButtonText}>{sortBy === 'newest' ? 'Newest' : 'Oldest'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IncidentTimeline({ status }: { status: string }) {
  if (isFalseAlarm(status)) {
    return (
      <View style={styles.falseAlarmBadgeRow}>
        <Ionicons name="close-circle-outline" size={14} color={COLORS.mutedText} />
        <Text style={styles.falseAlarmBadgeText}>Marked as False Alarm</Text>
      </View>
    );
  }
  const currentStage = getStageIndex(status);
  return (
    <View style={styles.timelineRow}>
      {TIMELINE_STAGES.map((stage, index) => {
        const reached = index <= currentStage;
        const isLast = index === TIMELINE_STAGES.length - 1;
        return (
          <View key={stage} style={styles.timelineStepWrap}>
            <View style={styles.timelineStepCol}>
              <View style={[styles.timelineDot, reached && styles.timelineDotActive]}>
                {reached && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              {!isLast && <View style={[styles.timelineLine, index < currentStage && styles.timelineLineActive]} />}
            </View>
            <Text style={[styles.timelineLabel, reached && styles.timelineLabelActive]} numberOfLines={1}>
              {stage}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ExpandableReportCard({
  item,
  expanded,
  onToggle,
}: {
  item: MyReportItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusPalette = statusStyleFor(item.status);
  const evidenceUrl = getEvidenceUrl(item);
  const { scale, onPressIn, onPressOut } = usePressScale(0.98);

  return (
    <Animated.View style={[styles.incidentCard, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onToggle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
      >
        <View style={styles.incidentCardTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.incidentCardRef}>{item.reference_id}</Text>
            <Text style={styles.incidentCardTitle} numberOfLines={1}>
              {item.incident_type || item.title || 'Fire Incident'}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.mutedText} />
        </View>

        <View style={styles.incidentPillRow}>
          <View style={[styles.pill, { backgroundColor: statusPalette.bg }]}>
            <View style={[styles.pillDot, { backgroundColor: statusPalette.dot }]} />
            <Text style={[styles.pillText, { color: statusPalette.text }]}>{item.status}</Text>
          </View>
          <View style={[styles.pill, styles.pillMuted]}>
            <Ionicons name="location-outline" size={11} color={COLORS.slateText} />
            <Text style={styles.pillTextMuted} numberOfLines={1}>{item.barangay}</Text>
          </View>
          <View style={[styles.pill, styles.pillMuted]}>
            <Ionicons name="warning-outline" size={11} color={COLORS.slateText} />
            <Text style={styles.pillTextMuted}>{item.severity}</Text>
          </View>
        </View>

        <Text style={styles.incidentCardDate}>{formatDateTime(item.created_at)}</Text>

        <IncidentTimeline status={item.status} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.incidentExpandedSection}>
          <View style={styles.incidentDivider} />

          {!!evidenceUrl && (
            <Image source={{ uri: evidenceUrl }} style={styles.incidentEvidenceImage} />
          )}

          {!!item.description && (
            <View style={styles.expandedBlock}>
              <Text style={styles.expandedBlockLabel}>Description</Text>
              <Text style={styles.expandedBlockText}>{item.description}</Text>
            </View>
          )}

          <View style={styles.expandedBlock}>
            <Text style={styles.expandedBlockLabel}>Exact Location</Text>
            <Text style={styles.expandedBlockText}>
              {[item.street_landmark, item.barangay, item.location_details].filter(Boolean).join(', ')}
            </Text>
          </View>

          {!!item.responder_name && (
            <View style={styles.expandedBlock}>
              <Text style={styles.expandedBlockLabel}>Responder</Text>
              <Text style={styles.expandedBlockText}>{item.responder_name}</Text>
            </View>
          )}

          {!!item.remarks && (
            <View style={styles.expandedBlock}>
              <Text style={styles.expandedBlockLabel}>BFP Remarks</Text>
              <Text style={styles.expandedBlockText}>{item.remarks}</Text>
            </View>
          )}

          <View style={styles.expandedBlock}>
            <Text style={styles.expandedBlockLabel}>Report History</Text>
            <View style={styles.historyMiniRow}>
              <Text style={styles.historyMiniText}>Submitted · {formatDateTime(item.created_at)}</Text>
            </View>
            {!!item.verified_at && (
              <View style={styles.historyMiniRow}>
                <Text style={styles.historyMiniText}>Verified · {formatDateTime(item.verified_at)}</Text>
              </View>
            )}
            {!!item.responding_at && (
              <View style={styles.historyMiniRow}>
                <Text style={styles.historyMiniText}>Responding · {formatDateTime(item.responding_at)}</Text>
              </View>
            )}
            {!!item.resolved_at && (
              <View style={styles.historyMiniRow}>
                <Text style={styles.historyMiniText}>Resolved · {formatDateTime(item.resolved_at)}</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function ReportCardSkeleton() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);
  return (
    <Animated.View style={[styles.skeletonCard, { opacity: pulse }]}>
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLineLong} />
      <View style={styles.skeletonPillRow}>
        <View style={styles.skeletonPill} />
        <View style={styles.skeletonPill} />
      </View>
    </Animated.View>
  );
}

function EmptyReportsState() {
  return (
    <View style={styles.emptyStateCard}>
      <View style={styles.emptyStateIconCircle}>
        <Ionicons name="document-text-outline" size={30} color={COLORS.primaryOrange} />
      </View>
      <Text style={styles.myReportsEmptyTitle}>Wala ka pang naisumite na report</Text>
      <Text style={styles.myReportsEmptySub}>
        Kapag nag-report ka ng fire incident, makikita mo dito ang listahan at status nito.
      </Text>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.myReportsEmptyCta}
        onPress={() => router.push('/(tabs)/report' as any)}
      >
        <Ionicons name="flame" size={15} color="#FFFFFF" />
        <Text style={styles.myReportsEmptyCtaText}>Report a Fire</Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorRetryCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorRetryCard}>
      <Ionicons name="cloud-offline-outline" size={26} color={COLORS.criticalRed} />
      <Text style={styles.myReportsErrorText}>{message}</Text>
      <TouchableOpacity activeOpacity={0.85} onPress={onRetry} style={styles.myReportsRetryChip}>
        <Ionicons name="refresh" size={13} color={COLORS.deepIndigo} />
        <Text style={styles.myReportsRetryChipText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function MyReportsScreen() {
  const [myReports, setMyReports] = useState<MyReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    let list = [...myReports];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((r) =>
        [r.reference_id, r.barangay, r.incident_type, r.title].some((f) => (f || '').toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'All') {
      list = list.filter((r) => {
        if (statusFilter === 'False Alarm') return isFalseAlarm(r.status);
        const stage = getStageIndex(r.status);
        if (statusFilter === 'Pending') return stage === 0;
        if (statusFilter === 'Verified') return stage === 1;
        if (statusFilter === 'Responding') return stage === 2;
        if (statusFilter === 'Resolved') return stage === 3;
        return true;
      });
    }

    if (dateFilter !== 'All') {
      const now = Date.now();
      list = list.filter((r) => {
        const d = new Date(r.created_at.replace(' ', 'T')).getTime();
        if (isNaN(d)) return false;
        const diffDays = (now - d) / 86400000;
        if (dateFilter === 'Today') return diffDays <= 1;
        if (dateFilter === 'This Week') return diffDays <= 7;
        if (dateFilter === 'This Month') return diffDays <= 30;
        return true;
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.created_at.replace(' ', 'T')).getTime();
      const db = new Date(b.created_at.replace(' ', 'T')).getTime();
      return sortBy === 'newest' ? db - da : da - db;
    });

    return list;
  }, [myReports, searchQuery, statusFilter, dateFilter, sortBy]);

    const fetchMyReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
        // 1. Kunin ang user_id mula sa AsyncStorage
        const userId = await AsyncStorage.getItem('user_id');
        console.log('[MyReports] Stored userId:', userId);

        if (!userId || userId === 'null' || userId === 'undefined') {
        setError('You need to be logged in to view your reports. (No User ID)');
        return;
        }

        // 2. Buuin ang endpoint URL
        const targetUrl = `${API_ENDPOINTS.incidentsRead}?user_id=${encodeURIComponent(userId)}`;
        console.log('[MyReports] Fetching URL:', targetUrl);

        const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        });

        const responseText = await response.text();
        console.log('[MyReports] Raw Server Response:', responseText);

        let result: any;
        try {
        result = JSON.parse(responseText);
        } catch (parseError) {
        console.log('[MyReports] Failed to parse JSON:', parseError);
        setError('Server returned non-JSON data.');
        return;
        }

        if (result.success && Array.isArray(result.data)) {
        setMyReports(result.data);
        setLoadedOnce(true);
        } else {
        // Dito lalabas kung ano man ang dahilan ng PHP (e.g. "User ID is required", "Database connection failed", etc.)
        setError(result.message || 'Could not load your reports.');
        }
    } catch (err: any) {
        console.log('[MyReports] Network Error:', err);
        setError('Network error while loading your reports.');
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
    }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.headerRow}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={COLORS.deepIndigo} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchMyReports(true)}
            tintColor={COLORS.primaryOrange}
          />
        }
      >
        {loading && !loadedOnce ? (
          <>
            <ReportCardSkeleton />
            <ReportCardSkeleton />
            <ReportCardSkeleton />
          </>
        ) : error ? (
          <ErrorRetryCard message={error} onRetry={() => fetchMyReports()} />
        ) : myReports.length === 0 ? (
          <EmptyReportsState />
        ) : (
          <>
            <ReportStatsBar reports={myReports} />
            <ReportFilterBar
              search={searchQuery}
              onSearch={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
              dateFilter={dateFilter}
              onDateFilter={setDateFilter}
              sortBy={sortBy}
              onSortBy={setSortBy}
            />

            {filteredReports.length === 0 ? (
              <Text style={styles.emptyText}>No reports match your filters.</Text>
            ) : (
              filteredReports.map((item) => (
                <ExpandableReportCard
                  key={item.id}
                  item={item}
                  expanded={expandedReportId === item.id}
                  onToggle={() => setExpandedReportId((prev) => (prev === item.id ? null : item.id))}
                />
              ))
            )}
          </>
        )}
        <View style={{ height: 24 }} />
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },

  emptyText: { fontSize: 13, color: COLORS.mutedText, textAlign: 'center', paddingVertical: 22, lineHeight: 18 },

  statsScrollContent: { gap: 10, paddingVertical: 4, marginBottom: 16 },
  statCard: {
    minWidth: 92, backgroundColor: COLORS.card, borderRadius: 18, padding: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 1,
  },
  statCardValue: { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statCardLabel: { fontSize: 11, fontWeight: '600', color: COLORS.mutedText },

  filterBarWrap: { marginBottom: 16, gap: 10 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceMuted, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.deepIndigo },
  filterChipsContent: { gap: 8, paddingRight: 8 },
  filterSecondaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  filterPillSmall: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  filterPillActive: { backgroundColor: COLORS.deepIndigo, borderColor: COLORS.deepIndigo },
  filterPillText: { fontSize: 12, fontWeight: '700', color: COLORS.slateText },
  filterPillTextSmall: { fontSize: 11, fontWeight: '700', color: COLORS.slateText },
  filterPillTextActive: { color: '#FFFFFF' },
  sortButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  sortButtonText: { fontSize: 11, fontWeight: '700', color: COLORS.deepIndigo },

  incidentCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 18, marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  incidentCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  incidentCardRef: { fontSize: 11.5, fontWeight: '700', color: COLORS.accentViolet, marginBottom: 3 },
  incidentCardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.deepIndigo },
  incidentPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  pillMuted: { backgroundColor: COLORS.surfaceMuted },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },
  pillTextMuted: { fontSize: 11, fontWeight: '600', color: COLORS.slateText },
  incidentCardDate: { fontSize: 11.5, color: COLORS.mutedText, marginBottom: 14 },

  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  timelineStepWrap: { flex: 1, alignItems: 'center' },
  timelineStepCol: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  timelineDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  timelineDotActive: { backgroundColor: COLORS.successGreen, borderColor: COLORS.successGreen },
  timelineLine: { flex: 1, height: 2, backgroundColor: COLORS.border },
  timelineLineActive: { backgroundColor: COLORS.successGreen },
  timelineLabel: { fontSize: 9.5, fontWeight: '600', color: COLORS.mutedText, marginTop: 4 },
  timelineLabelActive: { color: COLORS.deepIndigo, fontWeight: '700' },
  falseAlarmBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  falseAlarmBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.mutedText },

  incidentExpandedSection: { marginTop: 6 },
  incidentDivider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.border, marginVertical: 14 },
  incidentEvidenceImage: { width: '100%', height: 180, borderRadius: 16, marginBottom: 14, backgroundColor: COLORS.surfaceMuted },
  expandedBlock: { marginBottom: 14 },
  expandedBlockLabel: {
    fontSize: 10.5, fontWeight: '700', color: COLORS.mutedText,
    textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4,
  },
  expandedBlockText: { fontSize: 13, color: COLORS.deepIndigo, lineHeight: 18 },
  historyMiniRow: { paddingVertical: 4 },
  historyMiniText: { fontSize: 12, color: COLORS.slateText },

  skeletonCard: {
    backgroundColor: COLORS.surfaceMuted, borderRadius: 24, padding: 18, marginBottom: 14, gap: 10,
  },
  skeletonLineShort: { width: '30%', height: 10, borderRadius: 6, backgroundColor: COLORS.border },
  skeletonLineLong: { width: '65%', height: 16, borderRadius: 6, backgroundColor: COLORS.border },
  skeletonPillRow: { flexDirection: 'row', gap: 8 },
  skeletonPill: { width: 70, height: 22, borderRadius: 999, backgroundColor: COLORS.border },

  emptyStateCard: {
    alignItems: 'center', gap: 8, backgroundColor: COLORS.card, borderRadius: 24,
    paddingVertical: 40, paddingHorizontal: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
  },
  emptyStateIconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1E6',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  myReportsEmptyTitle: {
    fontSize: 14.5, fontWeight: '700', color: COLORS.deepIndigo, textAlign: 'center', marginTop: 6,
  },
  myReportsEmptySub: {
    fontSize: 12.5, color: COLORS.slateText, textAlign: 'center', lineHeight: 17,
  },
  myReportsEmptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primaryOrange, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 11, marginTop: 10,
  },
  myReportsEmptyCtaText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  myReportsErrorText: { fontSize: 12.5, color: COLORS.criticalRed, textAlign: 'center' },
  myReportsRetryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 4,
  },
  myReportsRetryChipText: { fontSize: 11.5, fontWeight: '700', color: COLORS.deepIndigo },
  errorRetryCard: {
    alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 22,
    borderWidth: 1, borderColor: '#FECACA', paddingVertical: 28, paddingHorizontal: 20,
  },
});