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
import { COLORS, FONT_SIZES, RISK_COLORS, type RiskLevel } from '@/constants/theme';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

type IoniconName = keyof typeof Ionicons.glyphMap;
type MCIName = keyof typeof MaterialCommunityIcons.glyphMap;

type IncidentStatus = 'Active' | 'Responding' | 'Verified' | 'Resolved';

interface Incident {
  id: string;
  type: string;
  barangay: string;
  timeAgo: string;
  severity: RiskLevel;
  status: IncidentStatus;
  reportedBy: string;
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: IoniconName;
  color: string;
  bg: string;
  delta?: string;
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

interface QuickAction {
  id: string;
  label: string;
  icon: MCIName | IoniconName;
  useMCI?: boolean;
  bg: string;
  color: string;
}

// ────────────────────────────────────────────────────────────
// Mock Data
// ────────────────────────────────────────────────────────────

const STAT_CARDS: StatCard[] = [
  {
    id: '1',
    label: 'Active',
    value: 3,
    icon: 'flame',
    color: COLORS.criticalRed,
    bg: '#FEF2F2',
    delta: '+1 vs yesterday',
  },
  {
    id: '2',
    label: 'Verified',
    value: 7,
    icon: 'shield-checkmark',
    color: COLORS.accentViolet,
    bg: '#EEF2FF',
    delta: 'All confirmed',
  },
  {
    id: '3',
    label: 'Responding',
    value: 2,
    icon: 'car',
    color: COLORS.warningAmber,
    bg: '#FFFBEB',
    delta: '2 units deployed',
  },
  {
    id: '4',
    label: 'Resolved',
    value: 12,
    icon: 'checkmark-circle',
    color: COLORS.successGreen,
    bg: '#ECFDF5',
    delta: 'Today',
  },
];

const INCIDENTS: Incident[] = [
  {
    id: '1',
    type: 'Residential Fire',
    barangay: 'Lian Proper',
    timeAgo: '4 min ago',
    severity: 'High',
    status: 'Active',
    reportedBy: 'Juan D.',
  },
  {
    id: '2',
    type: 'Grass Fire',
    barangay: 'Bungahan',
    timeAgo: '18 min ago',
    severity: 'Moderate',
    status: 'Responding',
    reportedBy: 'Maria S.',
  },
  {
    id: '3',
    type: 'Electrical Fire',
    barangay: 'Panikian',
    timeAgo: '42 min ago',
    severity: 'High',
    status: 'Verified',
    reportedBy: 'Carlo R.',
  },
  {
    id: '4',
    type: 'LPG-Related',
    barangay: 'Maguibuay',
    timeAgo: '1 hr ago',
    severity: 'Low',
    status: 'Resolved',
    reportedBy: 'Ana M.',
  },
];

const ACTIVITY: ActivityItem[] = [
  {
    id: '1',
    responder: 'PO1 Reyes',
    initials: 'PR',
    action: 'Marked as resolved',
    target: 'INC-20240701-3821',
    timeAgo: '2 min ago',
    iconBg: '#ECFDF5',
    iconColor: COLORS.successGreen,
    icon: 'checkmark-circle',
  },
  {
    id: '2',
    responder: 'PO2 Santos',
    initials: 'PS',
    action: 'Dispatched to',
    target: 'Lian Proper',
    timeAgo: '11 min ago',
    iconBg: '#FFFBEB',
    iconColor: COLORS.warningAmber,
    icon: 'car',
  },
  {
    id: '3',
    responder: 'FO1 Cruz',
    initials: 'FC',
    action: 'Verified report',
    target: 'INC-20240701-3819',
    timeAgo: '28 min ago',
    iconBg: '#EEF2FF',
    iconColor: COLORS.accentViolet,
    icon: 'shield-checkmark',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: '1',
    label: 'View Incidents',
    icon: 'fire',
    useMCI: true,
    bg: '#FEF2F2',
    color: COLORS.criticalRed,
  },
  {
    id: '2',
    label: 'Risk Map',
    icon: 'map',
    useMCI: false,
    bg: '#EEF2FF',
    color: COLORS.accentViolet,
  },
  {
    id: '3',
    label: 'Notifications',
    icon: 'notifications',
    useMCI: false,
    bg: '#FFFBEB',
    color: COLORS.warningAmber,
  },
  {
    id: '4',
    label: 'Call Station',
    icon: 'call',
    useMCI: false,
    bg: '#ECFDF5',
    color: COLORS.successGreen,
  },
];

// ────────────────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────────────────

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

function StatCardItem({ stat }: { stat: StatCard }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: stat.bg }]}>
        <Ionicons name={stat.icon} size={18} color={stat.color} />
      </View>
      <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
      <Text style={styles.statLabel}>{stat.label}</Text>
      {stat.delta ? <Text style={styles.statDelta}>{stat.delta}</Text> : null}
    </View>
  );
}

