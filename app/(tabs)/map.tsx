import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  COLORS,
  RISK_COLORS,
  ALERT_COLORS,
  RiskLevel,
  AlertType,
} from '@/constants/theme';

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
  x: number;
  y: number;
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: AlertType;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const BARANGAYS: BarangayData[] = [
  {
    id: '1',
    name: 'Lian Proper',
    risk: 'High',
    incidents: 3,
    note: 'Dry weather and clustered residential zones contribute to elevated fire risk.',
    lastUpdate: '12 minutes ago',
    x: 0.5,
    y: 0.42,
  },
  {
    id: '2',
    name: 'Bungahan',
    risk: 'Moderate',
    incidents: 1,
    note: 'Periodic agricultural burning reported nearby. Monitor closely during dry season.',
    lastUpdate: '1 hour ago',
    x: 0.28,
    y: 0.6,
  },
  {
    id: '3',
    name: 'Lumaniag',
    risk: 'Low',
    incidents: 0,
    note: 'No active incidents reported. Conditions remain stable.',
    lastUpdate: '3 hours ago',
    x: 0.68,
    y: 0.25,
  },
  {
    id: '4',
    name: 'Balaytigui',
    risk: 'Moderate',
    incidents: 2,
    note: 'Aging electrical lines in older housing blocks increase moderate risk.',
    lastUpdate: '45 minutes ago',
    x: 0.35,
    y: 0.78,
  },
  {
    id: '5',
    name: 'Caybunga',
    risk: 'Low',
    incidents: 0,
    note: 'Well-spaced housing and recent safety drills keep risk low.',
    lastUpdate: '5 hours ago',
    x: 0.78,
    y: 0.68,
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

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function LegendChip({ risk }: { risk: RiskLevel }) {
  const palette = RISK_COLORS[risk];
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: palette.dot }]} />
      <Text style={styles.legendChipText}>{risk}</Text>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: FilterOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MapMarker({
  item,
  selected,
  onPress,
}: {
  item: BarangayData;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = RISK_COLORS[item.risk];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.mapMarkerWrap,
        {
          left: `${item.x * 100}%`,
          top: `${item.y * 100}%`,
        },
      ]}
    >
      <View
        style={[
          styles.mapMarkerPulse,
          { backgroundColor: palette.dot, opacity: selected ? 0.25 : 0.15 },
        ]}
      />
      <View
        style={[
          styles.mapMarkerDot,
          { backgroundColor: palette.dot, borderColor: COLORS.card },
          selected && styles.mapMarkerDotSelected,
        ]}
      />
    </TouchableOpacity>
  );
}