function IncidentRow({ incident }: { incident: Incident }) {
  const riskPalette = RISK_COLORS[incident.severity];
  const statusPalette = STATUS_STYLE[incident.status];

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.incidentRow}>
      {/* Severity dot strip */}
      <View style={[styles.incidentStrip, { backgroundColor: riskPalette.dot }]} />

      <View style={styles.incidentBody}>
        {/* Top row: type + status badge */}
        <View style={styles.incidentTopRow}>
          <Text style={styles.incidentType}>{incident.type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusPalette.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusPalette.dot }]} />
            <Text style={[styles.statusText, { color: statusPalette.text }]}>
              {incident.status}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.incidentMetaRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.mutedText} />
          <Text style={styles.incidentMeta}>{incident.barangay}</Text>
          <Text style={styles.incidentMetaDot}>·</Text>
          <Text style={styles.incidentMeta}>{incident.timeAgo}</Text>
          <Text style={styles.incidentMetaDot}>·</Text>
          <Text style={styles.incidentMeta}>by {incident.reportedBy}</Text>
        </View>

        {/* Severity tag */}
        <View style={[styles.severityTag, { backgroundColor: riskPalette.bg }]}>
          <Text style={[styles.severityTagText, { color: riskPalette.text }]}>
            {incident.severity} Severity
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={COLORS.mutedText} />
    </TouchableOpacity>
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

// ────────────────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────────────────

export default function ResponderDashboardScreen() {
  const [activeIncidentCount] = useState(3);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.deepIndigo} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Header ── */}
        <View style={styles.heroHeader}>
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.brandLeft}>
              <View style={styles.brandIconWrap}>
                <Ionicons name="flame" size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.brandText}>
                FIRE<Text style={styles.brandAccent}>SIGHT</Text>
              </Text>
              <View style={styles.responderBadge}>
                <Text style={styles.responderBadgeText}>Responder</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bellButton} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color="rgba(255,255,255,0.85)" />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Greeting */}
          <Text style={styles.greeting}>{getTimeOfDay()},</Text>
          <Text style={styles.responderName}>PO1 dela Cruz</Text>
          <Text style={styles.todayDate}>{getTodayString()}</Text>

          {/* Today's summary strip */}
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{activeIncidentCount}</Text>
              <Text style={styles.summaryLabel}>Active Now</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>2</Text>
              <Text style={styles.summaryLabel}>On Route</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>12</Text>
              <Text style={styles.summaryLabel}>Resolved</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryOnlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.summaryValue}>On Duty</Text>
              </View>
              <Text style={styles.summaryLabel}>Your Status</Text>
            </View>
          </View>
        </View>

        {/* ── Content below hero ── */}
        <View style={styles.body}>

          {/* ── Stat Cards ── */}
          <SectionLabel eyebrow="Overview" title="Today's Incident Summary" />
          <View style={styles.statGrid}>
            {STAT_CARDS.map((stat) => (
              <StatCardItem key={stat.id} stat={stat} />
            ))}
          </View>

          {/* ── Quick Actions ── */}
          <SectionLabel eyebrow="Shortcuts" title="Quick Actions" />
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.id}
                activeOpacity={0.8}
                style={styles.quickActionButton}
              >
                <View style={[styles.quickActionIconWrap, { backgroundColor: action.bg }]}>
                  {action.useMCI ? (
                    <MaterialCommunityIcons
                      name={action.icon as MCIName}
                      size={20}
                      color={action.color}
                    />
                  ) : (
                    <Ionicons
                      name={action.icon as IoniconName}
                      size={20}
                      color={action.color}
                    />
                  )}
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Mini Map Preview ── */}
          <SectionLabel eyebrow="Coverage" title="Barangay Risk Map" />
          <TouchableOpacity activeOpacity={0.85} style={styles.mapCard}>
            {/* Simulated map background */}
            <View style={styles.mapBg}>
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((pos) => (
                <View
                  key={`h-${pos}`}
                  style={[styles.mapGridLineH, { top: `${pos * 100}%` as `${number}%` }]}
                />
              ))}
              {[0.25, 0.5, 0.75].map((pos) => (
                <View
                  key={`v-${pos}`}
                  style={[styles.mapGridLineV, { left: `${pos * 100}%` as `${number}%` }]}
                />
              ))}

              {/* Incident pins */}
              <View style={[styles.mapPin, styles.mapPinRed, { top: '30%', left: '25%' }]}>
                <Ionicons name="flame" size={10} color="#FFFFFF" />
              </View>
              <View style={[styles.mapPin, styles.mapPinAmber, { top: '55%', left: '60%' }]}>
                <Ionicons name="warning" size={10} color="#FFFFFF" />
              </View>
              <View style={[styles.mapPin, styles.mapPinGreen, { top: '70%', left: '40%' }]}>
                <Ionicons name="checkmark" size={10} color="#FFFFFF" />
              </View>

              {/* Station pin */}
              <View style={[styles.stationPin, { top: '45%', left: '48%' }]}>
                <MaterialCommunityIcons name="fire-station" size={14} color={COLORS.deepIndigo} />
              </View>

              {/* Open map CTA */}
              <View style={styles.mapOverlayCta}>
                <Ionicons name="expand-outline" size={14} color={COLORS.deepIndigo} />
                <Text style={styles.mapOverlayCtaText}>Open Full Map</Text>
              </View>
            </View>

            {/* Map legend */}
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
          </TouchableOpacity>

          {/* ── Recent Incidents ── */}
          <View style={styles.sectionHeaderRow}>
            <SectionLabel eyebrow="Live Feed" title="Recent Incidents" />
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {INCIDENTS.map((incident, index) => (
              <View key={incident.id}>
                <IncidentRow incident={incident} />
                {index < INCIDENTS.length - 1 && <RowDivider />}
              </View>
            ))}
          </View>

          {/* ── Recent Responder Activity ── */}
          <SectionLabel eyebrow="Team" title="Recent Responder Activity" />
          <View style={styles.card}>
            {ACTIVITY.map((item, index) => (
              <View key={item.id}>
                <ActivityRow item={item} />
                {index < ACTIVITY.length - 1 && <RowDivider />}
              </View>
            ))}
          </View>

          {/* ── Station Hotline ── */}
          <View style={styles.hotlineCard}>
            <View style={styles.hotlineLeft}>
              <View style={styles.hotlineIconWrap}>
                <MaterialCommunityIcons name="fire-truck" size={20} color={COLORS.primaryOrange} />
              </View>
              <View>
                <Text style={styles.hotlineName}>BFP Lian Fire Station</Text>
                <Text style={styles.hotlineNumber}>(043) 740 1234</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.85} style={styles.hotlineCallButton}>
              <Ionicons name="call" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

        </View>
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
    backgroundColor: COLORS.deepIndigo,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // ── Hero Header ──
  heroHeader: {
    backgroundColor: COLORS.deepIndigo,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandAccent: {
    color: COLORS.primaryOrange,
  },
  responderBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  responderBadgeText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.4,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    borderWidth: 1.5,
    borderColor: COLORS.deepIndigo,
  },
  greeting: {
    fontSize: FONT_SIZES.secondary,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 2,
  },
  responderName: {
    fontSize: FONT_SIZES.sectionHeading,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  todayDate: {
    fontSize: FONT_SIZES.caption,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    marginBottom: 20,
  },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  summaryValue: {
    fontSize: FONT_SIZES.body,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.tiny,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  summaryOnlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.successGreen,
  },

  // ── Body ──
  body: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    marginTop: -16,
  },

  // Section labels
  sectionLabelWrap: { marginBottom: 14 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.cardTitle,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  seeAllText: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.accentViolet,
    marginBottom: 2,
  },

  // Generic card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    overflow: 'hidden',
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  // ── Stat grid ──
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: FONT_SIZES.heroTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  statDelta: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.mutedText,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Quick Actions ──
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    textAlign: 'center',
  },

  // ── Mini Map ──
  mapCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  mapBg: {
    height: 160,
    backgroundColor: '#EEF2FF',
    position: 'relative',
    overflow: 'hidden',
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(109,91,208,0.1)',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(109,91,208,0.1)',
  },
  mapPin: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mapPinRed: { backgroundColor: COLORS.criticalRed },
  mapPinAmber: { backgroundColor: COLORS.warningAmber },
  mapPinGreen: { backgroundColor: COLORS.successGreen },
  stationPin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.deepIndigo,
  },
  mapOverlayCta: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapOverlayCtaText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
    color: COLORS.deepIndigo,
  },
  mapLegend: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapLegendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  mapLegendText: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.slateText,
    fontWeight: '600',
  },

  // ── Incidents ──
  incidentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  incidentStrip: {
    width: 3,
    height: '80%',
    borderRadius: 2,
    alignSelf: 'center',
  },
  incidentBody: { flex: 1, gap: 5 },
  incidentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incidentType: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
  },
  incidentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  incidentMeta: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  incidentMetaDot: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.mutedText,
  },
  severityTag: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  severityTagText: {
    fontSize: FONT_SIZES.tiny,
    fontWeight: '700',
  },

  // ── Activity ──
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 12,
  },
  activityAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInitials: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '800',
  },
  activityBody: { flex: 1 },
  activityResponder: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  activityTarget: {
    fontWeight: '700',
    color: COLORS.accentViolet,
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTime: {
    fontSize: FONT_SIZES.tiny,
    color: COLORS.mutedText,
    fontWeight: '500',
  },

  // ── Hotline ──
  hotlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  hotlineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hotlineIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.contactIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotlineName: {
    fontSize: FONT_SIZES.secondary,
    fontWeight: '700',
    color: COLORS.deepIndigo,
    marginBottom: 2,
  },
  hotlineNumber: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.slateText,
  },
  hotlineCallButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.primaryOrange,
    alignItems: 'center',
    justifyContent: 'center',
  },
});