function BarangayCard({
  item,
  selected,
  onPress,
}: {
  item: BarangayData;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = RISK_COLORS[item.risk];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.barangayListCard, selected && styles.barangayListCardSelected]}
    >
      <View style={[styles.barangaySideBar, { backgroundColor: palette.dot }]} />
      <View style={styles.barangayListContent}>
        <View style={styles.barangayListTopRow}>
          <Text style={styles.barangayListName}>{item.name}</Text>
          <View style={[styles.riskBadgeSmall, { backgroundColor: palette.bg }]}>
            <Text style={[styles.riskBadgeSmallText, { color: palette.text }]}>
              {item.risk}
            </Text>
          </View>
        </View>
        <Text style={styles.barangayListNote} numberOfLines={2}>
          {item.note}
        </Text>
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
          <Text style={[styles.activityBadgeText, { color: palette.text }]}>
            {item.type}
          </Text>
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

  const selected = BARANGAYS.find((b) => b.id === selectedId) ?? BARANGAYS[0];

  const filteredBarangays = BARANGAYS.filter((b) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Low Risk') return b.risk === 'Low';
    if (activeFilter === 'Moderate Risk') return b.risk === 'Moderate';
    if (activeFilter === 'High Risk') return b.risk === 'High';
    if (activeFilter === 'Recent Incidents') return b.incidents > 0;
    return true;
  });

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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Risk Map</Text>
            <Text style={styles.headerSubtitle}>
              Monitor fire-prone areas across Lian, Batangas
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.7} style={styles.headerIconButton}>
            <Ionicons name="layers-outline" size={20} color={COLORS.deepIndigo} />
          </TouchableOpacity>
        </View>

        {/* Fire Risk Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Area Fire Risk Overview</Text>
          <Text style={styles.summaryText}>
            {highRiskCount + moderateRiskCount} barangays are currently under moderate to high
            fire risk.
          </Text>

          <View style={styles.legendRow}>
            <LegendChip risk="Low" />
            <LegendChip risk="Moderate" />
            <LegendChip risk="High" />
          </View>

          <View style={styles.summaryMetricsRow}>
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricValue}>{BARANGAYS.length}</Text>
              <Text style={styles.summaryMetricLabel}>Monitored</Text>
            </View>
            <View style={styles.summaryMetricDivider} />
            <View style={styles.summaryMetric}>
              <Text style={styles.summaryMetricValue}>
                {BARANGAYS.reduce((sum, b) => sum + b.incidents, 0)}
              </Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              active={activeFilter === filter}
              onPress={() => setActiveFilter(filter)}
            />
          ))}
        </ScrollView>

        {/* Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapSurface}>
            <View style={[styles.mapZoneOverlay, styles.mapZoneOverlayOne]} />
            <View style={[styles.mapZoneOverlay, styles.mapZoneOverlayTwo]} />
            <View style={[styles.mapZoneOverlay, styles.mapZoneOverlayThree]} />

            {BARANGAYS.map((item) => (
              <MapMarker
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onPress={() => setSelectedId(item.id)}
              />
            ))}

            <View style={styles.mapLegendOverlay}>
              <View style={styles.mapLegendRow}>
                <View style={[styles.mapLegendDot, { backgroundColor: RISK_COLORS.Low.dot }]} />
                <Text style={styles.mapLegendText}>Low</Text>
              </View>
              <View style={styles.mapLegendRow}>
                <View
                  style={[styles.mapLegendDot, { backgroundColor: RISK_COLORS.Moderate.dot }]}
                />
                <Text style={styles.mapLegendText}>Moderate</Text>
              </View>
              <View style={styles.mapLegendRow}>
                <View style={[styles.mapLegendDot, { backgroundColor: RISK_COLORS.High.dot }]} />
                <Text style={styles.mapLegendText}>High</Text>
              </View>
            </View>

            <TouchableOpacity activeOpacity={0.85} style={styles.locateButton}>
              <Ionicons name="locate" size={18} color={COLORS.deepIndigo} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Barangay Detail Panel */}
        <View style={styles.detailCard}>
          <View style={styles.detailTopRow}>
            <View style={styles.detailTitleGroup}>
              <Ionicons name="location" size={16} color={COLORS.primaryOrange} />
              <Text style={styles.detailName}>{selected.name}</Text>
            </View>
            <View
              style={[
                styles.riskBadgeSmall,
                { backgroundColor: RISK_COLORS[selected.risk].bg },
              ]}
            >
              <Text
                style={[
                  styles.riskBadgeSmallText,
                  { color: RISK_COLORS[selected.risk].text },
                ]}
              >
                {selected.risk} Risk
              </Text>
            </View>
          </View>

          <Text style={styles.detailNote}>{selected.note}</Text>

          <View style={styles.detailMetaRow}>
            <View style={styles.detailMetaItem}>
              <MaterialCommunityIcons
                name="fire-alert"
                size={14}
                color={COLORS.slateText}
              />
              <Text style={styles.detailMetaText}>
                {selected.incidents} {selected.incidents === 1 ? 'incident' : 'incidents'}
              </Text>
            </View>
            <View style={styles.detailMetaItem}>
              <Ionicons name="time-outline" size={14} color={COLORS.slateText} />
              <Text style={styles.detailMetaText}>Updated {selected.lastUpdate}</Text>
            </View>
          </View>

          <View style={styles.detailActionsRow}>
            <TouchableOpacity activeOpacity={0.85} style={styles.detailSecondaryButton}>
              <Ionicons name="time-outline" size={15} color={COLORS.deepIndigo} />
              <Text style={styles.detailSecondaryButtonText}>Incident History</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} style={styles.detailPrimaryButton}>
              <Ionicons name="flame" size={15} color="#FFFFFF" />
              <Text style={styles.detailPrimaryButtonText}>Report Fire Here</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barangay Risk Snapshot */}
        <SectionHeader title="Barangay Risk Snapshot" />
        <View style={styles.barangayListWrap}>
          {filteredBarangays.map((item) => (
            <BarangayCard
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onPress={() => setSelectedId(item.id)}
            />
          ))}
        </View>

        {/* Recent Incident Activity */}
        <SectionHeader title="Recent Incident Activity" />
        <View style={styles.activityCard}>
          {ACTIVITY.map((item, index) => (
            <View key={item.id}>
              <ActivityRow item={item} />
              {index < ACTIVITY.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* CTA Section */}
        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Ionicons name="alert-circle" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.ctaTextGroup}>
            <Text style={styles.ctaTitle}>Notice a fire nearby?</Text>
            <Text style={styles.ctaSubtitle}>
              Report it immediately so responders can act fast.
            </Text>
          </View>
          <TouchableOpacity activeOpacity={0.85} style={styles.ctaButton}>
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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.slateText,
    marginTop: 4,
    maxWidth: 240,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.slateText,
    lineHeight: 18,
    marginBottom: 14,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
  },
  summaryMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  summaryMetricLabel: {
    fontSize: 10.5,
    color: COLORS.slateText,
    textAlign: 'center',
  },
  summaryMetricDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.deepIndigo,
    borderColor: COLORS.deepIndigo,
  },
  filterChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.slateText,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mapCard: {
    borderRadius: 22,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  mapSurface: {
    height: 260,
    backgroundColor: COLORS.surfaceMuted,
    position: 'relative',
    overflow: 'hidden',
  },
  mapZoneOverlay: {
    position: 'absolute',
    borderRadius: 999,
  },
  mapZoneOverlayOne: {
    width: 180,
    height: 180,
    backgroundColor: 'rgba(220,38,38,0.10)',
    top: -30,
    left: 80,
  },
  mapZoneOverlayTwo: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(245,158,11,0.10)',
    bottom: -20,
    left: -20,
  },
  mapZoneOverlayThree: {
    width: 140,
    height: 140,
    backgroundColor: 'rgba(22,163,74,0.10)',
    bottom: 10,
    right: -30,
  },
  mapMarkerWrap: {
    position: 'absolute',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -14,
  },
  mapMarkerPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  mapMarkerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  mapMarkerDotSelected: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
  },
  mapLegendOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
  },
  mapLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapLegendText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.deepIndigo,
  },
  locateButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailCard: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    shadowColor: COLORS.deepIndigo,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  detailTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailNote: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginBottom: 14,
  },
  detailMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailMetaText: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  detailActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    paddingVertical: 12,
  },
  detailSecondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  detailPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 14,
    paddingVertical: 12,
  },
  detailPrimaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  riskBadgeSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  riskBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  barangayListWrap: {
    gap: 12,
    marginBottom: 24,
  },
  barangayListCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  barangayListCardSelected: {
    borderColor: COLORS.primaryOrange,
  },
  barangaySideBar: {
    width: 5,
  },
  barangayListContent: {
    flex: 1,
    padding: 14,
  },
  barangayListTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  barangayListName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  barangayListNote: {
    fontSize: 12,
    color: COLORS.slateText,
    lineHeight: 16,
    marginBottom: 6,
  },
  barangayListMeta: {
    fontSize: 11,
    color: COLORS.mutedText,
  },
  activityCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  activityRow: {
    paddingVertical: 14,
  },
  activityRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    flex: 1,
  },
  activityBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activityBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  activityDescription: {
    fontSize: 12.5,
    color: COLORS.slateText,
    lineHeight: 17,
    marginBottom: 6,
  },
  activityTimestamp: {
    fontSize: 11,
    color: COLORS.mutedText,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ctaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextGroup: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  ctaSubtitle: {
    fontSize: 11.5,
    color: COLORS.slateText,
    lineHeight: 15,
  },
  ctaButton: {
    backgroundColor: COLORS.deepIndigo,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});